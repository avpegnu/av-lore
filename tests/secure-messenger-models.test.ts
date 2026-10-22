import test from 'node:test';
import assert from 'node:assert/strict';
import {
  messengerFanout,
  deviceDelivery,
  groupKeyBoundary,
} from '../src/lib/secure-messenger-models';
test('sender-key arithmetic separates distribution, payloads and persistent recipient fan-out', () => {
  const stable = messengerFanout(100, 2, 5, 20, 0);
  assert.equal(stable.pairwiseDataEnvelopes, 19900);
  assert.equal(stable.keyEnvelopes, 995);
  assert.equal(stable.payloadEncryptions, 100);
  assert.equal(stable.senderKeyUploads, 1095);
  assert.equal(stable.dataDeliveries, 19900);
  assert.equal(messengerFanout(100, 2, 5, 1, 0).senderKeyUploads, 1000);
  assert.equal(messengerFanout(100, 2, 5, 1, 0).pairwiseDataEnvelopes, 995);
  const churn = messengerFanout(10, 2, 8, 3, 5);
  assert.equal(churn.leaves, 2);
  assert.equal(churn.epochs.length, 3);
  assert.equal(churn.active, 8);
  assert.equal(churn.epochs.at(-1)?.members, 8);
});
test('device receipt: persistence, per-device obligations and dedup guard independent failures', () => {
  const safe = deviceDelivery(5, true, true, true);
  assert.equal(safe.d1, 1);
  assert.equal(safe.d2, 1);
  assert.equal(safe.queued.length, 0);
  assert.equal(safe.d1Lost, false);
  assert.equal(safe.d2Lost, false);
  assert.equal(deviceDelivery(3, false, true, true).d1Lost, true);
  assert.equal(deviceDelivery(5, true, false, true).d2Lost, true);
  assert.equal(deviceDelivery(5, true, true, false).duplicates, 1);
  assert.deepEqual(deviceDelivery(2, true, true, true).queued, ['D2']);
});
test('group key membership: fresh epochs do not retract old knowledge or distribute keys magically', () => {
  const fresh = groupKeyBoundary(4, true, true, true);
  assert.equal(fresh.status, 'SENT');
  assert.equal(fresh.formerMemberHasFutureKey, false);
  assert.equal(fresh.formerMemberRetainsPastHistory, true);
  assert.equal(fresh.newMemberHasFutureKey, true);
  assert.equal(fresh.newMemberReceivedPastHistory, false);
  assert.equal(groupKeyBoundary(4, false, true, true).status, 'REJECT_STALE_EPOCH');
  assert.equal(groupKeyBoundary(4, false, true, false).formerMemberHasFutureKey, true);
  assert.equal(groupKeyBoundary(4, true, false, true).newMemberHasFutureKey, false);
});
