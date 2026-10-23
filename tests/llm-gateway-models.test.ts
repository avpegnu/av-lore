import test from 'node:test';
import assert from 'node:assert/strict';
import { gatewayRoute, gatewayFailover, gatewayAccounting } from '../src/lib/llm-gateway-models';
test('route preferences never override region, privacy, tool and qualification gates', () => {
  assert.equal(gatewayRoute(false, true, true, true, true, false, true, 'cost').selected, 'C');
  assert.equal(gatewayRoute(false, true, true, true, false, false, true, 'latency').selected, 'B');
  assert.equal(gatewayRoute(true, true, true, true, false, false, true, 'cost').selected, 'C');
  assert.equal(
    gatewayRoute(false, true, true, true, true, true, true, 'cost').state,
    'NO_ELIGIBLE_ROUTE',
  );
  assert.equal(
    gatewayRoute(false, true, true, true, true, false, false, 'cost').state,
    'POLICY_VIOLATION',
  );
  assert.equal(gatewayRoute(false, true, false, false, true, false, true, 'cost').selected, 'D');
});
test('fallback respects output/effect boundaries, replay policy, Retry-After and remaining deadline', () => {
  assert.equal(gatewayFailover('rejected', 1500, 400, true).state, 'FALLBACK_SUCCEEDED');
  assert.equal(gatewayFailover('rate-limit', 1000, 400, true).state, 'DEADLINE_EXHAUSTED');
  assert.equal(gatewayFailover('rate-limit', 1500, 400, true).elapsed, 1050);
  assert.equal(gatewayFailover('unknown-timeout', 1500, 400, true).unknownPriorUsage, true);
  assert.equal(gatewayFailover('unknown-timeout', 1500, 400, false).attempts, 1);
  for (const s of ['partial-stream', 'tool-effect'] as const)
    assert.equal(gatewayFailover(s, 5000, 0, true).attempts, 1);
});
test('atomic reservations bound concurrent admission; local stale prechecks oversubscribe', () => {
  const a = gatewayAccounting(2, 4000, true, true, true, false, 'attempt');
  assert.equal(a.admitted, 1);
  assert.equal(a.held, 4000);
  assert.equal(a.posted, 2000);
  assert.equal(a.availableAfter, 4500);
  assert.equal(a.state, 'SETTLED_FIXTURE');
  const b = gatewayAccounting(2, 4000, false, true, true, false, 'attempt');
  assert.equal(b.oversubscribed, 1500);
  assert.equal(b.state, 'OVER_RESERVED');
  assert.equal(gatewayAccounting(3, 6000, true, false, false, false, 'attempt').admitted, 1);
});
test('deduplicate usage by attempt and retain unresolved usage instead of refunding disconnected work', () => {
  assert.equal(gatewayAccounting(2, 4000, true, true, true, false, 'request').posted, 1200);
  assert.equal(gatewayAccounting(2, 4000, true, true, true, false, 'off').posted, 3200);
  const a = gatewayAccounting(2, 4000, true, true, true, true, 'attempt');
  assert.equal(a.posted, 1200);
  assert.equal(a.unresolved, 2800);
  assert.equal(a.availableAfter, 2500);
  assert.equal(a.state, 'USAGE_PENDING');
});
