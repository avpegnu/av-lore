import test from 'node:test';
import assert from 'node:assert/strict';
import { boardReadCut, type BoardChange } from '../src/lib/board-read-cut';
import { scoreReplay } from '../src/lib/leaderboard-models';
test('an authoritative higher-version correction may reduce a score; stale delta effects do not disappear', () => {
  const guarded = scoreReplay(7, true, 'ordinal', true),
    unsafe = scoreReplay(7, false, 'ordinal', true);
  assert.equal(guarded.projectedC, 100);
  assert.equal(guarded.sourceC, 100);
  assert.equal(guarded.frames.at(-1)!.skipped, false);
  assert.equal(unsafe.projectedC, 140);
  assert.equal(unsafe.sourceC, 100);
  assert.throws(() => scoreReplay(8, true, 'ordinal', true));
});
test('atomic rank and around reads share a state for every fixture target, change and radius', () => {
  for (const target of 'ABCDEF')
    for (const change of ['others-up', 'target-up', 'unchanged'] as BoardChange[])
      for (let radius = 0; radius <= 2; radius++) {
        const before = boardReadCut(target, radius, change, 'atomic-before'),
          after = boardReadCut(target, radius, change, 'atomic-after');
        assert.ok(before.compatibleBefore);
        assert.ok(after.compatibleAfter);
        assert.ok(before.containsTarget);
        assert.ok(after.containsTarget);
        assert.equal(after.rank, after.afterRank);
      }
});
test('rank/range interleaving can exclude the target; pinning a mutable generation does not freeze it', () => {
  const split = boardReadCut('B', 1, 'others-up', 'separate');
  assert.equal(split.rank, 3);
  assert.equal(split.afterRank, 5);
  assert.deepEqual(
    split.window.map((p) => p.id),
    ['F', 'A', 'C'],
  );
  assert.equal(split.containsTarget, false);
  assert.equal(split.compatibleBefore, false);
  assert.equal(split.compatibleAfter, false);
  assert.deepEqual(boardReadCut('B', 1, 'others-up', 'live-generation'), split);
  const stable = boardReadCut('B', 1, 'unchanged', 'separate');
  assert.ok(stable.compatibleBefore && stable.compatibleAfter && stable.containsTarget);
  assert.throws(() => boardReadCut('', 1, 'others-up', 'separate'));
  assert.throws(() => boardReadCut('B', 3, 'others-up', 'separate'));
});
