import test from 'node:test';
import assert from 'node:assert/strict';
import { logSeek, logReplication, logVisibility } from '../src/lib/log-models';
test('sparse index seeks by logical offset and byte position, retaining holes after compaction and detecting retention expiry', () => {
  assert.deepEqual(logSeek(6, false, false).anchor, { offset: 6, position: 170 });
  assert.equal(logSeek(5, true, false).found?.offset, 6);
  assert.equal(logSeek(5, true, false).found?.position, 0);
  assert.equal(logSeek(2, true, false).found?.offset, 3);
  assert.equal(logSeek(2, false, true).status, 'OFFSET_OUT_OF_RANGE');
  assert.equal(logSeek(12, true, false).status, 'END_OF_LOG');
  for (const compact of [true, false])
    for (const expire of [true, false])
      for (let n = 0; n <= 12; n++) {
        const s = logSeek(n, compact, expire),
          expected = s.segments.flatMap((x) => x.rows).find((r) => r.offset >= n);
        if (n >= s.start) assert.equal(s.found?.offset, expected?.offset);
      }
});
test('replica timeline gates admission by minISR and all-current-ISR ACK; reply loss differs from data loss', () => {
  assert.equal(logReplication(2, 2, 'leader', false, false).sender, 'ACKNOWLEDGED');
  assert.equal(logReplication(2, 2, 'all', false, false).sender, 'UNKNOWN');
  assert.equal(logReplication(3, 2, 'all', true, false).sender, 'UNKNOWN');
  assert.equal(logReplication(3, 2, 'all', true, false).hw, 5);
  assert.equal(logReplication(3, 3, 'all', false, false).sender, 'REJECTED');
  assert.equal(logReplication(3, 3, 'all', false, false).hw, 4);
  assert.equal(logReplication(4, 2, 'all', false, false).election, 'CLEAN_ISR');
  assert.equal(logReplication(4, 2, 'all', false, false).recoveredEnd, 5);
  assert.equal(logReplication(5, 2, 'all', false, false).election, 'UNAVAILABLE');
  assert.equal(logReplication(5, 2, 'all', false, true).currentCommittedLoss, true);
});
test('transaction visibility is limited by replication, open transactions and abort filtering, including interleaved normal records', () => {
  assert.deepEqual(logVisibility(6, 'open', true).visible, ['N0']);
  assert.deepEqual(logVisibility(6, 'open', false).visible, ['N0', 'T1', 'N2', 'T3', 'N5']);
  assert.deepEqual(logVisibility(6, 'committed', true).visible, ['N0', 'T1', 'N2', 'T3', 'N5']);
  assert.deepEqual(logVisibility(6, 'aborted', true).visible, ['N0', 'N2', 'N5']);
  assert.equal(logVisibility(4, 'committed', true).resolved, false);
  assert.deepEqual(logVisibility(4, 'committed', true).visible, ['N0']);
  for (let hw = 0; hw <= 6; hw++)
    for (const s of ['open', 'committed', 'aborted'] as const) {
      const r = logVisibility(hw, s, true);
      assert.ok(
        r.rows
          .filter((x) => x.visible)
          .every((x) => x.offset < hw && x.offset < r.lso && x.kind !== 'marker'),
      );
    }
});
