import test from 'node:test';
import assert from 'node:assert/strict';
import { refundReservations } from '../src/lib/refund-reservations';
import { reconcileCaptures, reconciliationFixture } from '../src/lib/payment-reconciliation';
test('atomic refund admission conserves confirmed plus active reservations through unknown/success/failure evidence', () => {
  for (let a = 1000; a <= 10000; a += 1000)
    for (let b = 1000; b <= 10000; b += 1000)
      for (let phase = 0; phase <= 3; phase++)
        for (const e of ['unknown', 'confirmed', 'failed'] as const) {
          const r = refundReservations(a, b, phase, true, e);
          assert.ok(r.available >= 0);
          assert.equal(r.confirmed + r.reservedA + r.reservedB + r.available, 10000);
          assert.equal(r.overbooked, 0);
        }
  const pending = refundReservations(7000, 7000, 3, true, 'unknown');
  assert.equal(pending.reservedA, 7000);
  assert.equal(pending.statusB, 'rejected');
  assert.equal(pending.available, 3000);
  assert.equal(refundReservations(7000, 3000, 3, true, 'confirmed').available, 0);
  assert.equal(refundReservations(7000, 3000, 3, true, 'failed').available, 7000);
  const stale = refundReservations(7000, 7000, 2, false, 'unknown');
  assert.equal(stale.overbooked, 4000);
  assert.equal(stale.available, -4000);
  assert.throws(() => refundReservations(0, 7000, 2, true, 'unknown'), RangeError);
});
test('reconciliation checks gross against gross and validates fee/net separately, without treating fees as missing captured money', () => {
  const clean = reconciliationFixture('clean');
  assert.ok(
    reconcileCaptures(clean.internal, clean.report, 3).every((r) => r.status === 'matched'),
  );
  assert.notEqual(clean.internal[0].gross, clean.report[0].net);
  for (const [kind, status] of [
    ['amount', 'amount-mismatch'],
    ['net', 'net-mismatch'],
    ['currency', 'currency-mismatch'],
    ['duplicate', 'ambiguous-duplicate'],
  ] as const) {
    const f = reconciliationFixture(kind);
    assert.equal(reconcileCaptures(f.internal, f.report, 3)[0].status, status);
  }
  const changed = reconciliationFixture('clean');
  assert.throws(
    () => reconcileCaptures(changed.internal, [{ ...changed.report[0], gross: 10.5 }], 3),
    RangeError,
  );
});
test('reconciliation preserves duplicate evidence and account scope, and ages missing reports without inventing settlement', () => {
  const missing = reconciliationFixture('missing-external');
  assert.equal(reconcileCaptures(missing.internal, missing.report, 1)[0].status, 'timing-open');
  assert.equal(
    reconcileCaptures(missing.internal, missing.report, 3)[0].status,
    'missing-external',
  );
  const account = reconciliationFixture('account'),
    rows = reconcileCaptures(account.internal, account.report, 3);
  assert.equal(rows.length, 3);
  assert.ok(rows.some((r) => r.status === 'missing-internal' && r.account === 'acct-B'));
  assert.ok(rows.some((r) => r.status === 'missing-external' && r.account === 'acct-A'));
  const duplicate = reconciliationFixture('duplicate'),
    ambiguous = reconcileCaptures(duplicate.internal, duplicate.report, 3)[0];
  assert.equal(ambiguous.report.length, 2);
  assert.equal(ambiguous.owner, 'Payments Ops');
  assert.equal(
    reconcileCaptures(duplicate.internal, [], 0).every((r) => r.status === 'timing-open'),
    true,
  );
});
