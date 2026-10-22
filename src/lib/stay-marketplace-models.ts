/** Synthetic local-night, quote and projection fixtures; not a reservation/payment engine. */
export const stayListings = [
  { id: 'A', blocked: [2, 3], min: 4, checkInEveryDay: true },
  { id: 'B', blocked: [6, 7], min: 1, checkInEveryDay: true },
  { id: 'C', blocked: [10], min: 2, checkInEveryDay: true },
  { id: 'D', blocked: [0, 1], min: 1, checkInEveryDay: false },
];
export function stayAvailability(
  start: number,
  nights: number,
  policy: boolean,
  unsafeClamp: boolean,
) {
  const horizon = 14,
    end = start + nights,
    outside = start < 0 || nights < 1 || end > horizon;
  let mask = 0n;
  for (let day = Math.max(0, start); day < Math.min(end, horizon); day++) mask |= 1n << BigInt(day);
  const rows = stayListings.map((l) => {
    let bits = 0n;
    for (const d of l.blocked) bits |= 1n << BigInt(d);
    const conflict = !!(bits & mask),
      minViolation = nights < l.min,
      checkinViolation = !l.checkInEveryDay && start % 7 !== 0;
    const status =
      outside && !unsafeClamp
        ? 'UNKNOWN'
        : conflict
          ? 'BLOCKED'
          : policy && (minViolation || checkinViolation)
            ? 'RULE_REJECTED'
            : 'CANDIDATE';
    return {
      ...l,
      bits: bits.toString(2).padStart(horizon, '0').split('').reverse().join(''),
      conflict,
      minViolation,
      checkinViolation,
      status,
    };
  });
  return {
    rows,
    start,
    end,
    mask: mask.toString(2),
    outside,
    bitmapCandidates: rows.filter((r) => !r.conflict).length,
    candidates: rows.filter((r) => r.status === 'CANDIDATE').length,
    falseBeyondHorizon: outside ? rows.filter((r) => r.status === 'CANDIDATE').length : 0,
  };
}
export function stayQuote(now: number, honorValid: boolean, consent: boolean) {
  const expires = 10,
    valid = now < expires,
    oldNightly = 10000,
    newNightly = 12000,
    fees = 2000,
    nights = 3,
    taxRate = 0.1;
  const oldSubtotal = oldNightly * nights + fees,
    newSubtotal = newNightly * nights + fees,
    oldTotal = oldSubtotal + Math.round(oldSubtotal * taxRate),
    newTotal = newSubtotal + Math.round(newSubtotal * taxRate);
  const amount = valid && honorValid ? oldTotal : newTotal,
    changed = amount !== oldTotal,
    status = changed && !consent ? 'REQUOTE_REQUIRED' : 'PRICE_ACCEPTED';
  return {
    oldTotal,
    newTotal,
    amount,
    valid,
    changed,
    status,
    chargeable: status === 'PRICE_ACCEPTED' ? amount : 0,
    oldNightly,
    newNightly,
    fees,
    nights,
    expires,
  };
}
export function stayProjection(
  count: number,
  versionGuard: boolean,
  dropLatest: boolean,
  freshnessGate: boolean,
) {
  const mutations = [
    { version: 1, blocked: [] as number[], source: 'BACKFILL' },
    { version: 4, blocked: [5, 6, 7], source: 'LIVE_BOOKING' },
    { version: 4, blocked: [5, 6, 7], source: 'REDELIVERY' },
    { version: 2, blocked: [4, 5, 6], source: 'OLD_HOLD' },
    { version: 3, blocked: [], source: 'OLD_CANCEL' },
    { version: 1, blocked: [], source: 'LATE_BACKFILL' },
  ];
  let version = 0,
    blocked: number[] = [];
  const rows = mutations.slice(0, count).map((m) => {
    let result = 'APPLIED';
    if (dropLatest && m.version === 4) result = 'LOST';
    else if (versionGuard && m.version <= version) result = 'STALE_OR_DUPLICATE';
    else {
      version = m.version;
      blocked = m.blocked;
    }
    return { ...m, result, projectedVersion: version };
  });
  const knownFloor = 4,
    unknown = freshnessGate && version < knownFloor,
    indexSaysFree = !blocked.includes(6),
    status = unknown ? 'UNKNOWN' : indexSaysFree ? 'CANDIDATE' : 'BLOCKED';
  return {
    rows,
    version,
    blocked,
    status,
    knownFloor,
    indexSaysFree,
    falsePositive: status === 'CANDIDATE',
    lagVersions: Math.max(0, knownFloor - version),
  };
}
