import test from 'node:test';
import assert from 'node:assert/strict';
import { audioStartup, audioAccounting, audioPlaylist } from '../src/lib/audio-platform-models';
test('audio startup: bytes and valid rights are separate, overlap follows resolved metadata', () => {
  const serial = audioStartup(100, 5, false, false, false, false, true, false, false, true),
    parallel = audioStartup(100, 5, false, false, false, false, true, true, false, true);
  assert.equal(serial.total, 584);
  assert.equal(parallel.total, 484);
  assert.equal(audioStartup(100, 5, true, true, false, true, true, true, false, true).total, 120);
  assert.equal(audioStartup(100, 5, true, true, true, true, true, true, false, false).total, null);
  assert.equal(audioStartup(100, 5, true, true, true, true, false, true, true, true).wastedKB, 6);
});
test('play reports distinguish event duplicates, semantic plays, trusted time and closed-period adjustments', () => {
  const safe = audioAccounting(8, 30, true, true, true, true);
  assert.equal(safe.base, 2);
  assert.equal(safe.adjustment, 1);
  assert.equal(safe.total, 3);
  assert.equal(safe.quarantined, 2);
  assert.equal(safe.transportDuplicates, 1);
  assert.equal(safe.semanticDuplicates, 1);
  assert.equal(audioAccounting(8, 30, true, false, true, true).total, 4);
  assert.equal(audioAccounting(8, 30, false, true, true, true).total, 3);
  assert.equal(audioAccounting(8, 30, true, true, true, false).pending, 1);
  assert.equal(audioAccounting(8, 45, true, true, true, true).total, 2);
});
test('playlist rebase uses stable entry anchors; removed anchors require retained context or resync', () => {
  assert.equal(audioPlaylist(1, false, false, true).wrongAnchor, true);
  const replayed = audioPlaylist(1, true, false, true);
  assert.equal(replayed.duplicateOperationIgnored, 1);
  assert.equal(replayed.entries.filter((e) => e.id === 'ey').length, 1);
  assert.equal(
    audioPlaylist(1, true, false, true)
      .visible.map((e) => e.track)
      .join(','),
    'X0,A,B,Y,C',
  );
  assert.equal(
    audioPlaylist(1, true, true, true)
      .visible.map((e) => e.track)
      .join(','),
    'X0,A,Y,C',
  );
  assert.equal(audioPlaylist(1, true, true, false).status, 'RESYNC_REQUIRED');
});
