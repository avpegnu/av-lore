import test from 'node:test';
import assert from 'node:assert/strict';
import { boundaryExample, cutSyncBytes, compareSyncBoundaries } from '../src/lib/sync-boundaries';

test('fixed and content cuts preserve exact UTF-8 bytes, order and bounded non-tail chunks', () => {
  for (const text of ['', boundaryExample, 'Tiếng Việt 👩🏽‍💻\n'.repeat(20), 'a'.repeat(300)])
    for (const mode of ['fixed', 'content'] as const)
      for (const bits of [3, 4, 5, 6]) {
        const chunks = cutSyncBytes(text, mode, 32, bits),
          expected = [...new TextEncoder().encode(text)];
        assert.deepEqual(
          chunks.flatMap((c) => c.bytes),
          expected,
        );
        let offset = 0;
        for (const [i, c] of chunks.entries()) {
          assert.equal(c.offset, offset);
          offset += c.bytes.length;
          assert.ok(c.bytes.length > 0 && c.bytes.length <= 64);
          if (i < chunks.length - 1) assert.ok(c.bytes.length >= (mode === 'content' ? 8 : 32));
        }
      }
  assert.throws(() => cutSyncBytes('x'.repeat(2049), 'content'), RangeError);
  assert.throws(() => cutSyncBytes('x', 'fixed', 0), RangeError);
  assert.throws(() => cutSyncBytes('x', 'content', 32, 2.5), RangeError);
});
test('byte reuse is exact and deduplicates new chunks without dropping repeated manifest positions', () => {
  const same = compareSyncBoundaries(boundaryExample, boundaryExample, 'content');
  assert.equal(same.uploadBytes, 0);
  const repeated = compareSyncBoundaries('a'.repeat(32), 'b'.repeat(64), 'fixed');
  assert.equal(repeated.after.length, 2);
  assert.equal(repeated.newChunks, 1);
  assert.equal(repeated.uploadBytes, 32);
  const overwrite = compareSyncBoundaries(boundaryExample, 'X' + boundaryExample.slice(1), 'fixed');
  assert.equal(overwrite.uploadBytes, 32);
  const insertFixed = compareSyncBoundaries(boundaryExample, 'X' + boundaryExample, 'fixed'),
    insertContent = compareSyncBoundaries(boundaryExample, 'X' + boundaryExample, 'content');
  assert.ok(insertContent.reusedPositions > 0);
  assert.ok(insertContent.uploadBytes < insertFixed.uploadBytes);
  assert.equal(compareSyncBoundaries('', 'abc', 'content').uploadBytes, 3);
  assert.equal(compareSyncBoundaries('abc', '', 'content').fileBytes, 0);
});
