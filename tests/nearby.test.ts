import test from 'node:test';
import assert from 'node:assert/strict';
import { nearbyFanout, nearbyPeople, nearbyView, nearbyRecovery } from '../src/lib/nearby-models';
test('gateway multiplexing reduces broker copies without eliminating local audience/device fanout', () => {
  const r = nearbyFanout(40, 1, 8, 30);
  assert.equal(r.connections, 40);
  assert.equal(r.used, 8);
  assert.equal(r.logicalPerSecond / r.brokerPerSecond, 5);
  assert.equal(nearbyFanout(40, 1, 8, 60).logicalPerSecond, r.logicalPerSecond / 2);
  assert.equal(nearbyFanout(40, 3, 8, 30).logicalPerSecond, r.logicalPerSecond * 3);
  for (let friends = 1; friends <= 100; friends++)
    for (let devices = 1; devices <= 3; devices++) {
      const n = nearbyFanout(friends, devices, 8, 30);
      assert.equal(n.used, new Set(n.placement).size);
      assert.ok(n.used <= n.connections);
      assert.equal(n.placement.length, friends * devices);
    }
  assert.throws(() => nearbyFanout(0, 1, 8, 30));
});
test('viewer movement recomputes existing authorized candidate distances and never includes strangers or hidden friends', () => {
  assert.deepEqual(
    nearbyView(2, 2, true).shown.map((p) => p.id),
    ['A'],
  );
  const stale = nearbyView(7, 2, false);
  assert.deepEqual(
    stale.missed.map((p) => p.id),
    ['B'],
  );
  assert.deepEqual(
    stale.falseNear.map((p) => p.id),
    ['A'],
  );
  for (let x = 1; x <= 9; x += 0.5)
    for (let radius = 1; radius <= 4; radius += 0.5) {
      const r = nearbyView(x, radius, true);
      assert.equal(r.missed.length, 0);
      assert.equal(r.falseNear.length, 0);
      assert.ok(r.shown.every((p) => p.friend && p.sharing));
      assert.equal(
        r.trueNear.length,
        nearbyPeople.filter((p) => p.friend && p.sharing && Math.hypot(p.x - x, p.y - 5) <= radius)
          .length,
      );
    }
  assert.throws(() => nearbyView(0, 2, true));
});
test('policy epochs prevent delayed disclosures while explicit expiry bounds stale display after a lost removal notice', () => {
  const revoked = nearbyRecovery(20, true, true);
  assert.equal(revoked.enabled, false);
  assert.equal(revoked.visible, true);
  assert.equal(revoked.leaks, 0);
  assert.equal(revoked.blocked, 1);
  assert.equal(nearbyRecovery(30, true, true).visible, false);
  const safe = nearbyRecovery(80, true, true);
  assert.equal(safe.visible, false);
  assert.equal(safe.leaks, 0);
  assert.equal(safe.regressions, 0);
  assert.equal(safe.blocked, 3);
  assert.equal(safe.displayed?.seq, 1);
  assert.equal(safe.displayed?.epoch, 6);
  const unsafe = nearbyRecovery(80, false, false);
  assert.equal(unsafe.leaks, 2);
  assert.equal(unsafe.regressions, 1);
  assert.equal(unsafe.visible, true);
  assert.equal(nearbyRecovery(80, true, false).visible, true);
  for (let t = 0; t <= 80; t++) {
    const r = nearbyRecovery(t, true, true);
    assert.equal(r.leaks, 0);
    assert.equal(r.regressions, 0);
    if (r.visible) assert.ok(t < r.displayed!.expiresAt);
  }
  assert.throws(() => nearbyRecovery(81, true, true));
});
