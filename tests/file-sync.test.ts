import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkDelta, syncBase, syncEdits, syncConflict } from '../src/lib/file-sync-models';
test('chunk deltas reconstruct ordered versions and transfer unique missing content, not repeated positions', () => {
  for (const size of [2, 3, 4, 5, 6, 7, 8])
    for (const edit of Object.keys(syncEdits) as (keyof typeof syncEdits)[]) {
      const d = chunkDelta(size, edit);
      assert.equal(d.before.map((c) => c.text).join(''), syncBase);
      assert.equal(d.after.map((c) => c.text).join(''), syncEdits[edit]);
      const old = new Set(d.before.map((c) => c.text));
      assert.equal(
        d.uploadBytes,
        [...new Set(d.after.filter((c) => !old.has(c.text)).map((c) => c.text))].reduce(
          (s, c) => s + c.length,
          0,
        ),
      );
      assert.ok(d.after.every((c) => c.reused === old.has(c.text)));
      assert.equal(new Set(d.needed).size, d.needed.length);
    }
  assert.equal(chunkDelta(4, 'replace').uploadBytes, 4);
  assert.equal(chunkDelta(4, 'replace').reusedPositions, 3);
  assert.equal(chunkDelta(4, 'insert').uploadBytes, 17);
  assert.equal(chunkDelta(4, 'append').uploadBytes, 4);
  assert.ok(
    chunkDelta(2, 'replace').reusedPositions >
      new Set(
        chunkDelta(2, 'replace')
          .after.filter((c) => c.reused)
          .map((c) => c.id),
      ).size,
  );
  assert.throws(() => chunkDelta(0, 'replace'));
});
test('stale-parent guards preserve the first committed head and explicit keep-both preserves both edits', () => {
  for (const first of ['A', 'B'] as const) {
    const second = first === 'A' ? 'B' : 'A';
    for (const stage of [0, 1, 2, 3, 4]) {
      const guarded = syncConflict(stage, true, first),
        unsafe = syncConflict(stage, false, first);
      assert.equal(guarded.revision, stage < 2 ? 5 : 6);
      assert.equal(guarded.unresolved, stage === 3);
      assert.equal(guarded.files, stage === 4 ? 2 : 1);
      assert.equal(guarded.overwrittenWithoutConflict, false);
      if (stage >= 2) assert.equal(guarded.content, first + ' edit');
      if (stage >= 3) {
        assert.equal(unsafe.content, second + ' edit');
        assert.equal(unsafe.revision, 7);
        assert.equal(unsafe.overwrittenWithoutConflict, true);
      }
    }
    const resolved = syncConflict(4, true, first);
    assert.equal(resolved.copy?.content, second + ' edit');
    assert.notEqual(resolved.copy?.id, 'file-main');
    assert.deepEqual(syncConflict(4, true, first), resolved);
  }
  assert.throws(() => syncConflict(5, true, 'A'));
});
