import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newIdentifierFixture,
  moveIdentifierClock,
  issueIdentifierBatch,
} from '../src/lib/identifier-issuer';
import { unpackId } from '../src/lib/identifier-models';
test('generator fixture rejects rollback without changing issued state and resumes only beyond its watermark', () => {
  const initial = newIdentifierFixture(),
    first = issueIdentifierBatch(initial, 10, 12, 1n),
    second = issueIdentifierBatch(first, 10, 12, 1n);
  assert.equal(first.lastSequence, 0n);
  assert.equal(second.lastSequence, 1n);
  assert.equal(initial.issued, 0n);
  const back = moveIdentifierClock(second, 'back'),
    blocked = issueIdentifierBatch(back, 10, 12, 5n);
  assert.equal(blocked.error, 'clock-rollback');
  assert.equal(blocked.accepted, 0n);
  assert.equal(blocked.rejected, 5n);
  assert.equal(blocked.lastTime, second.lastTime);
  assert.equal(blocked.lastSequence, second.lastSequence);
  assert.deepEqual(blocked.samples, second.samples);
  assert.equal(blocked.issued, 2n);
  const resumed = issueIdentifierBatch(moveIdentifierClock(blocked, 'recover'), 10, 12, 1n);
  assert.equal(resumed.error, 'none');
  assert.equal(resumed.lastSequence, 0n);
  assert.ok(resumed.samples.at(-1)!.value > second.samples.at(-1)!.value);
});
test('large bursts preserve a unique prefix, never wrap sequence and retain bounded decoded samples', () => {
  for (const sequenceBits of [4, 12, 18]) {
    const capacity = 1n << BigInt(sequenceBits),
      state = issueIdentifierBatch(newIdentifierFixture(), 10, sequenceBits, capacity + 1n);
    assert.equal(state.accepted, capacity);
    assert.equal(state.rejected, 1n);
    assert.equal(state.issued, capacity);
    assert.equal(state.lastSequence, capacity - 1n);
    assert.equal(state.samples.length, 3);
    for (const sample of state.samples)
      assert.deepEqual(unpackId(sample.value, 10, sequenceBits), {
        time: state.clock,
        worker: 7n,
        sequence: sample.sequence,
      });
    const blocked = issueIdentifierBatch(state, 10, sequenceBits, 1n);
    assert.equal(blocked.accepted, 0n);
    assert.equal(blocked.error, 'sequence-exhausted');
    assert.deepEqual(blocked.samples, state.samples);
    const resumed = issueIdentifierBatch(
      moveIdentifierClock(blocked, 'tick'),
      10,
      sequenceBits,
      capacity + 1n,
    );
    assert.equal(resumed.samples.length, 6);
    assert.equal(resumed.issued, capacity * 2n);
    assert.equal(new Set(resumed.samples.map((s) => s.value)).size, 6);
    assert.ok(resumed.samples.at(-1)!.value > state.samples.at(-1)!.value);
  }
  assert.throws(() => issueIdentifierBatch(newIdentifierFixture(), 10, 12, 0n), RangeError);
  const oldLayout = issueIdentifierBatch(newIdentifierFixture(), 10, 12, 4096n);
  assert.throws(() => issueIdentifierBatch(oldLayout, 10, 4, 1n), RangeError);
});
