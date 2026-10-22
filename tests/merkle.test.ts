import test from 'node:test';
import assert from 'node:assert/strict';
import { merkleComparison } from '../src/lib/merkle-model';
test('bounded Merkle traversal locates exactly the changed keys for all 256 subsets, pruning matching ranges', () => {
  for (let mask = 0; mask < 256; mask++) {
    const changed = Array.from({ length: 8 }, (_, i) => i).filter((i) => mask & (1 << i)),
      r = merkleComparison(changed);
    assert.deepEqual(r.different, changed);
    assert.equal(r.equal, mask === 0);
    assert.ok(r.comparisons.length <= 15);
    assert.equal(r.levels.flat().length, 15);
    for (const p of r.comparisons.filter((p) => p.equal))
      assert.ok(!r.comparisons.some((c) => c !== p && c.start >= p.start && c.end <= p.end));
  }
  assert.equal(merkleComparison([]).comparisons.length, 1);
  assert.equal(merkleComparison([0, 1, 2, 3, 4, 5, 6, 7]).comparisons.length, 15);
  assert.throws(() => merkleComparison([8]));
});
