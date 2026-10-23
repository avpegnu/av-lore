import { test } from 'node:test';
import assert from 'node:assert/strict';
import { propertyHistory, canvasRecovery, metadataRefill } from '../src/lib/design-canvas-models';
test('property merge preserves unrelated changes and only matching ACK clears latest pending edit', () => {
  const pending = propertyHistory(4, false, true);
  assert.equal(pending.clients.A.x, 160);
  assert.equal(pending.pending.A.x, 'A2');
  assert.equal(propertyHistory(4, false, false).clients.A.x, 80);
  for (const whole of [true, false])
    for (const guard of [true, false]) {
      const s = propertyHistory(6, whole, guard);
      assert.equal(s.converged, true);
      assert.equal(s.server.fill, whole ? 'gray' : 'blue');
      assert.equal(s.lostIndependentFill, whole);
      if (guard) assert.equal(s.rollbacks, 0);
      else assert.ok(s.rollbacks > 0);
    }
});
test('snapshot recovery distinguishes accepted, durable, contiguous and acknowledged prefixes', () => {
  const s = canvasRecovery(5, false, true, true);
  assert.deepEqual(s.state, { x: 50, fill: 'blue' });
  assert.deepEqual(s.unrecoveredAcked, []);
  assert.equal(s.volatileAccepted, 1);
  assert.deepEqual(canvasRecovery(5, false, true, false).unrecoveredAcked, [6]);
  const gap = canvasRecovery(5, true, true, true);
  assert.equal(gap.recoveredThrough, 3);
  assert.equal(gap.safeToServe, false);
  assert.deepEqual(gap.unrecoveredAcked, [4, 5]);
  const unsafe = canvasRecovery(5, true, false, true);
  assert.equal(unsafe.recoveredThrough, 5);
  assert.equal(unsafe.state.fill, 'gray');
  assert.deepEqual(unsafe.unrecoveredAcked, [4]);
  assert.equal(unsafe.safeToServe, false);
  assert.throws(() => canvasRecovery(2, false, true, true), RangeError);
});
test('invalidation generations reject stale inflight fills; a verified barrier catches missing invalidations', () => {
  assert.equal(metadataRefill(3, true, false, false).visible, 'WAIT');
  assert.equal(metadataRefill(4, true, false, false).visible, 'CURRENT');
  assert.equal(metadataRefill(4, false, false, false).visible, 'STALE');
  assert.equal(metadataRefill(4, true, true, false).visible, 'STALE');
  assert.equal(metadataRefill(3, true, true, true).visible, 'WAIT');
  assert.equal(metadataRefill(4, true, true, true).visible, 'CURRENT');
  assert.equal(metadataRefill(0, true, false, true).visible, 'WAIT');
});
