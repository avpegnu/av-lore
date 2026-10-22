export const clickEvents = [
  { id: 'c1', event: 8, arrival: 9 },
  { id: 'c2', event: 30, arrival: 32 },
  { id: 'c3', event: 75, arrival: 76 },
  { id: 'c1', event: 8, arrival: 80 },
  { id: 'c4', event: 40, arrival: 90 },
  { id: 'c5', event: 125, arrival: 126 },
  { id: 'c6', event: 50, arrival: 140 },
  { id: 'c7', event: 130, arrival: 150 },
  { id: 'c8', event: 70, arrival: 160 },
];
export function clickWindows(steps: number, lag: number, lateness: number) {
  if (
    !Number.isInteger(steps) ||
    steps < 0 ||
    steps > clickEvents.length ||
    !Number.isFinite(lag) ||
    lag < 0 ||
    lag > 60 ||
    !Number.isFinite(lateness) ||
    lateness < 0 ||
    lateness > 120
  )
    throw new RangeError('Invalid bounded click replay');
  const seen = new Set<string>(),
    source = new Map<number, number>(),
    windows = new Map<
      number,
      { start: number; count: number; revision: number; emitted: boolean }
    >(),
    outputs: { start: number; count: number; revision: number }[] = [];
  let watermark = -Infinity,
    maxSeen = -Infinity,
    duplicates = 0,
    side = 0,
    lateAccepted = 0;
  const rows = clickEvents.slice(0, steps).map((e) => {
    const start = Math.floor(e.event / 60) * 60,
      end = start + 60,
      before = watermark;
    let status: 'accepted' | 'duplicate' | 'accepted-late' | 'side-output';
    if (seen.has(e.id)) {
      duplicates++;
      status = 'duplicate';
    } else {
      seen.add(e.id);
      source.set(start, (source.get(start) || 0) + 1);
      if (watermark >= end + lateness) {
        side++;
        status = 'side-output';
      } else {
        const w = windows.get(start) || { start, count: 0, revision: 0, emitted: false };
        w.count++;
        windows.set(start, w);
        status = watermark >= end ? 'accepted-late' : 'accepted';
        if (status === 'accepted-late') lateAccepted++;
        if (w.emitted) {
          w.revision++;
          outputs.push({ start, count: w.count, revision: w.revision });
        }
      }
    }
    maxSeen = Math.max(maxSeen, e.event);
    watermark = Math.max(watermark, maxSeen - lag);
    for (const w of windows.values())
      if (!w.emitted && watermark >= w.start + 60) {
        w.emitted = true;
        w.revision = 1;
        outputs.push({ start: w.start, count: w.count, revision: 1 });
      }
    return { ...e, start, status, before, watermark };
  });
  return {
    rows,
    watermark,
    duplicates,
    side,
    lateAccepted,
    unique: seen.size,
    accepted: [...windows.values()].reduce((n, w) => n + w.count, 0),
    windows: [...windows.values()]
      .sort((a, b) => a.start - b.start)
      .map((w) => ({
        ...w,
        sourceCount: source.get(w.start) || 0,
        closed: watermark >= w.start + 60 + lateness,
      })),
    outputs,
  };
}
export type Aggregate = { generation: number; revision: number; count: number };
export function compareAggregate(a: Aggregate, b: Aggregate) {
  return a.generation - b.generation || a.revision - b.revision;
}
export function applyAggregate(current: Aggregate | undefined, next: Aggregate) {
  if (
    ![next.generation, next.revision, next.count].every(Number.isSafeInteger) ||
    next.generation < 1 ||
    next.revision < 1 ||
    next.count < 0
  )
    throw new RangeError('Invalid aggregate version');
  if (current) {
    const c = compareAggregate(next, current);
    if (c < 0) return { value: current, reason: 'ignored-stale' };
    if (c === 0) {
      if (next.count !== current.count)
        throw new Error('Conflicting content for one aggregate version');
      return { value: current, reason: 'ignored-duplicate' };
    }
  }
  return { value: { ...next }, reason: 'replaced' };
}
export const aggregateMessages: Aggregate[] = [
  { generation: 1, revision: 1, count: 2 },
  { generation: 1, revision: 2, count: 3 },
  { generation: 1, revision: 1, count: 2 },
  { generation: 2, revision: 1, count: 4 },
  { generation: 1, revision: 3, count: 3 },
  { generation: 2, revision: 1, count: 4 },
];
export function aggregateReplay(steps: number, policy: 'add' | 'upsert' | 'fenced') {
  if (!Number.isInteger(steps) || steps < 0 || steps > 6)
    throw new RangeError('Invalid aggregate replay');
  let current: Aggregate | undefined,
    expected: Aggregate | undefined,
    stale = 0,
    duplicates = 0;
  const rows = aggregateMessages.slice(0, steps).map((m) => {
    if (!expected || compareAggregate(m, expected) > 0) expected = m;
    let reason: string;
    if (policy === 'fenced') {
      const a = applyAggregate(current, m);
      current = a.value;
      reason = a.reason;
      if (reason === 'ignored-stale') stale++;
      if (reason === 'ignored-duplicate') duplicates++;
    } else if (policy === 'add') {
      current = { ...m, count: (current?.count || 0) + m.count };
      reason = 'added-absolute-as-delta';
    } else {
      current = { ...m };
      reason = 'blind-replace';
    }
    return { ...m, reason, value: current!.count };
  });
  return {
    rows,
    value: current?.count || 0,
    expected: expected?.count || 0,
    generation: current?.generation || 0,
    revision: current?.revision || 0,
    stale,
    duplicates,
  };
}
