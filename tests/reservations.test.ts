import test from 'node:test';
import assert from 'node:assert/strict';
import { nightReservation, holdExpiry } from '../src/lib/reservation-models';
test('atomic multi-night acquisition has neither oversell nor partial allocation while naive schedules exhibit both faults', () => {
  for (const scenario of ['race', 'partial'] as const) {
    const safe = nightReservation(scenario, true);
    assert.equal(safe.oversold, false);
    assert.equal(safe.partialLeak, 0);
    assert.ok(safe.available.every((n) => n >= 0));
  }
  assert.equal(nightReservation('race', true).booked, 1);
  assert.equal(nightReservation('race', false).booked, 2);
  assert.equal(nightReservation('race', false).oversold, true);
  assert.deepEqual(nightReservation('partial', true).available, [1, 0]);
  assert.equal(nightReservation('partial', false).partialLeak, 1);
});
test('expired entitlements cannot revive after reallocation; early verified confirmation defeats release and late captures require payment recovery', () => {
  for (let time = 0; time <= 20; time++)
    for (const onTime of [false, true]) {
      const r = holdExpiry(time, onTime, true);
      assert.equal(r.overbooked, false);
      assert.equal(r.available, r.derivedAvailable);
      assert.ok(r.available >= 0 && r.confirmed + r.held <= 1);
    }
  const late = holdExpiry(16, false, true);
  assert.equal(late.a, 'EXPIRED');
  assert.equal(late.b, 'CONFIRMED');
  assert.equal(late.recovery, true);
  assert.equal(late.captured, true);
  assert.equal(holdExpiry(16, false, false).overbooked, true);
  assert.equal(holdExpiry(16, true, true).b, 'SOLD_OUT');
  assert.equal(holdExpiry(10, false, true).a, 'HELD');
  assert.equal(holdExpiry(10, false, true).eligibleHold, false);
  assert.equal(holdExpiry(8, true, true).localPayment, 'UNKNOWN');
  assert.throws(() => holdExpiry(21, false, true));
});
