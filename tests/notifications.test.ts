import test from 'node:test';
import assert from 'node:assert/strict';
import {
  notificationCrash,
  notificationPipeline,
  type NotificationConfig,
} from '../src/lib/notification-models';
test('unknown external outcomes expose the at-least-once/at-most-once trade-off and conditional provider deduplication', () => {
  assert.equal(notificationCrash(1, 'retry').acceptances, 2);
  assert.equal(notificationCrash(1, 'retry').duplicateAcceptances, 1);
  assert.equal(notificationCrash(0, 'pre-mark').lost, true);
  for (const cut of [0, 1, 2]) assert.equal(notificationCrash(cut, 'provider-key').acceptances, 1);
  assert.equal(notificationCrash(2, 'retry').providerCalls, 1);
  assert.equal(notificationCrash(1, 'provider-key').providerCalls, 2);
  for (const cut of [-1, 3, NaN, 1.5]) assert.throws(() => notificationCrash(cut, 'retry'));
});
test('notification pipeline conserves per-channel outcomes, spends admission cap once and keeps retries separate from new delivery', () => {
  const config: NotificationConfig = {
    enabled: { push: true, sms: false, email: true },
    marketing: true,
    cap: 2,
    maxRetries: 2,
    failures: 1,
  };
  const result = notificationPipeline(config);
  assert.equal(result.received, 8);
  assert.equal(result.unique, 6);
  assert.equal(result.duplicates, 2);
  assert.equal(result.suppressed, 6);
  assert.equal(result.capped, 8);
  assert.equal(result.accepted, 4);
  assert.equal(result.providerCalls, 8);
  const exhausted = notificationPipeline({ ...config, failures: 3 });
  assert.equal(exhausted.dlq, 4);
  assert.equal(exhausted.providerCalls, 12);
  assert.deepEqual(exhausted.spent, result.spent);
  const transaction = notificationPipeline({ ...config, marketing: false });
  assert.equal(transaction.accepted, 12);
  assert.equal(transaction.suppressed, 6);
  assert.equal(transaction.capped, 0);
  for (const cap of [1, 2, 3, 6])
    for (const maxRetries of [0, 1, 2, 3])
      for (const failures of [0, 1, 2, 3]) {
        const r = notificationPipeline({ ...config, cap, maxRetries, failures });
        assert.equal(r.rows.length, 18);
        assert.equal(r.suppressed + r.capped + r.accepted + r.dlq, 18);
        assert.ok(r.spent.push <= cap && r.spent.email <= cap);
        assert.ok(r.providerCalls <= (r.accepted + r.dlq) * (maxRetries + 1));
      }
});
