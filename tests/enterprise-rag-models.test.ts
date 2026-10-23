import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enterpriseRetrieval,
  enterpriseRevocation,
  enterpriseIndexCutover,
} from '../src/lib/enterprise-rag-models';
test('tenant scope remains enforced while filter placement changes per-user result coverage', () => {
  const pre = enterpriseRetrieval(2, 'eligible-first', false),
    post = enterpriseRetrieval(2, 'top-k-then-filter', false),
    none = enterpriseRetrieval(2, 'no-permission-filter', false);
  assert.deepEqual(
    pre.map((r) => r.leaked),
    [0, 0, 0],
  );
  assert.deepEqual(
    pre.map((r) => r.recall),
    [1, 1, 1],
  );
  assert.equal(post[0].shown.length, 0);
  assert.equal(post[0].recall, 0);
  assert.ok(none[0].leaked > 0);
  for (const list of [pre, post, none])
    for (const r of list) assert.ok(r.shown.every((d) => d.tenant === 'alpha'));
});
test('filtering eligible candidates does not fix a missing relevant ANN candidate or make recall universal', () => {
  const miss = enterpriseRetrieval(2, 'eligible-first', true);
  assert.equal(miss[0].recall, 0);
  assert.equal(miss[1].recall, 0.5);
  assert.equal(miss[1].leaked, 0);
});
test('current access must be checked before external processing, not only before answer delivery', () => {
  const blocked = enterpriseRevocation('before-rerank', true, true, true);
  assert.equal(blocked.state, 'BLOCKED_AT_RERANKER');
  assert.equal(blocked.upstreamDisclosure, false);
  const tooLate = enterpriseRevocation('before-rerank', false, false, true);
  assert.equal(tooLate.userDisclosure, false);
  assert.equal(tooLate.upstreamDisclosure, true);
  assert.equal(
    enterpriseRevocation('before-model', true, true, true).state,
    'BLOCKED_AT_GENERATOR',
  );
  const after = enterpriseRevocation('after-model', true, true, false);
  assert.equal(after.upstreamDisclosure, false);
  assert.equal(after.userDisclosure, true);
});
test('index migration requires complete backfill, a caught-up fixed watermark, compatible query space and eval evidence', () => {
  assert.equal(enterpriseIndexCutover(100, 110, true, true, false).state, 'NOT_READY');
  assert.equal(
    enterpriseIndexCutover(100, 120, true, true, false).state,
    'QUALIFIED_FIXTURE_CUTOVER',
  );
  assert.equal(enterpriseIndexCutover(100, 120, false, true, true).state, 'QUERY_SPACE_MISMATCH');
  assert.equal(enterpriseIndexCutover(80, 110, true, true, true).state, 'FORCED_WITH_GAPS');
  assert.equal(enterpriseIndexCutover(100, 120, true, false, false).activeIndex, 'production-E1');
});
