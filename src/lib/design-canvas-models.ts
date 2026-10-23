// Bounded histories for teaching; this is not a collaborative editor protocol.
type Shape = { x: number; fill: 'gray' | 'blue' };
type Actor = 'A' | 'B';
const initial = (): Shape => ({ x: 40, fill: 'gray' });
export function propertyHistory(step: number, wholeObject: boolean, protectPending: boolean) {
  if (!Number.isInteger(step) || step < 0 || step > 6) throw new RangeError('Invalid history step');
  const clients: Record<Actor, Shape> = { A: { x: 160, fill: 'gray' }, B: { x: 40, fill: 'blue' } };
  const pending: Record<Actor, Partial<Record<keyof Shape, string>>> = {
    A: { x: 'A2' },
    B: { fill: 'B1' },
  };
  const server = initial();
  const edits: { id: string; actor: Actor; key: keyof Shape; patch: Partial<Shape> }[] = [
    {
      id: 'B1',
      actor: 'B',
      key: 'fill',
      patch: wholeObject ? { x: 40, fill: 'blue' } : { fill: 'blue' },
    },
    { id: 'A1', actor: 'A', key: 'x', patch: wholeObject ? { x: 80, fill: 'gray' } : { x: 80 } },
    { id: 'A2', actor: 'A', key: 'x', patch: wholeObject ? { x: 160, fill: 'gray' } : { x: 160 } },
  ];
  let rollbacks = 0;
  for (let n = 1; n <= step; n++) {
    const edit = edits[Math.floor((n - 1) / 2)];
    if (n % 2) Object.assign(server, edit.patch);
    else
      for (const actor of ['A', 'B'] as Actor[]) {
        // An older echo cannot acknowledge a newer local operation.
        if (actor === edit.actor && pending[actor][edit.key] === edit.id)
          delete pending[actor][edit.key];
        for (const key of Object.keys(edit.patch) as (keyof Shape)[]) {
          if (protectPending && pending[actor][key]) continue;
          if (pending[actor][key] && clients[actor][key] !== edit.patch[key]) rollbacks++;
          Object.assign(clients[actor], { [key]: edit.patch[key] });
        }
      }
  }
  return {
    server,
    clients,
    pending,
    rollbacks,
    lostIndependentFill: step >= 3 && server.fill !== 'blue',
    converged:
      step === 6 &&
      ['A', 'B'].every((a) => JSON.stringify(clients[a as Actor]) === JSON.stringify(server)),
  };
}

export function canvasRecovery(
  journalThrough: number,
  loseFour: boolean,
  contiguous: boolean,
  durableAck: boolean,
) {
  if (!Number.isInteger(journalThrough) || journalThrough < 3 || journalThrough > 6)
    throw new RangeError('Invalid journal prefix');
  const entries = [
    { sequence: 4, x: null, fill: 'blue' },
    { sequence: 5, x: 50, fill: null },
    { sequence: 6, x: 60, fill: null },
  ].filter((e) => e.sequence <= journalThrough && !(loseFour && e.sequence === 4));
  const state: { x: number; fill: string } = { x: 30, fill: 'gray' };
  let recoveredThrough = 3;
  const applied: number[] = [];
  for (const entry of entries) {
    if (contiguous && entry.sequence !== recoveredThrough + 1) break;
    if (entry.x !== null) state.x = entry.x;
    if (entry.fill !== null) state.fill = entry.fill;
    applied.push(entry.sequence);
    recoveredThrough = entry.sequence;
  }
  const ackThrough = durableAck ? journalThrough : 6;
  const unrecoveredAcked = Array.from({ length: ackThrough - 3 }, (_, i) => i + 4).filter(
    (n) => !applied.includes(n),
  );
  const gap = loseFour && journalThrough >= 4;
  return {
    state,
    entries,
    applied,
    recoveredThrough,
    ackThrough,
    unrecoveredAcked,
    repairRequired: gap,
    safeToServe: !gap,
    acceptedThrough: 6,
    volatileAccepted: 6 - journalThrough,
  };
}

export function metadataRefill(
  step: number,
  generationGuard: boolean,
  loseInvalidation: boolean,
  verifiedBarrier: boolean,
) {
  if (!Number.isInteger(step) || step < 0 || step > 4)
    throw new RangeError('Invalid metadata step');
  const committedVersion = step >= 1 ? 11 : 10;
  const generation = step >= 2 && !loseInvalidation ? 1 : 0;
  const staleResult = step >= 3;
  const rejectGeneration = staleResult && generationGuard && generation !== 0;
  // The floor is an explicitly supplied verified synchronization barrier, not an oracle.
  const rejectFloor = staleResult && verifiedBarrier && committedVersion === 11;
  const rejected = rejectGeneration || rejectFloor;
  const refetched = step >= 4 && rejected;
  const cachedVersion = !staleResult ? null : rejected ? (refetched ? 11 : null) : 10;
  return {
    committedVersion,
    generation,
    fetchCapturedGeneration: 0,
    cachedVersion,
    rejected,
    refetched,
    visible: cachedVersion === null ? 'WAIT' : cachedVersion === 11 ? 'CURRENT' : 'STALE',
    title: cachedVersion === null ? '—' : cachedVersion === 11 ? 'New title' : 'Old title',
    repairRequests: refetched ? 1 : 0,
  };
}
