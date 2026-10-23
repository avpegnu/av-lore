import test from 'node:test';
import assert from 'node:assert/strict';
import {
  practiceElapsed,
  pausePractice,
  resumePractice,
  rebasePractice,
} from '../src/lib/practice-clock';
test('elapsed simulation counts delayed callbacks, preserves pause and caps its budget', () => {
  const start = { elapsedMs: 0, anchor: 1000 };
  assert.equal(practiceElapsed(start, 3000, 2700000, 60), 120000);
  const paused = pausePractice(start, 3500, 2700000, 60);
  assert.equal(paused.elapsedMs, 150000);
  assert.equal(practiceElapsed(paused, 100000, 2700000, 60), 150000);
  const resumed = resumePractice(paused, 100000, 2700000, 60);
  assert.equal(practiceElapsed(resumed, 101000, 2700000, 60), 210000);
  assert.equal(practiceElapsed(start, 1000000, 2700000, 60), 2700000);
  assert.throws(() => practiceElapsed(start, 3000, 2700000, 0));
  assert.throws(() => practiceElapsed(start, 3000, 2700000, Infinity));
});
test('speed changes settle old-rate progress before a new anchor without changing default real-time semantics', () => {
  const start = { elapsedMs: 1000, anchor: 100 };
  const rebased = rebasePractice(start, 1100, 2700000, 30);
  assert.equal(rebased.elapsedMs, 31000);
  assert.equal(practiceElapsed(rebased, 2100, 2700000, 60), 91000);
  assert.equal(practiceElapsed(start, 1100, 2700000), 2000);
  const paused = pausePractice(start, 1100, 2700000, 30);
  assert.deepEqual(rebasePractice(paused, 9999, 2700000, 60), paused);
  assert.equal(rebasePractice(start, 1000000, 2000, 30).anchor, null);
});
