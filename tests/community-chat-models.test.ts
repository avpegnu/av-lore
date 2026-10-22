import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatResume, communityFanout, hotChannelReads } from '../src/lib/community-chat-models';
test('coalescing merges only equivalent requests and honors minimum observed version', () => {
  const safe = hotChannelReads(4, true, true, true, 40),
    unsafe = hotChannelReads(4, true, true, false, 40),
    none = hotChannelReads(4, true, false, false, 40);
  assert.equal(safe.incompatible, 0);
  assert.ok(safe.queries.length < 12);
  assert.ok(unsafe.queries.length < safe.queries.length);
  assert.ok(unsafe.scopeLeaks > 0);
  assert.ok(unsafe.rows.some((r) => r.issues.includes('CURSOR')));
  assert.ok(unsafe.rows.some((r) => r.issues.includes('MIN_VERSION')));
  assert.equal(none.queries.length, 12);
  assert.equal(none.incompatible, 0);
  const striped = hotChannelReads(4, false, true, true, 40);
  assert.ok(striped.queries.length >= safe.queries.length);
  assert.equal(striped.incompatible, 0);
  for (const instances of [1, 2, 4])
    for (const latency of [5, 20, 40, 80]) {
      const r = hotChannelReads(instances, false, true, true, latency);
      assert.equal(r.incompatible, 0);
      assert.ok(r.rows.every((row) => row.wait > 0 && row.wait <= latency));
    }
});
test('relays reduce owner work but not recipient egress; bounded queues require catch-up gaps', () => {
  const a = communityFanout(100000, 50, 10, 5, 4, true),
    b = communityFanout(100000, 50, 10, 5, 8, true),
    c = communityFanout(100000, 50, 10, 5, 4, false);
  assert.equal(a.watchers, 5000);
  assert.equal(a.recipientCopies, 25000);
  assert.equal(a.ownerCopies, 20);
  assert.equal(a.egressMB, 25);
  assert.equal(a.gapDeliveriesPerSecond, 5000);
  assert.equal(b.recipientCopies, a.recipientCopies);
  assert.equal(b.egressMB, a.egressMB);
  assert.equal(b.gapDeliveriesPerSecond, 0);
  assert.equal(c.queuedAfter5s, 25000);
  assert.equal(c.status, 'GROWING_QUEUE');
  assert.equal(communityFanout(10000, 10, 0, 5, 4, true).recipientCopies, 0);
});
test('resume handles replay retention boundaries, snapshot/live gaps, stale history and permission denial', () => {
  assert.equal(chatResume(4, 4, 1, true, true, true).source, 'BUFFER');
  assert.equal(chatResume(3, 4, 1, true, true, true).source, 'SNAPSHOT_REQUIRED');
  for (const cursor of [0, 2, 4, 5, 8]) {
    const r = chatResume(cursor, 4, 4, true, true, true);
    assert.deepEqual(
      r.messages.map((m) => m.id),
      ['m3', 'm4', 'm5'],
    );
    assert.equal(r.resurrected, false);
    assert.equal(r.watermark, 9);
  }
  const missing = chatResume(2, 4, 4, true, false, true);
  assert.equal(missing.liveMissing, 1);
  assert.deepEqual(
    missing.messages.map((m) => m.id),
    ['m3', 'm4'],
  );
  assert.equal(chatResume(2, 4, 4, true, true, false).resurrected, true);
  assert.equal(chatResume(8, 8, 4, false, true, true).source, 'DENIED');
  assert.equal(chatResume(8, 8, 4, false, true, true).messages.length, 0);
});
