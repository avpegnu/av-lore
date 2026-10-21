import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeBase62,
  decodeBase62,
  base62Steps,
  codeSpace,
  redirectReplay,
} from '../src/lib/short-link-models';

test('base62 round trips zero, alphabet boundaries and integers beyond JS Number precision', () => {
  for (const n of [
    0n,
    9n,
    10n,
    35n,
    36n,
    61n,
    62n,
    365000000000n,
    9007199254740993n,
    2n ** 64n - 1n,
  ]) {
    const code = encodeBase62(n);
    assert.equal(decodeBase62(code), n);
    assert.equal(
      base62Steps(n)
        .map((s) => s.digit)
        .reverse()
        .join(''),
      code,
    );
  }
  assert.equal(encodeBase62(61n), 'Z');
  assert.equal(encodeBase62(62n), '10');
  assert.throws(() => encodeBase62(-1n));
  for (const code of ['', 'abc-', 'á']) assert.throws(() => decodeBase62(code));
  assert.equal(codeSpace(7, 365e9).space, 3521614606208n);
  assert.ok(codeSpace(7, 365e9).nextCollision > 0.1 && codeSpace(7, 365e9).nextCollision < 0.11);
  assert.equal(codeSpace(7, 1).anyCollision, 0);
  assert.equal(codeSpace(3, 1e9).expectedAttempts, Infinity);
});

test('redirect replay keeps explicit cache freshness independent of status and distinguishes validation from reuse', () => {
  const fresh = redirectReplay('fresh', 30, 35);
  assert.equal(fresh.originRequests, 4);
  assert.equal(fresh.staleRequests, 2);
  assert.deepEqual(
    fresh.events.filter((e) => e.stale).map((e) => e.at),
    [40, 50],
  );
  for (const policy of ['no-store', 'no-cache'] as const) {
    const replay = redirectReplay(policy, 120, 35);
    assert.equal(replay.originRequests, 10);
    assert.equal(replay.staleRequests, 0);
  }
  const long = redirectReplay('fresh', 120, 35);
  assert.equal(long.originRequests, 1);
  assert.equal(long.staleRequests, 6);
  assert.equal(redirectReplay('fresh', 1, 35).originRequests, 10);
  const exact = redirectReplay('fresh', 30, 30);
  assert.equal(exact.events[3].target, 'B');
  assert.equal(exact.staleRequests, 0);
});
