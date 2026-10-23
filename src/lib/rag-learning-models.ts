/** Fixed ranked-list, 2D IVF and index-publication fixtures, not neural models. */
export const ragFixtureDocs = [
  { id: 'PRIVATE', eligible: false, relevant: false, rerank: 0.99 },
  { id: 'CACHE', eligible: true, relevant: false, rerank: 0.6 },
  { id: 'OPS', eligible: true, relevant: true, rerank: 0.97 },
  { id: 'RECOVERY', eligible: true, relevant: true, rerank: 0.9 },
  { id: 'RESTORE', eligible: true, relevant: false, rerank: 0.5 },
  { id: 'OLD', eligible: false, relevant: false, rerank: 0.7 },
  { id: 'UPLOAD', eligible: true, relevant: false, rerank: 0.1 },
  { id: 'QUOTA', eligible: true, relevant: false, rerank: 0.2 },
];
const lexical = ['PRIVATE', 'CACHE', 'OPS', 'RESTORE', 'OLD', 'UPLOAD', 'QUOTA'],
  semantic = ['PRIVATE', 'RECOVERY', 'OPS', 'CACHE', 'OLD', 'UPLOAD', 'QUOTA'];
export function reciprocalRanks(lists: string[][], k: number) {
  if (k < 0) throw new Error('Invalid RRF constant');
  const totals = new Map<string, number>();
  for (const list of lists)
    [...new Set(list)].forEach((id, i) => totals.set(id, (totals.get(id) || 0) + 1 / (k + i + 1)));
  return [...totals]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
export function ragCandidates(
  depth: number,
  k: number,
  mode: 'lexical' | 'semantic' | 'hybrid',
  rerank: boolean,
  earlyFilter: boolean,
) {
  if (!Number.isInteger(depth) || depth < 1 || depth > 7)
    throw new Error('Invalid candidate depth');
  const eligible = (id: string) => ragFixtureDocs.find((d) => d.id === id)!.eligible;
  const cut = (list: string[]) => (earlyFilter ? list.filter(eligible) : list).slice(0, depth);
  const lists =
    mode === 'hybrid'
      ? [cut(lexical), cut(semantic)]
      : [cut(mode === 'lexical' ? lexical : semantic)];
  const fused = reciprocalRanks(lists, k).filter((d) => eligible(d.id));
  const ranked = rerank
    ? [...fused].sort(
        (a, b) =>
          ragFixtureDocs.find((d) => d.id === b.id)!.rerank -
            ragFixtureDocs.find((d) => d.id === a.id)!.rerank || b.score - a.score,
      )
    : fused;
  const top = ranked.slice(0, 2),
    found = top.filter((d) => ragFixtureDocs.find((x) => x.id === d.id)!.relevant).length;
  return {
    lists,
    fused,
    top,
    recall: found / 2,
    precision: top.length ? found / top.length : 0,
    candidateRecall:
      fused.filter((d) => ragFixtureDocs.find((x) => x.id === d.id)!.relevant).length / 2,
  };
}
const centers = [
  [20, 20],
  [40, 20],
  [60, 20],
  [20, 60],
  [40, 60],
  [60, 60],
];
const offsets = [
  [-8, -5],
  [-5, 6],
  [0, -7],
  [3, 2],
  [7, -3],
  [-2, 8],
  [8, 7],
  [-7, 1],
];
export const ragIvfPoints = centers.flatMap(([cx, cy], cell) =>
  offsets.map(([dx, dy], i) => ({ id: cell * 8 + i, cell, x: cx + dx, y: cy + dy })),
);
export function ragIvf(nprobe: number, qx: number, qy: number) {
  if (!Number.isInteger(nprobe) || nprobe < 1 || nprobe > 6) throw new Error('Invalid nprobe');
  const d2 = (x: number, y: number) => (x - qx) ** 2 + (y - qy) ** 2;
  const visitedCells = centers
    .map(([x, y], i) => ({ i, d: d2(x, y) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .slice(0, nprobe)
    .map((c) => c.i);
  const order = (a: (typeof ragIvfPoints)[number], b: (typeof ragIvfPoints)[number]) =>
    d2(a.x, a.y) - d2(b.x, b.y) || a.id - b.id;
  const exact = [...ragIvfPoints].sort(order).slice(0, 4),
    scanned = ragIvfPoints.filter((p) => visitedCells.includes(p.cell)),
    approx = [...scanned].sort(order).slice(0, 4);
  return {
    centers,
    visitedCells,
    exact,
    approx,
    scanned: scanned.length,
    distanceEvaluations: centers.length + scanned.length,
    recall: approx.filter((p) => exact.some((e) => e.id === p.id)).length / 4,
  };
}
export function ragMemory(n: number, d: number, m: number, bits: number) {
  if (n < 1 || d < 1 || m < 1 || d % m !== 0 || bits < 1 || bits > 16)
    throw new Error('Invalid memory dimensions');
  return {
    flatBytes: n * (d * 4 + 8),
    pqPayloadBytes: n * (Math.ceil((m * bits) / 8) + 8),
    pqCodebookBytes: 2 ** bits * d * 4,
  };
}
export function ragPublish(
  deleteFirst: boolean,
  versionGuard: boolean,
  queryGuard: boolean,
  revoked: boolean,
) {
  // Source generation4 started a build, then generation5 updates or deletes before it completes.
  const source = {
      generation: 5,
      deleted: deleteFirst,
      acl: revoked ? 'beta' : 'alpha',
      body: 'source-v5',
    },
    job = { generation: 4, acl: 'alpha', body: 'source-v4' };
  let index: { generation: number; acl: string; body: string } | null = deleteFirst
    ? null
    : { generation: 5, acl: 'alpha', body: 'source-v5' };
  const rejected = versionGuard && job.generation !== source.generation;
  if (!rejected) index = job;
  const indexAllows = !!index && index.acl === 'alpha';
  const authoritativeAllows = !source.deleted && source.acl === 'alpha';
  const visible = indexAllows && (!queryGuard || authoritativeAllows);
  return {
    source,
    index,
    rejected,
    visible,
    stale: visible && index!.generation !== source.generation,
    leak: visible && !authoritativeAllows,
  };
}
