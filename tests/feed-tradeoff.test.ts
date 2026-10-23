import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedTradeoff, type FeedTradeoffInput } from '../src/lib/feed-tradeoff';
const input: FeedTradeoffInput = {
  strategy: 'hybrid',
  followers: 20000000,
  activeFraction: 1,
  readerFollowees: 300,
  otherPulledAuthors: 8,
  threshold: 10000,
  insertsPerSecond: 1000000,
};
test('one-author feed cost separates timeline work, source persistence and logical reader sources', () => {
  const hybrid = feedTradeoff(input),
    push = feedTradeoff({ ...input, strategy: 'push' }),
    pull = feedTradeoff({ ...input, strategy: 'pull' });
  assert.equal(hybrid.authorPulled, true);
  assert.equal(hybrid.timelineInserts, 0);
  assert.equal(hybrid.logicalReadSources, 10);
  assert.equal(hybrid.sourcePosts, 1);
  assert.equal(push.timelineInserts, 20000000);
  assert.equal(push.insertPayloadBytes, 320000000);
  assert.equal(push.idealDrainSeconds, 20);
  assert.equal(push.logicalReadSources, 1);
  assert.equal(pull.timelineInserts, 0);
  assert.equal(pull.logicalReadSources, 300);
  const active = feedTradeoff({ ...input, strategy: 'push', activeFraction: 0.25 });
  assert.equal(active.timelineInserts, 5000000);
  assert.equal(active.idealDrainSeconds, 5);
  assert.equal(active.logicalReadSources, push.logicalReadSources);
  assert.equal(feedTradeoff({ ...input, followers: 10000 }).authorPulled, false);
  assert.equal(feedTradeoff({ ...input, followers: 10001 }).authorPulled, true);
  assert.equal(
    feedTradeoff({ ...input, readerFollowees: 1, otherPulledAuthors: 0 }).logicalReadSources,
    2,
  );
  assert.equal(feedTradeoff({ ...input, strategy: 'push', activeFraction: 0 }).timelineInserts, 0);
});
test('changing service capacity alters the ideal bound without changing work and invalid assumptions are rejected', () => {
  const original = feedTradeoff({ ...input, strategy: 'push' }),
    slower = feedTradeoff({ ...input, strategy: 'push', insertsPerSecond: 100000 });
  assert.equal(slower.timelineInserts, original.timelineInserts);
  assert.equal(slower.idealDrainSeconds, original.idealDrainSeconds * 10);
  for (const patch of [
    { followers: -1 },
    { followers: 0 },
    { followers: 1.5 },
    { activeFraction: 1.1 },
    { activeFraction: NaN },
    { readerFollowees: 0 },
    { otherPulledAuthors: 300 },
    { insertsPerSecond: 0 },
    { threshold: -1 },
  ])
    assert.throws(() => feedTradeoff({ ...input, ...patch }), RangeError);
});
