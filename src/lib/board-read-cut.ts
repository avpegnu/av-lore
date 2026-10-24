import { boardOrder, type BoardPlayer } from './leaderboard-models';
export type BoardChange = 'others-up' | 'target-up' | 'unchanged';
export type BoardReadMode = 'separate' | 'live-generation' | 'atomic-before' | 'atomic-after';
// Independent six-player fixture. All changes occur in one atomic transition between two states.
export function boardReadCut(
  target: string,
  radius: number,
  change: BoardChange,
  mode: BoardReadMode,
) {
  if (
    !'ABCDEF'.includes(target) ||
    target.length !== 1 ||
    !Number.isInteger(radius) ||
    radius < 0 ||
    radius > 2 ||
    !['others-up', 'target-up', 'unchanged'].includes(change) ||
    !['separate', 'live-generation', 'atomic-before', 'atomic-after'].includes(mode)
  )
    throw new RangeError('Invalid board read fixture');
  const before: BoardPlayer[] = [120, 110, 110, 90, 80, 60]
    .map((score, i) => ({ id: String.fromCharCode(65 + i), score }))
    .sort(boardOrder);
  const after = before.map((p) => ({ ...p }));
  if (change === 'target-up') after.find((p) => p.id === target)!.score += 100;
  if (change === 'others-up') {
    const movers = before
      .filter((p) => p.id !== target)
      .slice(-2)
      .map((p) => p.id);
    for (const p of after) if (movers.includes(p.id)) p.score += 300;
  }
  after.sort(boardOrder);
  const index = (rows: BoardPlayer[]) => rows.findIndex((p) => p.id === target);
  const around = (rows: BoardPlayer[], at: number) =>
    rows.slice(Math.max(0, at - radius), at + radius + 1);
  const rankRows = mode === 'atomic-after' ? after : before;
  const windowRows = mode === 'atomic-before' ? before : after;
  const at = index(rankRows),
    window = around(windowRows, at);
  const compatible = (rows: BoardPlayer[]) =>
    at === index(rows) && JSON.stringify(window) === JSON.stringify(around(rows, index(rows)));
  return {
    before,
    after,
    rank: at + 1,
    afterRank: index(after) + 1,
    window,
    containsTarget: window.some((p) => p.id === target),
    compatibleBefore: compatible(before),
    compatibleAfter: compatible(after),
    rankCut: mode === 'atomic-after' ? 'after' : 'before',
    windowCut: mode === 'atomic-before' ? 'before' : 'after',
  };
}
