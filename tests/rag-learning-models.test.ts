import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reciprocalRanks,
  ragCandidates,
  ragIvf,
  ragMemory,
  ragPublish,
} from '../src/lib/rag-learning-models';
test('rank fusion deduplicates within retrievers and preserves candidate ceilings', () => {
  const a = reciprocalRanks([['A', 'A', 'B'], ['B']], 60);
  assert.equal(a[0].id, 'B');
  assert.ok(Math.abs(a[0].score - (1 / 62 + 1 / 61)) < 1e-12);
  const hybrid = ragCandidates(3, 60, 'hybrid', true, true);
  assert.deepEqual(
    hybrid.top.map((x) => x.id),
    ['OPS', 'RECOVERY'],
  );
  assert.equal(hybrid.recall, 1);
  assert.equal(ragCandidates(3, 60, 'hybrid', false, true).recall, 0.5);
  assert.equal(ragCandidates(3, 60, 'lexical', true, true).candidateRecall, 0.5);
  assert.equal(ragCandidates(3, 60, 'lexical', true, true).recall, 0.5);
  assert.equal(ragCandidates(1, 60, 'hybrid', true, false).top.length, 0);
  assert.equal(ragCandidates(1, 60, 'hybrid', true, true).top.length, 2);
});
test('IVF probes real fixed points; all cells recover exact top4 and scan counts include centroids', () => {
  for (const q of [
    [30, 22],
    [22, 22],
    [40, 40],
  ]) {
    let prior = 0;
    for (let n = 1; n <= 6; n++) {
      const r = ragIvf(n, q[0], q[1]);
      assert.equal(r.scanned, n * 8);
      assert.equal(r.distanceEvaluations, n * 8 + 6);
      assert.ok(r.recall >= prior);
      prior = r.recall;
    }
    assert.equal(ragIvf(6, q[0], q[1]).recall, 1);
  }
  assert.ok(ragIvf(1, 30, 22).recall < 1);
});
test('index memory includes IDs and separates codebooks from vector payload', () => {
  const x = ragMemory(1e6, 768, 96, 8);
  assert.equal(x.flatBytes, 3_080_000_000);
  assert.equal(x.pqPayloadBytes, 104_000_000);
  assert.equal(x.pqCodebookBytes, 786432);
  assert.throws(() => ragMemory(1e6, 768, 100, 8));
});
test('publication generation guards prevent resurrection while final auth blocks deleted/revoked output', () => {
  assert.equal(ragPublish(true, true, false, false).index, null);
  assert.equal(ragPublish(true, false, false, false).leak, true);
  assert.equal(ragPublish(true, false, true, false).visible, false);
  assert.equal(ragPublish(false, false, false, false).stale, true);
  assert.equal(ragPublish(false, true, true, false).stale, false);
  assert.equal(ragPublish(false, true, false, true).leak, true);
  assert.equal(ragPublish(false, true, true, true).visible, false);
});
