import test from 'node:test';
import assert from 'node:assert/strict';
import { chatArrivals, replayChat, routeChat } from '../src/lib/chat-models';

test('a contiguous chat cursor does not skip a gap and buffered/sync duplicates do not duplicate display', () => {
  const gap = replayChat(3, false);
  assert.equal(gap.cursor, 1);
  assert.equal(gap.maxSeen, 3);
  assert.equal(gap.duplicates, 1);
  assert.deepEqual(gap.buffer, [3]);
  assert.deepEqual(gap.missing, [2]);
  assert.deepEqual(gap.displayed, [1]);
  assert.equal(replayChat(4, false).cursor, 3);
  for (let i = 0; i <= chatArrivals.length; i++) {
    const before = replayChat(i, false),
      synced = replayChat(i, true);
    assert.ok(before.displayed.every((seq, index) => seq === index + 1));
    assert.ok(before.buffer.every((seq) => seq > before.cursor));
    assert.equal(synced.cursor, 8);
    assert.deepEqual(synced.buffer, []);
    assert.deepEqual(synced.missing, []);
    assert.deepEqual(synced.displayed, [1, 2, 3, 4, 5, 6, 7, 8]);
  }
  assert.equal(replayChat(9, false).duplicates, 1);
  for (const count of [-1, 10, 1.5, NaN]) assert.throws(() => replayChat(count, false));
});

test('routing is per session generation, and a stale registry neither invents sockets nor guarantees delivery', () => {
  assert.equal(routeChat(0, false).delivered, 2);
  const moved = routeChat(1, true);
  assert.equal(moved.actual.length, 2);
  assert.equal(moved.delivered, 1);
  assert.equal(moved.missed, 1);
  assert.equal(moved.routes.find((r) => r.device === 'phone')?.delivered, false);
  assert.equal(routeChat(1, false).delivered, 2);
  assert.equal(routeChat(2, true).delivered, 0);
  assert.equal(routeChat(2, true).routes.length, 2);
  assert.equal(routeChat(2, false).registry.length, 0);
  for (const phase of [-1, 3, 0.5, NaN]) assert.throws(() => routeChat(phase, true));
});
