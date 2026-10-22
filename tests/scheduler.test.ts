import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduledLease, schedulerCatchup, schedulerDst } from '../src/lib/scheduler-models';
test('lease ownership and stale completion fencing do not themselves fence external effects; highest-seen tokens require sink activation', () => {
  assert.equal(scheduledLease(4, 'none', false).charged, 80);
  assert.equal(scheduledLease(4, 'fence-only', false).charged, 80);
  assert.equal(scheduledLease(4, 'fence-only', true).charged, 40);
  for (const first of [false, true]) {
    assert.equal(scheduledLease(4, 'idempotent', first).charged, 40);
    assert.equal(scheduledLease(4, 'authority-and-idempotent', first).charged, 40);
    assert.equal(scheduledLease(5, 'none', first).oldCompletion, 'REJECTED_STALE_ATTEMPT');
  }
  assert.equal(scheduledLease(3, 'authority-and-idempotent', false).charged, 0);
  assert.equal(scheduledLease(2, 'fence-only', false).highest, 0);
});
test('recovery considers missed buckets and deadlines before coalescing; deferred work must not be lost by cursor advancement', () => {
  const all = schedulerCatchup(45, 20, 'all', 1);
  assert.deepEqual(
    all.admitted.map((r) => r.minute),
    [30],
  );
  assert.deepEqual(
    all.deferred.map((r) => r.minute),
    [40],
  );
  assert.equal(all.safeCursor, 30);
  assert.deepEqual(
    schedulerCatchup(45, 20, 'latest', 5).admitted.map((r) => r.minute),
    [40],
  );
  assert.equal(schedulerCatchup(45, 20, 'skip', 5).admitted.length, 0);
  for (let now = 30; now <= 90; now++)
    for (const policy of ['all', 'latest', 'skip'] as const) {
      const r = schedulerCatchup(now, 20, policy, 2);
      assert.ok(r.admitted.every((x) => now - x.minute <= 20));
      assert.ok(r.admitted.length <= 2);
      assert.ok(r.deferred.every((x) => x.minute > r.safeCursor));
    }
});
test('fixed DST gap/fold fixture has stable distinct UTC occurrences and declared next-valid gap policy', () => {
  const gap = schedulerDst('skip', 'first'),
    both = schedulerDst('next-valid', 'both');
  assert.equal(gap.spring.length, 0);
  assert.equal(both.spring[0].local, '03:00 -04:00');
  assert.equal(both.fall.length, 2);
  assert.notEqual(both.fall[0].id, both.fall[1].id);
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  assert.equal(format.format(new Date(both.spring[0].utc)), '03:00');
  for (const x of both.fall) assert.equal(format.format(new Date(x.utc)), '01:30');
  assert.equal(Date.parse(both.fall[1].utc) - Date.parse(both.fall[0].utc), 3600000);
});
