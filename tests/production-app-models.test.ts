import test from 'node:test';
import assert from 'node:assert/strict';
import {
  productionStream,
  responseCacheDecision,
  productionCacheCost,
} from '../src/lib/production-app-models';
test('fallback before visible content can replace attempts; heartbeat does not satisfy model-content deadline', () => {
  const a = productionStream('slow-first', 'stop', true, 0);
  assert.equal(a.state, 'COMPLETE');
  assert.equal(a.visible, 'Fallback answer');
  assert.equal(a.events.find((e) => e.code === 'FIRST_CONTENT_TIMEOUT')!.at, 3000);
  assert.equal(a.events.find((e) => e.code === 'CONTENT_DELTA')!.at, 3800);
  assert.equal(productionStream('before-content', 'stop', false, 0).state, 'NO_QUALIFIED_FALLBACK');
});
test('mid-stream retry needs an explicit output-generation boundary and cancellation keeps usage unresolved', () => {
  assert.equal(productionStream('mid-stream', 'stop', true, 0).state, 'PARTIAL_FAILURE');
  const r = productionStream('mid-stream', 'explicit-restart', true, 0);
  assert.equal(r.generation, 2);
  assert.equal(r.visible, 'Fallback answer');
  const bad = productionStream('mid-stream', 'unsafe-splice', true, 0);
  assert.equal(bad.state, 'SPLICED_ANSWER');
  assert.equal(bad.visible, 'Primary answerFallback answer');
  const c = productionStream('none', 'stop', true, 1500);
  assert.equal(c.state, 'CANCEL_REQUESTED');
  assert.equal(c.usage, 'UNCONFIRMED');
  assert.equal(c.visible, 'Primary answer');
});
test('response cache equality/similarity never supersedes tenant, dependency versions or current permissions', () => {
  assert.equal(responseCacheDecision('paraphrase', false, 0.9, true, true, true).served, false);
  assert.equal(
    responseCacheDecision('paraphrase', true, 0.9, true, true, true).outcome,
    'VALID_FIXTURE_HIT',
  );
  assert.equal(
    responseCacheDecision('different-intent', true, 0.9, true, true, true).outcome,
    'WRONG_INTENT_ANSWER',
  );
  assert.equal(responseCacheDecision('other-tenant', true, 0.9, false, true, true).served, false);
  assert.equal(
    responseCacheDecision('other-tenant', true, 0.9, false, true, false).outcome,
    'UNAUTHORIZED_DISCLOSURE',
  );
  assert.equal(responseCacheDecision('source-update', false, 0.9, true, true, true).served, false);
  assert.equal(
    responseCacheDecision('source-update', false, 0.9, true, false, true).outcome,
    'STALE_ANSWER',
  );
  assert.equal(
    responseCacheDecision('permission-revoked', false, 0.9, true, true, true).served,
    false,
  );
  assert.equal(
    responseCacheDecision('permission-revoked', false, 0.9, true, true, false).outcome,
    'UNAUTHORIZED_DISCLOSURE',
  );
});
test('conditional cache hits conserve request mass; prefix caching still generates outputs and false-hit cost remains visible', () => {
  const a = productionCacheCost(100000, 0.2, 0.1, 0.02, 0.6, 0.8);
  assert.ok(Math.abs(a.exact + a.semantic + a.calls - 100000) < 1e-8);
  assert.equal(a.exact, 20000);
  assert.equal(a.semantic, 8000);
  assert.equal(a.calls, 72000);
  assert.equal(a.wrongSemantic, 160);
  const b = productionCacheCost(100000, 0.2, 0.1, 0.02, 0.6, 0);
  assert.equal(a.outputCost, b.outputCost);
  assert.ok(a.total < b.total);
  assert.equal(a.outputTokens, 28800000);
  const all = productionCacheCost(100000, 1, 0.1, 0.02, 0.6, 0.8);
  assert.equal(all.total, 0);
  assert.equal(all.calls, 0);
});
