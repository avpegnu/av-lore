// Small integer-unit, single-currency offline fixtures; no bank/network operations.
export type WalletCommand = { id: string; to: 'B' | 'C'; amount: number };
export type WalletEvent = {
  seq: number;
  command: WalletCommand;
  result: 'COMPLETED' | 'INSUFFICIENT_FUNDS';
};
export type WalletState = {
  seq: number;
  balances: { A: number; B: number; C: number };
  receipts: Record<string, { fingerprint: string; result: string }>;
  events: WalletEvent[];
};
export const walletCommandFixture: WalletCommand[] = [
  { id: 'c1', to: 'B', amount: 30 },
  { id: 'c2', to: 'C', amount: 20 },
  { id: 'c3', to: 'B', amount: 80 },
];
export function emptyWallet(): WalletState {
  return { seq: 0, balances: { A: 100, B: 0, C: 0 }, receipts: {}, events: [] };
}
const fingerprint = (c: WalletCommand) => `A/${c.to}/${c.amount}/USD`;
export function foldWallet(input: WalletState, event: WalletEvent): WalletState {
  if (event.seq !== input.seq + 1) throw new Error('NONCONTIGUOUS_EVENT');
  const s = structuredClone(input),
    c = event.command;
  if (!Number.isSafeInteger(c.amount) || c.amount <= 0)
    throw new RangeError('Invalid minor-unit amount');
  if (event.result === 'COMPLETED') {
    if (s.balances.A < c.amount) throw new Error('INVALID_ACCEPTED_EVENT');
    s.balances.A -= c.amount;
    s.balances[c.to] += c.amount;
  }
  s.receipts[c.id] = { fingerprint: fingerprint(c), result: event.result };
  s.seq = event.seq;
  s.events.push(structuredClone(event));
  return s;
}
export function walletCommand(
  input: WalletState,
  c: WalletCommand,
): { state: WalletState; result: string } {
  if (!Number.isSafeInteger(c.amount) || c.amount <= 0)
    throw new RangeError('Invalid minor-unit amount');
  const prior = input.receipts[c.id];
  if (prior)
    return {
      state: structuredClone(input),
      result:
        prior.fingerprint === fingerprint(c) ? 'REPLAY_' + prior.result : 'IDEMPOTENCY_CONFLICT',
    };
  const result = input.balances.A >= c.amount ? 'COMPLETED' : 'INSUFFICIENT_FUNDS';
  return {
    state: foldWallet(input, { seq: input.seq + 1, command: structuredClone(c), result }),
    result,
  };
}
export function walletSnapshotScenario(cut: number, dropReceipts: boolean, changedBody: boolean) {
  if (!Number.isInteger(cut) || cut < 0 || cut > 3) throw new RangeError('Invalid snapshot cut');
  let original = emptyWallet();
  for (const c of walletCommandFixture) original = walletCommand(original, c).state;
  let snapshot = emptyWallet();
  for (const e of original.events.slice(0, cut)) snapshot = foldWallet(snapshot, e);
  if (dropReceipts) snapshot.receipts = {};
  let recovered = structuredClone(snapshot);
  for (const e of original.events.slice(cut)) recovered = foldWallet(recovered, e);
  const before = structuredClone(recovered),
    retry = walletCommand(recovered, { ...walletCommandFixture[0], amount: changedBody ? 35 : 30 });
  return {
    original,
    snapshot,
    before,
    after: retry.state,
    result: retry.result,
    additionalEffects:
      retry.state.events.filter((e) => e.result === 'COMPLETED').length -
      original.events.filter((e) => e.result === 'COMPLETED').length,
    conserved: Object.values(retry.state.balances).reduce((a, b) => a + b, 0) === 100,
  };
}
export type WalletTransfer = {
  phase: 'IDLE' | 'HELD' | 'IN_TRANSIT' | 'COMPLETED' | 'REFUNDED' | 'CANCELED';
  decision: null | 'COMMIT' | 'CANCEL';
  a: number;
  b: number;
  held: number;
  transit: number;
  status: string;
  effects: string[];
};
export type TransferAction =
  'reserve' | 'depart' | 'commit' | 'cancel' | 'credit' | 'refund' | 'timeout';
export function initialWalletTransfer(): WalletTransfer {
  return {
    phase: 'IDLE',
    decision: null,
    a: 100,
    b: 0,
    held: 0,
    transit: 0,
    status: 'READY',
    effects: [],
  };
}
export function walletTransferAction(
  input: WalletTransfer,
  action: TransferAction,
  recipientAvailable: boolean,
  workerEpoch: number,
): WalletTransfer {
  const s = structuredClone(input);
  if (workerEpoch !== 5) {
    s.status = 'FENCED_OLD_COORDINATOR';
    return s;
  }
  if (action === 'timeout') {
    s.status = 'UNKNOWN_WAIT_FOR_DECISION';
    return s;
  }
  if (action === 'reserve' && s.phase === 'IDLE') {
    s.held = 60;
    s.phase = 'HELD';
    s.effects.push('T1:reserve');
    s.status = 'RESERVED';
    return s;
  }
  if (action === 'depart' && s.phase === 'HELD' && !s.decision) {
    s.a -= 60;
    s.held = 0;
    s.transit = 60;
    s.phase = 'IN_TRANSIT';
    s.effects.push('T1:debit');
    s.status = 'IN_FLIGHT';
    return s;
  }
  if (action === 'commit' || action === 'cancel') {
    const desired = action === 'commit' ? 'COMMIT' : 'CANCEL';
    if (s.decision) {
      s.status = s.decision === desired ? 'DECISION_REPLAY' : 'DECISION_CONFLICT';
      return s;
    }
    if (s.phase !== 'IN_TRANSIT' && !(action === 'cancel' && s.phase === 'HELD')) {
      s.status = 'INVALID_PHASE';
      return s;
    }
    s.decision = desired;
    s.status = 'DECIDED_' + desired;
    if (s.phase === 'HELD') {
      s.held = 0;
      s.phase = 'CANCELED';
      s.effects.push('T1:release');
    }
    return s;
  }
  if (action === 'credit') {
    if (s.phase === 'COMPLETED') {
      s.status = 'STEP_REPLAY';
      return s;
    }
    if (s.phase !== 'IN_TRANSIT' || s.decision !== 'COMMIT') {
      s.status = 'CREDIT_NOT_AUTHORIZED';
      return s;
    }
    if (!recipientAvailable) {
      s.status = 'DESTINATION_PENDING';
      return s;
    }
    s.transit = 0;
    s.b += 60;
    s.phase = 'COMPLETED';
    s.effects.push('T1:credit');
    s.status = 'COMPLETED';
    return s;
  }
  if (action === 'refund') {
    if (s.phase === 'REFUNDED') {
      s.status = 'STEP_REPLAY';
      return s;
    }
    if (s.phase !== 'IN_TRANSIT' || s.decision !== 'CANCEL') {
      s.status = 'REFUND_NOT_AUTHORIZED';
      return s;
    }
    s.transit = 0;
    s.a += 60;
    s.phase = 'REFUNDED';
    s.effects.push('T1:refund');
    s.status = 'REFUNDED';
    return s;
  }
  s.status = 'INVALID_PHASE';
  return s;
}
export function walletHolds(staleRead: boolean, resolve: 'pending' | 'post40' | 'void') {
  // Two concurrent attempts each request 60 against posted=100.
  const accepted = staleRead ? [true, true] : [true, false],
    reserved = accepted.filter(Boolean).length * 60;
  let posted = 100,
    held = reserved,
    recipient = 0;
  if (resolve === 'post40') {
    posted -= 40;
    held -= 60;
    recipient = 40;
  }
  if (resolve === 'void') held -= 60;
  return {
    accepted,
    posted,
    held,
    recipient,
    available: posted - held,
    total: posted + recipient,
    posting: resolve === 'post40' ? 40 : 0,
    released: resolve === 'post40' ? 20 : resolve === 'void' ? 60 : 0,
  };
}
