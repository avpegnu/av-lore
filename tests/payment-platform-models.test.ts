import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  merchantInbox,
  migrationCutover,
  processorEvidence,
} from '../src/lib/payment-platform-models';
test('processor histories distinguish stale absence, terminal fenced absence and delayed execution', () => {
  for (const outcome of ['accepted', 'absent', 'delayed'] as const) {
    assert.equal(processorEvidence(3, outcome, false).observed, 'STALE_NOT_FOUND');
    assert.equal(processorEvidence(3, outcome, false).b, 0);
    assert.equal(processorEvidence(5, outcome, false).holds, 1);
    assert.equal(processorEvidence(5, outcome, false).duplicateHolds, 0);
  }
  assert.equal(processorEvidence(4, 'delayed', false).state, 'UNKNOWN');
  assert.equal(processorEvidence(4, 'absent', false).absentProof, true);
  assert.equal(processorEvidence(4, 'absent', false).b, 1);
  assert.equal(processorEvidence(3, 'accepted', true).state, 'B_ACCEPTED_A_UNKNOWN');
  assert.equal(processorEvidence(5, 'accepted', true).state, 'CONFLICT');
  assert.equal(processorEvidence(5, 'delayed', true).holds, 2);
  assert.equal(processorEvidence(5, 'absent', true).holds, 1);
});
test('inbox identity, trusted admission and business idempotence address different failures', () => {
  const safe = merchantInbox(7, true, true, true);
  assert.equal(safe.fulfillments, 1);
  assert.equal(safe.state, 'succeeded');
  assert.equal(safe.unsafeAccepted, 0);
  assert.equal(safe.rows[1].result, 'INBOX_DUPLICATE');
  assert.equal(safe.rows[2].result, 'BUSINESS_NOOP');
  assert.equal(safe.rows[4].result, 'BAD_SIGNATURE');
  assert.equal(safe.rows[5].result, 'STALE_DELIVERY');
  assert.equal(safe.rows[6].result, 'WRONG_CONTEXT');
  assert.equal(merchantInbox(3, true, true, false).state, 'processing');
  assert.equal(merchantInbox(4, true, true, false).fulfillments, 2);
  assert.equal(merchantInbox(2, true, false, false).fulfillments, 2);
  assert.equal(merchantInbox(7, false, true, true).unsafeAccepted, 3);
  assert.equal(merchantInbox(7, true, false, true).fulfillments, 1);
});
test('backfill version checks, cutover readiness and sink fences are independent migration obligations', () => {
  assert.equal(migrationCutover(4, false, false, true).readMinor, 1000);
  assert.equal(migrationCutover(4, false, false, true).premature, true);
  assert.equal(migrationCutover(4, false, true, true).cutover, false);
  assert.equal(migrationCutover(4, false, true, true).readMinor, 2500);
  assert.equal(migrationCutover(4, true, true, true).readMinor, 2500);
  assert.equal(migrationCutover(5, false, true, true).cutover, true);
  assert.equal(migrationCutover(6, true, true, true).staleWrite, 'FENCED');
  assert.equal(migrationCutover(6, true, true, false).staleWrite, 'ACCEPTED_OLD_OWNER');
  assert.equal(migrationCutover(6, true, true, false).diverged, true);
  assert.equal(migrationCutover(6, true, true, true).diverged, false);
  for (const guard of [true, false])
    for (const ready of [true, false]) {
      const fixed = migrationCutover(6, guard, ready, true);
      assert.equal(fixed.readMinor, 2500);
      assert.equal(fixed.epoch, 2);
    }
});
