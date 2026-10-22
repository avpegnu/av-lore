import test from 'node:test';
import assert from 'node:assert/strict';
import { searchIndex, searchFanout, searchFreshness, judgedNdcg } from '../src/lib/search-models';
test('posting frequencies/positions and BM25 candidate ranking are inspectable; authorization before topK preserves eligible recall', () => {
  const before = searchIndex('CACHE redis', true, 0.75, true, 2),
    after = searchIndex('cache redis', true, 0.75, false, 2);
  assert.deepEqual(
    before.results.map((d) => d.id),
    ['d5', 'd1'],
  );
  assert.deepEqual(
    after.results.map((d) => d.id),
    ['d5'],
  );
  assert.equal(before.postings[0].rows.find((r) => r.id === 'd1')?.tf, 2);
  assert.deepEqual(before.postings[0].rows.find((r) => r.id === 'd1')?.positions, [0, 3]);
  assert.equal(searchIndex('missing', true, 0.75, true, 2).results.length, 0);
  assert.ok(searchIndex('cache queue', false, 0.75, true, 5).results.some((d) => d.id === 'd3'));
  assert.equal(searchIndex('cache queue', true, 0.75, true, 5).results.length, 0);
  assert.equal(searchIndex('redis redis', true, 0.75, true, 5).terms.length, 1);
});
test('fanout tail formula is an independence model and fixed trace hedging has explicit request cost/deadline completeness', () => {
  assert.ok(
    Math.abs(searchFanout(100, 1, false, 30, 200, false).anySlowProbability - (1 - 0.99 ** 100)) <
      1e-12,
  );
  const plain = searchFanout(64, 1, false, 30, 80, false),
    hedged = searchFanout(64, 1, true, 30, 80, false),
    partial = searchFanout(64, 1, false, 30, 80, true);
  assert.equal(plain.status, 'FAILED');
  assert.equal(plain.usable, 0);
  assert.equal(partial.status, 'PARTIAL');
  assert.equal(partial.usable, 3);
  assert.equal(hedged.status, 'COMPLETE');
  assert.equal(hedged.duration, 75);
  assert.equal(hedged.extraRequests, 3);
  assert.equal(searchFanout(64, 1, true, 100, 80, false).extraRequests, 0);
  assert.equal(searchFanout(64, 1, true, 80, 80, false).status, 'FAILED');
});
test('versioned delete visibility changes at refresh and physical merge reclamation does not discard resurrection guards', () => {
  assert.equal(searchFreshness(1, true).searchable, true);
  assert.equal(searchFreshness(2, true).searchable, false);
  assert.equal(searchFreshness(2, true).physicalBodyCopies, 1);
  assert.equal(searchFreshness(4, false).searchable, true);
  assert.equal(searchFreshness(4, true).searchable, false);
  assert.equal(searchFreshness(5, true).physicalBodyCopies, 0);
  assert.equal(searchFreshness(5, true).retainedVersionGuard, 2);
});
test('NDCG ideal comes from judged corpus rather than only returned hits and zero-gain queries have declared undefined behavior', () => {
  const judgments = { excellent: 3, okay: 1, bad: 0 };
  assert.equal(judgedNdcg(['excellent', 'okay'], judgments, 2), 1);
  assert.ok(judgedNdcg(['okay'], judgments, 2)! < 1);
  assert.equal(judgedNdcg(['bad'], { bad: 0 }, 1), null);
});
