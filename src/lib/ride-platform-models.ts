/** Synthetic pickup ETA matrices, not real road routing or Uber dispatch code. */
export type MatchPolicy = 'greedy' | 'total' | 'fair';
export const pickupFixtures = [
  [
    [10, 14],
    [12, 40],
  ],
  [
    [4, 12],
    [12, 18],
  ],
];
export function pickupAssignment(
  scenario: number,
  policy: MatchPolicy,
  batchSeconds: number,
  driver2Busy: boolean,
  reverse: boolean,
) {
  const costs = pickupFixtures[scenario === 1 ? 1 : 0],
    order = reverse ? [1, 0] : [0, 1];
  type Pair = { rider: number; driver: number; eta: number };
  const summarize = (pairs: Pair[]) => ({
    pairs,
    matched: pairs.length,
    total: pairs.reduce((s, p) => s + p.eta, 0),
    worst: Math.max(0, ...pairs.map((p) => p.eta)),
  });
  const available = driver2Busy ? [0] : [0, 1];
  const greedy: Pair[] = [];
  const free = new Set(available);
  for (const rider of order) {
    const driver = [...free].sort((a, b) => costs[rider][a] - costs[rider][b] || a - b)[0];
    if (driver !== undefined) {
      greedy.push({ rider, driver, eta: costs[rider][driver] });
      free.delete(driver);
    }
  }
  const possibilities: ReturnType<typeof summarize>[] = [];
  function visit(rider: number, pairs: Pair[], used: Set<number>) {
    if (rider === 2) {
      possibilities.push(summarize(pairs));
      return;
    }
    visit(rider + 1, pairs, used);
    for (const driver of available)
      if (!used.has(driver))
        visit(
          rider + 1,
          [...pairs, { rider, driver, eta: costs[rider][driver] }],
          new Set([...used, driver]),
        );
  }
  visit(0, [], new Set());
  possibilities.sort(
    (a, b) =>
      b.matched - a.matched ||
      (policy === 'fair'
        ? a.worst - b.worst || a.total - b.total
        : a.total - b.total || a.worst - b.worst),
  );
  const best = policy === 'greedy' ? summarize(greedy) : possibilities[0],
    wait = policy === 'greedy' ? 0 : batchSeconds;
  return {
    ...best,
    costs,
    wait,
    totalWait: best.total + best.matched * wait,
    worstWait: best.worst + (best.matched ? wait : 0),
    unmatched: [0, 1].filter((r) => !best.pairs.some((p) => p.rider === r)),
  };
}
export function tripClaims(stage: number, driverGuard: boolean, offerGuard: boolean) {
  const assignments: Record<string, string> = {},
    results: { command: string; trip: string; driver: string; result: string }[] = [];
  function accept(command: string, trip: string, driver: string, currentOffer: boolean) {
    const replay = results.find((r) => r.command === command);
    if (replay) {
      results.push({ ...replay, result: 'REPLAY_ACCEPTED' });
      return;
    }
    const result = assignments[trip]
      ? 'TRIP_TAKEN'
      : offerGuard && !currentOffer
        ? 'OFFER_EXPIRED_OR_SUPERSEDED'
        : driverGuard && Object.values(assignments).includes(driver)
          ? 'DRIVER_BUSY'
          : 'ACCEPTED';
    if (result === 'ACCEPTED') assignments[trip] = driver;
    results.push({ command, trip, driver, result });
  }
  if (stage >= 1) accept('c1', 'T1', 'D1', true);
  if (stage >= 2) accept('c2', 'T2', 'D1', true);
  // T3's D3 offer has expired and been superseded by the currently valid D2 offer.
  if (stage >= 3) accept('c3', 'T3', 'D3', false);
  if (stage >= 4) accept('c4', 'T3', 'D2', true);
  if (stage >= 5) accept('c1', 'T1', 'D1', true);
  const loads = ['D1', 'D2', 'D3'].map((driver) => ({
    driver,
    trips: Object.entries(assignments)
      .filter(([, d]) => d === driver)
      .map(([t]) => t),
  }));
  return {
    assignments,
    results,
    loads,
    doubleBooked: loads.filter((l) => l.trips.length > 1).length,
    wrongOfferWon: assignments.T3 === 'D3',
  };
}
export const locationFixture = [
  { epoch: 1, seq: 10, cell: 'A', received: 10 },
  { epoch: 1, seq: 9, cell: 'B', received: 11 },
  { epoch: 1, seq: 10, cell: 'A', received: 12 },
  { epoch: 2, seq: 1, cell: 'C', received: 13 },
  { epoch: 1, seq: 99, cell: 'B', received: 14 },
  { epoch: 2, seq: 2, cell: 'C', received: 15 },
] as const;
export function locationProjection(
  count: number,
  now: number,
  sequenceGuard: boolean,
  ttlGuard: boolean,
  cleanup: boolean,
) {
  type Fix = (typeof locationFixture)[number];
  let current: Fix | null = null;
  const index = new Map<string, Fix>();
  const rows = locationFixture.slice(0, count).map((fix) => {
    const stale =
      current &&
      (fix.epoch < current.epoch || (fix.epoch === current.epoch && fix.seq <= current.seq));
    if (sequenceGuard && stale) return { ...fix, result: 'STALE_OR_DUPLICATE' };
    if (cleanup && current && current.cell !== fix.cell) index.delete(current.cell);
    current = fix;
    index.set(fix.cell, fix);
    return { ...fix, result: 'APPLIED' };
  });
  const latest = current as Fix | null,
    expired = !!latest && now - latest.received > 10;
  const rawEntries = [...index.values()],
    rawCandidates = rawEntries.filter((f) => !ttlGuard || now - f.received <= 10);
  const verified = rawCandidates.filter(
    (f) => latest && f.epoch === latest.epoch && f.seq === latest.seq && f.cell === latest.cell,
  );
  return {
    rows,
    latest,
    expired,
    rawEntries,
    rawCandidates: rawCandidates.length,
    verifiedCandidates: verified.length,
    ttlSeconds: 10,
  };
}
