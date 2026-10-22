import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentRetry, paymentLedger } from '../src/lib/payment-models';
test('ambiguous payments remain unknown without a usable reference, and provider/key scopes bound retry deduplication', () => {
  assert.equal(paymentRetry(3, 'query-reference', true, true).clientState, 'UNKNOWN');
  assert.equal(paymentRetry(3, 'query-reference', true, true).providerCaptures, 1);
  assert.equal(paymentRetry(4, 'query-reference', false, true).clientState, 'UNKNOWN');
  assert.equal(paymentRetry(4, 'query-reference', false, true).providerCaptures, 1);
  assert.equal(paymentRetry(4, 'query-reference', true, false).providerQueries, 1);
  assert.equal(paymentRetry(4, 'same-key', true, true).providerCaptures, 1);
  assert.equal(paymentRetry(4, 'same-key', true, false).providerCaptures, 2);
  assert.equal(paymentRetry(4, 'new-provider', true, true).providerCaptures, 2);
  assert.equal(paymentRetry(4, 'new-provider', true, true).clientState, 'UNKNOWN');
  assert.equal(paymentRetry(4, 'same-key', true, false).resolved, false);
  assert.throws(() => paymentRetry(5, 'same-key', true, true));
});
test('balanced journal duplicates still misstate assets, while financial-operation identity conserves source money', () => {
  for (let step = 0; step <= 6; step++)
    for (let refund = 0; refund <= 5000; refund += 1000) {
      const safe = paymentLedger(step, true, refund),
        unsafe = paymentLedger(step, false, refund);
      for (const r of [safe, unsafe]) {
        assert.equal(r.debits, r.credits);
        assert.equal(r.receivable, r.seller + r.revenue);
        assert.ok(
          r.rows.every((e) => e.postings.reduce((s, p) => s + p.debit - p.credit, 0) === 0),
        );
      }
      assert.equal(safe.mismatch, 0);
      assert.ok(safe.actualReceivable >= 0);
      if (step >= 2) assert.notEqual(unsafe.mismatch, 0);
    }
  assert.equal(paymentLedger(6, true, 3000).receivable, 4000);
  assert.equal(paymentLedger(6, true, 3000).duplicates, 3);
  assert.equal(paymentLedger(6, false, 3000).receivable, 21000);
  assert.throws(() => paymentLedger(6, true, 6000));
});
