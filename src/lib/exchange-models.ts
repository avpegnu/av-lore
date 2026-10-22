// Educational continuous-book rules, not a venue-complete matching engine.
// Integer ticks/lots are bounded; arrays favor inspectability over latency.
type Identity = { seq: number; owner: string; id: string };
export type BookEvent = Identity &
  (
    | { kind: 'limit'; side: 'buy' | 'sell'; price: number; qty: number }
    | { kind: 'market'; side: 'buy' | 'sell'; qty: number }
    | { kind: 'cancel'; target: string }
    | { kind: 'reduce'; target: string; qty: number }
    | { kind: 'replace'; target: string; price: number; qty: number }
    | { kind: 'halt' }
    | { kind: 'resume' }
  );
export type RestingOrder = {
  id: string;
  owner: string;
  side: 'buy' | 'sell';
  price: number;
  qty: number;
  priority: number;
};
export type Fill = {
  id: string;
  seq: number;
  maker: string;
  taker: string;
  price: number;
  qty: number;
};
export type BookResult = {
  status: string;
  filled: number;
  rested: number;
  expired: number;
  orderId?: string;
};
export type BookState = {
  lastSeq: number;
  mode: 'CONTINUOUS' | 'HALTED';
  config: 'toy-price-time-v1';
  orders: RestingOrder[];
  fills: Fill[];
  seen: Record<string, { body: string; result: BookResult }>;
  lastResult: BookResult;
};
export function initialBook(): BookState {
  return {
    lastSeq: 0,
    mode: 'CONTINUOUS',
    config: 'toy-price-time-v1',
    orders: [],
    fills: [],
    seen: {},
    lastResult: { status: 'READY', filled: 0, rested: 0, expired: 0 },
  };
}
export function applyBookEvent(input: BookState, event: BookEvent): BookState {
  if (!Number.isSafeInteger(event.seq) || event.seq !== input.lastSeq + 1)
    throw new RangeError('Committed event gap or duplicate index');
  if (!/^[A-Z0-9-]{1,32}$/.test(event.owner) || !/^[A-Z0-9-]{1,32}$/.test(event.id))
    throw new RangeError('Invalid bounded identity');
  if (
    'qty' in event &&
    (!Number.isSafeInteger(event.qty) ||
      event.qty < (event.kind === 'reduce' ? 0 : 1) ||
      event.qty > 1000)
  )
    throw new RangeError('Invalid bounded lot quantity');
  if (
    'price' in event &&
    (!Number.isSafeInteger(event.price) || event.price < 1 || event.price > 1000000)
  )
    throw new RangeError('Invalid bounded price ticks');
  const s = structuredClone(input),
    key = JSON.stringify([event.owner, event.id]);
  s.lastSeq = event.seq;
  const body = JSON.stringify(
      Object.fromEntries(
        Object.entries(event)
          .filter(([k]) => k !== 'seq')
          .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0),
      ),
    ),
    prior = s.seen[key];
  if (prior) {
    s.lastResult = { ...prior.result, status: prior.body === body ? 'DUPLICATE' : 'ID_CONFLICT' };
    return s;
  }
  let result: BookResult = { status: 'REJECTED', filled: 0, rested: 0, expired: 0 };
  const finish = () => {
    s.lastResult = result;
    s.seen[key] = { body, result: structuredClone(result) };
    return s;
  };
  if (event.kind === 'halt' || event.kind === 'resume') {
    if (event.owner !== 'VENUE') {
      result.status = 'DENIED_CONTROL';
      return finish();
    }
    s.mode = event.kind === 'halt' ? 'HALTED' : 'CONTINUOUS';
    result.status = s.mode;
    return finish();
  }
  if (event.kind === 'cancel' || event.kind === 'reduce') {
    const order = s.orders.find((o) => o.id === event.target && o.owner === event.owner);
    if (!order) {
      result.status = 'NOT_FOUND';
      return finish();
    }
    if (event.kind === 'reduce' && event.qty > order.qty) {
      result.status = 'INVALID_REDUCTION';
      return finish();
    }
    order.qty = event.kind === 'cancel' ? 0 : event.qty;
    s.orders = s.orders.filter((o) => o.qty > 0);
    result.status = event.kind === 'cancel' ? 'CANCELLED' : 'REDUCED';
    result.orderId = order.id;
    return finish();
  }
  if (s.mode === 'HALTED') {
    result.status = 'HALTED_REJECT';
    return finish();
  }
  let side: 'buy' | 'sell', price: number | undefined;
  if (event.kind === 'replace') {
    const original = s.orders.find((o) => o.id === event.target && o.owner === event.owner);
    if (!original) {
      result.status = 'NOT_FOUND';
      return finish();
    }
    side = original.side;
    price = event.price;
    s.orders = s.orders.filter((o) => o.id !== original.id);
  } else {
    side = event.side;
    price = event.kind === 'limit' ? event.price : undefined;
  }
  const orderId = event.owner + ':' + event.id;
  let remaining = event.qty,
    ordinal = 0;
  const opposite = s.orders
    .filter((o) => o.side !== side)
    .sort(
      (a, b) => (side === 'buy' ? a.price - b.price : b.price - a.price) || a.priority - b.priority,
    );
  for (const maker of opposite) {
    if (!remaining) break;
    if (price !== undefined && (side === 'buy' ? maker.price > price : maker.price < price)) break;
    const qty = Math.min(remaining, maker.qty);
    s.fills.push({
      id: `${event.seq}/${ordinal++}`,
      seq: event.seq,
      maker: maker.id,
      taker: orderId,
      price: maker.price,
      qty,
    });
    maker.qty -= qty;
    remaining -= qty;
  }
  s.orders = s.orders.filter((o) => o.qty > 0);
  result = {
    status: 'ACCEPTED',
    filled: event.qty - remaining,
    rested: price === undefined ? 0 : remaining,
    expired: price === undefined ? remaining : 0,
    orderId,
  };
  if (price !== undefined && remaining)
    s.orders.push({
      id: orderId,
      owner: event.owner,
      side,
      price,
      qty: remaining,
      priority: event.seq,
    });
  return finish();
}
export const exchangeEvents: BookEvent[] = [
  { seq: 1, owner: 'MA', id: 'A', kind: 'limit', side: 'sell', price: 100, qty: 5 },
  { seq: 2, owner: 'MB', id: 'B', kind: 'limit', side: 'sell', price: 100, qty: 4 },
  { seq: 3, owner: 'MC', id: 'C', kind: 'limit', side: 'sell', price: 102, qty: 8 },
  { seq: 4, owner: 'MD', id: 'D', kind: 'limit', side: 'buy', price: 98, qty: 6 },
  { seq: 5, owner: 'BT', id: 'T1', kind: 'limit', side: 'buy', price: 100, qty: 7 },
  { seq: 6, owner: 'MB', id: 'REDUCE-B', kind: 'reduce', target: 'MB:B', qty: 1 },
  { seq: 7, owner: 'MC', id: 'C2', kind: 'replace', target: 'MC:C', price: 101, qty: 8 },
  { seq: 8, owner: 'BT', id: 'T2', kind: 'limit', side: 'buy', price: 103, qty: 5 },
  { seq: 9, owner: 'ME', id: 'E', kind: 'limit', side: 'sell', price: 101, qty: 3 },
  { seq: 10, owner: 'MC', id: 'C3', kind: 'replace', target: 'MC:C2', price: 101, qty: 4 },
  { seq: 11, owner: 'BT', id: 'T3', kind: 'limit', side: 'buy', price: 101, qty: 4 },
  { seq: 12, owner: 'BT', id: 'T1', kind: 'limit', side: 'buy', price: 100, qty: 7 },
  { seq: 13, owner: 'BT', id: 'T4', kind: 'market', side: 'buy', qty: 10 },
  { seq: 14, owner: 'ST', id: 'T5', kind: 'market', side: 'sell', qty: 10 },
  { seq: 15, owner: 'VENUE', id: 'H1', kind: 'halt' },
  { seq: 16, owner: 'BT', id: 'T6', kind: 'limit', side: 'buy', price: 100, qty: 2 },
  { seq: 17, owner: 'VENUE', id: 'R1', kind: 'resume' },
];
export function replayBook(count: number, start = initialBook()) {
  if (!Number.isInteger(count) || count < start.lastSeq || count > exchangeEvents.length)
    throw new RangeError('Invalid committed replay cut');
  return exchangeEvents.slice(start.lastSeq, count).reduce(applyBookEvent, structuredClone(start));
}
// Authority is an external fact supplied by the scenario, never inferred from lag.
// The committed prefix is fixed at 13; assigned-but-uncommitted 14 is discarded.
export function exchangeRecovery(applied: number, fenced: boolean) {
  const committed = 13;
  if (!Number.isInteger(applied) || applied < 0 || applied > committed)
    throw new RangeError('Invalid standby prefix');
  const state = replayBook(applied);
  return {
    committed,
    assigned: 14,
    state,
    lag: committed - applied,
    status: applied < committed ? 'CATCHING_UP' : fenced ? 'READY_NEW_EPOCH' : 'BLOCKED_AUTHORITY',
    canPublish: applied === committed && fenced,
    // Comparison is full canonical state equality in this small model, not a hash.
    identical: JSON.stringify(state) === JSON.stringify(replayBook(committed)),
  };
}
// Two commands on different symbol shards share one account credit budget.
// Safe mode serializes reservations and deduplicates releases; unsafe mode
// illustrates stale prechecks and duplicate credit returns independently.
export function sharedRiskReplay(step: number, guard: boolean) {
  if (!Number.isInteger(step) || step < 0 || step > 6)
    throw new RangeError('Invalid bounded risk replay');
  let available = 1000,
    reservedA = 0,
    reservedB = 0,
    accepted = 0,
    releases = 0;
  if (step >= 3) {
    available -= 700;
    reservedA = 700;
    accepted++;
  }
  if (step >= 4 && (!guard || available >= 600)) {
    available -= 600;
    reservedB = 600;
    accepted++;
  }
  if (step >= 5) {
    available += 700;
    reservedA = 0;
    releases++;
  }
  if (step >= 6 && !guard) {
    available += 700;
    releases++;
  }
  return {
    available,
    reservedA,
    reservedB,
    accepted,
    releases,
    overReserved: step >= 4 && (guard ? 0 : 300),
    invariantError: available + reservedA + reservedB - 1000,
  };
}
