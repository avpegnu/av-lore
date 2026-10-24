export type ClickWindowShape = 'tumbling' | 'hopping' | 'session';
export const shapeEvents = [5, 12, 18, 47, 55, 70, 91].map((time, i) => ({
  id: 'e' + (i + 1),
  time,
}));
export function clickWindowShapes(shape: ClickWindowShape, gap: number, bridge: boolean) {
  if (!['tumbling', 'hopping', 'session'].includes(shape) || ![10, 20, 30].includes(gap))
    throw new RangeError('Invalid window fixture');
  const events = [...shapeEvents, ...(bridge ? [{ id: 'bridge', time: 34 }] : [])].sort(
    (a, b) => a.time - b.time,
  );
  const windows: { start: number; end: number; ids: string[] }[] = [];
  for (const e of events) {
    if (shape === 'session') {
      const last = windows.at(-1);
      // Explicit fixture convention: t < last.end joins; equality starts another session.
      if (last && e.time < last.end) {
        last.end = e.time + gap;
        last.ids.push(e.id);
      } else windows.push({ start: e.time, end: e.time + gap, ids: [e.id] });
    } else {
      const slide = shape === 'tumbling' ? 60 : 30,
        latest = Math.floor(e.time / slide) * slide;
      const starts = shape === 'tumbling' ? [latest] : [latest - 30, latest];
      for (const start of starts) {
        let w = windows.find((w) => w.start === start);
        if (!w) {
          w = { start, end: start + 60, ids: [] };
          windows.push(w);
        }
        w.ids.push(e.id);
      }
    }
  }
  windows.sort((a, b) => a.start - b.start);
  return { events, windows, contributions: windows.reduce((n, w) => n + w.ids.length, 0) };
}
export function clickPartitionProgress(
  phase: number,
  lag: number,
  lateness: number,
  idleness: boolean,
) {
  if (
    !Number.isInteger(phase) ||
    phase < 0 ||
    phase > 3 ||
    !Number.isInteger(lag) ||
    lag < 0 ||
    lag > 30 ||
    !Number.isInteger(lateness) ||
    lateness < 0 ||
    lateness > 120
  )
    throw new RangeError('Invalid partition fixture');
  let progress = -Infinity;
  const frames = Array.from({ length: phase + 1 }, (_, i) => {
    const p0 = (i === 0 ? 70 : 140) - lag,
      p1 = (i === 3 ? 50 : 40) - lag,
      idle = i === 2 && idleness;
    const before = progress;
    progress = Math.max(progress, idle ? p0 : Math.min(p0, p1));
    return { phase: i, p0, p1, idle, before, progress };
  });
  const last = frames.at(-1)!,
    beforeReturn = frames[2]?.progress;
  const returned =
    phase < 3
      ? 'not-arrived'
      : beforeReturn! >= 60 + lateness
        ? 'side-output'
        : beforeReturn! >= 60
          ? 'accepted-late'
          : 'accepted';
  return {
    frames,
    ...last,
    returned,
    count: 1 + (returned === 'accepted' || returned === 'accepted-late' ? 1 : 0),
    emitted: progress >= 60,
    retired: progress >= 60 + lateness,
  };
}
type AdTotal = { ad: string; count: number };
const order = (a: AdTotal, b: AdTotal) => b.count - a.count || a.ad.localeCompare(b.ad, 'en');
const sum = (rows: AdTotal[]) => {
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.ad, (totals.get(r.ad) || 0) + r.count);
  return [...totals].map(([ad, count]) => ({ ad, count })).sort(order);
};
export const adPartials: AdTotal[][] = [
  [
    { ad: 'A', count: 60 },
    { ad: 'X', count: 100 },
  ],
  [
    { ad: 'A', count: 60 },
    { ad: 'Y', count: 100 },
  ],
];
export function clickTopN(localK: number, n: number, missing: boolean) {
  if (![1, 2].includes(localK) || ![1, 2].includes(n))
    throw new RangeError('Invalid top-N fixture');
  const shards = adPartials.map((rows, i) => ({
    index: i,
    available: !missing || i !== 1,
    rows: [...rows].sort(order),
    kept: [...rows].sort(order).slice(0, localK),
  }));
  const active = shards.filter((s) => s.available),
    kept = active.flatMap((s) => s.kept),
    all = active.flatMap((s) => s.rows);
  const pruned = sum(kept).slice(0, n),
    summed = sum(all).slice(0, n),
    truth = sum(adPartials.flat()).slice(0, n);
  return {
    shards,
    pruned,
    summed,
    truth,
    candidateCount: kept.length,
    inputRows: all.length,
    partial: missing,
    prunedMatchesFull: JSON.stringify(pruned) === JSON.stringify(truth),
  };
}
