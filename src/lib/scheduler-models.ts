// Offline synthetic fixtures. No cron parser, real clock, lease service or HTTP side effects.
export type ScheduleSinkMode = 'none' | 'fence-only' | 'idempotent' | 'authority-and-idempotent';
export function scheduledLease(stage: number, mode: ScheduleSinkMode, newWorkerFirst: boolean) {
  if (!Number.isInteger(stage) || stage < 0 || stage > 5)
    throw new RangeError('Invalid lease step');
  const attempts: { worker: string; token: number; result: string }[] = [],
    effects: string[] = [];
  let highest = 0;
  const apply = (worker: string, token: number) => {
    let result = 'APPLIED';
    if (mode === 'authority-and-idempotent' && token !== 8) result = 'STALE_AUTHORITY';
    else if (mode === 'fence-only' && token < highest) result = 'OLD_TOKEN';
    else if ((mode === 'idempotent' || mode === 'authority-and-idempotent') && effects.length)
      result = 'DUPLICATE_RUN_STEP';
    if (result === 'APPLIED') {
      effects.push('run-9:charge-40');
      highest = Math.max(highest, token);
    }
    attempts.push({ worker, token, result });
  };
  if (stage >= 3) apply(newWorkerFirst ? 'B' : 'A', newWorkerFirst ? 8 : 7);
  if (stage >= 4) apply(newWorkerFirst ? 'A' : 'B', newWorkerFirst ? 7 : 8);
  return {
    attempts,
    effects,
    charged: effects.length * 40,
    highest,
    activeToken: stage >= 2 ? 8 : 7,
    oldCompletion: stage >= 5 ? 'REJECTED_STALE_ATTEMPT' : 'NOT_SENT',
    // At stage2 B has authority, but the sink has seen no token yet.
    schedulerOwner: stage >= 2 ? 'B' : 'A',
  };
}
export type MissedPolicy = 'all' | 'latest' | 'skip';
export function schedulerCatchup(now: number, deadline: number, policy: MissedPolicy, cap: number) {
  if (
    !Number.isInteger(now) ||
    now < 30 ||
    now > 90 ||
    !Number.isInteger(deadline) ||
    deadline < 0 ||
    deadline > 90 ||
    !Number.isInteger(cap) ||
    cap < 1 ||
    cap > 10
  )
    throw new RangeError('Invalid catchup fixture');
  // Durable materialization cursor is after occurrence0. All remaining occurrences <= now are considered.
  const rows = Array.from({ length: Math.floor(now / 10) }, (_, i) => ({
    minute: (i + 1) * 10,
    id: `job7:v2:${(i + 1) * 10}`,
  }));
  const eligible = rows.filter((r) => now - r.minute <= deadline),
    selected = policy === 'skip' ? [] : policy === 'latest' ? eligible.slice(-1) : eligible;
  const admitted = selected.slice(0, cap),
    deferred = selected.slice(cap);
  return {
    rows: rows.map((r) => ({
      ...r,
      age: now - r.minute,
      status:
        now - r.minute > deadline
          ? 'EXPIRED'
          : policy === 'skip'
            ? 'POLICY_SKIPPED'
            : !selected.some((x) => x.id === r.id)
              ? 'COALESCED'
              : admitted.some((x) => x.id === r.id)
                ? 'ADMITTED'
                : 'DEFERRED',
    })),
    admitted,
    deferred,
    safeCursor: deferred.length ? deferred[0].minute - 10 : Math.floor(now / 10) * 10,
  };
}
export type DstGap = 'skip' | 'next-valid';
export type DstFold = 'first' | 'both';
export function schedulerDst(gap: DstGap, fold: DstFold) {
  // Fixed 2026 America/New_York examples, not a general timezone/cron implementation.
  const spring =
    gap === 'skip'
      ? []
      : [
          {
            id: 'jobSpring:2026-03-08T02:30:gap',
            utc: '2026-03-08T07:00:00Z',
            local: '03:00 -04:00',
          },
        ];
  const fall = [
    { id: 'jobFall:2026-11-01T01:30:-04:00', utc: '2026-11-01T05:30:00Z', local: '01:30 -04:00' },
    ...(fold === 'both'
      ? [
          {
            id: 'jobFall:2026-11-01T01:30:-05:00',
            utc: '2026-11-01T06:30:00Z',
            local: '01:30 -05:00',
          },
        ]
      : []),
  ];
  return { spring, fall, total: spring.length + fall.length };
}
