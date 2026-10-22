export const chatArrivals = [1, 3, 3, 2, 6, 4, 5, 8, 7];
export function replayChat(deliveries: number, sync: boolean) {
  if (!Number.isInteger(deliveries) || deliveries < 0 || deliveries > chatArrivals.length)
    throw new RangeError('Invalid delivery count');
  const frames = chatArrivals.slice(0, deliveries),
    seen = new Set<number>();
  let duplicates = 0,
    cursor = 0;
  function apply(seq: number) {
    if (seen.has(seq)) duplicates++;
    seen.add(seq);
    while (seen.has(cursor + 1)) cursor++;
  }
  for (const seq of frames) apply(seq);
  const cursorBeforeSync = cursor;
  if (sync) for (let seq = cursor + 1; seq <= 8; seq++) apply(seq);
  const maxSeen = seen.size ? Math.max(...seen) : 0;
  return {
    frames,
    cursor,
    cursorBeforeSync,
    duplicates,
    maxSeen,
    buffer: [...seen].filter((n) => n > cursor).sort((a, b) => a - b),
    displayed: Array.from({ length: cursor }, (_, i) => i + 1),
    missing: Array.from({ length: maxSeen }, (_, i) => i + 1).filter((n) => !seen.has(n)),
  };
}
export type ChatSession = { device: string; gateway: string; generation: number };
export function routeChat(phase: number, stale: boolean) {
  if (!Number.isInteger(phase) || phase < 0 || phase > 2)
    throw new RangeError('Invalid connection phase');
  const old: ChatSession[] = [
    { device: 'phone', gateway: 'G1', generation: 1 },
    { device: 'desktop', gateway: 'G2', generation: 1 },
  ];
  const actual =
    phase === 0
      ? old
      : phase === 1
        ? [{ device: 'phone', gateway: 'G3', generation: 2 }, old[1]]
        : [];
  const registry = stale ? old : actual;
  const routes = registry.map((record) => ({
    ...record,
    delivered: actual.some(
      (s) =>
        s.device === record.device &&
        s.gateway === record.gateway &&
        s.generation === record.generation,
    ),
  }));
  return {
    actual,
    registry,
    routes,
    delivered: routes.filter((r) => r.delivered).length,
    missed: actual.filter((s) => !routes.some((r) => r.delivered && r.device === s.device)).length,
  };
}
