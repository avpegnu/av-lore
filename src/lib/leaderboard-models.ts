export type BoardPlayer = { id: string; score: number; version?: number };
export type RankPolicy = 'ordinal' | 'competition' | 'dense';
// Fixture IDs are ASCII. Descending score then descending member bytes matches REV ties.
export function boardOrder(a: BoardPlayer, b: BoardPlayer) {
  return b.score - a.score || (a.id === b.id ? 0 : a.id > b.id ? -1 : 1);
}
const initial: BoardPlayer[] = [120, 110, 110, 90, 80, 60].map((score, i) => ({
  id: String.fromCharCode(65 + i),
  score,
  version: 0,
}));
const updates = [
  { id: 'C', version: 1, total: 130, delta: 20 },
  { id: 'C', version: 1, total: 130, delta: 20 },
  { id: 'C', version: 0, total: 110, delta: 0 },
  { id: 'A', version: 1, total: 140, delta: 20 },
  { id: 'C', version: 2, total: 150, delta: 20 },
  { id: 'C', version: 1, total: 130, delta: 20 },
];
export function scoreReplay(steps: number, guarded: boolean, policy: RankPolicy) {
  if (!Number.isInteger(steps) || steps < 0 || steps > 6)
    throw new RangeError('Invalid score replay');
  const current = new Map(initial.map((p) => [p.id, { ...p }])),
    truth = new Map(initial.map((p) => [p.id, { ...p }]));
  let skipped = 0;
  const frames = updates.slice(0, steps).map((e) => {
    const actual = truth.get(e.id)!;
    if (e.version > actual.version!) Object.assign(actual, { score: e.total, version: e.version });
    const player = current.get(e.id)!,
      skip = guarded && e.version <= player.version!;
    if (skip) skipped++;
    else
      Object.assign(player, {
        score: guarded ? e.total : player.score + e.delta,
        version: Math.max(player.version!, e.version),
      });
    return { ...e, skipped: skip };
  });
  const sorted = [...current.values()].sort(boardOrder),
    unique = [...new Set(sorted.map((p) => p.score))];
  const rows = sorted.map((p, index) => ({
    ...p,
    ordinal: index + 1,
    rank:
      policy === 'ordinal'
        ? index + 1
        : policy === 'competition'
          ? sorted.findIndex((s) => s.score === p.score) + 1
          : unique.indexOf(p.score) + 1,
  }));
  return {
    rows,
    frames,
    skipped,
    projectedC: current.get('C')!.score,
    sourceC: truth.get('C')!.score,
  };
}
export const shardPlayers: BoardPlayer[] = Array.from({ length: 24 }, (_, i) => ({
  id: 'P' + String(i + 1).padStart(2, '0'),
  score: Math.floor(((i * 37) % 101) / 10) * 10,
}));
export function shardedBoard(shards: number, k: number, target: string, missing = -1) {
  if (
    !Number.isInteger(shards) ||
    shards < 2 ||
    shards > 5 ||
    !Number.isInteger(k) ||
    k < 1 ||
    k > 6 ||
    !Number.isInteger(missing) ||
    missing < -1 ||
    missing >= shards
  )
    throw new RangeError('Invalid shard fixture');
  const selected = shardPlayers.find((p) => p.id === target);
  if (!selected) throw new RangeError('Unknown fixture player');
  const partitions = Array.from({ length: shards }, (_, s) =>
    shardPlayers.filter((_, i) => i % shards === s).sort(boardOrder),
  );
  const sets = partitions.map((players, index) => ({
    index,
    players,
    available: index !== missing,
    top: players.slice(0, k),
    ahead: players.filter((p) => boardOrder(p, selected) < 0).length,
  }));
  const available = sets.filter((s) => s.available),
    candidates = available.flatMap((s) => s.top),
    top = candidates.sort(boardOrder).slice(0, k);
  const rank = 1 + available.reduce((sum, s) => sum + s.ahead, 0),
    actual = [...shardPlayers].sort(boardOrder).findIndex((p) => p.id === target) + 1;
  const lower = Math.floor(selected.score / 25) * 25,
    upper = lower + 25,
    interval = [
      shardPlayers.filter((p) => p.score >= upper).length + 1,
      shardPlayers.filter((p) => p.score >= lower).length,
    ];
  return {
    sets,
    top,
    rank,
    actual,
    partial: missing !== -1,
    candidateCount: candidates.length,
    interval,
  };
}
