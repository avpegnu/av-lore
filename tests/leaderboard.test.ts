import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreReplay, shardedBoard, shardPlayers, boardOrder } from '../src/lib/leaderboard-models';
test('versioned absolute score projections ignore replayed and stale updates; rank policies preserve tie semantics', () => {
  for (let step = 0; step <= 6; step++)
    assert.equal(
      scoreReplay(step, true, 'ordinal').projectedC,
      scoreReplay(step, true, 'ordinal').sourceC,
    );
  assert.equal(scoreReplay(6, true, 'ordinal').projectedC, 150);
  assert.equal(scoreReplay(6, false, 'ordinal').projectedC, 190);
  assert.equal(scoreReplay(6, true, 'ordinal').skipped, 3);
  const ordinal = scoreReplay(0, true, 'ordinal').rows,
    competition = scoreReplay(0, true, 'competition').rows,
    dense = scoreReplay(0, true, 'dense').rows;
  assert.deepEqual(
    ordinal.map((p) => p.id),
    ['A', 'C', 'B', 'D', 'E', 'F'],
  );
  assert.deepEqual(
    competition.map((p) => p.rank),
    [1, 2, 2, 4, 5, 6],
  );
  assert.deepEqual(
    dense.map((p) => p.rank),
    [1, 2, 2, 3, 4, 5],
  );
  assert.throws(() => scoreReplay(7, true, 'ordinal'));
});
test('local top-K union yields global top-K under a frozen common order; rank adds tie-aware counts and histogram intervals contain true ranks', () => {
  for (let shards = 2; shards <= 5; shards++)
    for (let k = 1; k <= 6; k++)
      for (const target of shardPlayers) {
        const r = shardedBoard(shards, k, target.id),
          global = [...shardPlayers].sort(boardOrder);
        assert.deepEqual(r.top, global.slice(0, k));
        assert.equal(r.rank, r.actual);
        assert.ok(r.actual >= r.interval[0] && r.actual <= r.interval[1]);
        const partial = shardedBoard(shards, k, target.id, 0);
        assert.equal(partial.partial, true);
        assert.ok(partial.rank <= partial.actual);
        assert.ok(partial.candidateCount <= r.candidateCount);
      }
  assert.throws(() => shardedBoard(0, 1, 'P01'));
});
