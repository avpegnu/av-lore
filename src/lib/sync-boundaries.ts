/** Small UTF-8 byte fixture. Rolling fingerprints choose cuts; exact bytes decide reuse. */
export interface SyncChunk {
  offset: number;
  bytes: number[];
  key: string;
}
export const boundaryExample =
  'Plan: keep local edits safe. Upload verified blocks before committing a revision. Replay the journal after reconnecting. Keep both copies when two offline edits conflict. Check bytes, not just file names.';
export function cutSyncBytes(
  text: string,
  mode: 'fixed' | 'content',
  fixedSize = 32,
  bits = 4,
): SyncChunk[] {
  const bytes = new TextEncoder().encode(text);
  if (
    bytes.length > 2048 ||
    ![16, 32, 48, 64].includes(fixedSize) ||
    !Number.isInteger(bits) ||
    bits < 3 ||
    bits > 6
  )
    throw new RangeError('Invalid bounded chunk fixture');
  const chunks: SyncChunk[] = [];
  const append = (start: number, end: number) => {
    const part = Array.from(bytes.slice(start, end));
    chunks.push({
      offset: start,
      bytes: part,
      key: part.map((b) => b.toString(16).padStart(2, '0')).join(''),
    });
  };
  if (mode === 'fixed') {
    for (let i = 0; i < bytes.length; i += fixedSize)
      append(i, Math.min(i + fixedSize, bytes.length));
    return chunks;
  }
  // A continuous eight-byte polynomial rolling window, modulo 2^32.
  // No production CDC optimization or cryptographic integrity is implied.
  let fingerprint = 0,
    power = 1,
    start = 0;
  for (let i = 1; i < 8; i++) power = Math.imul(power, 31) >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    if (i >= 8) fingerprint = (fingerprint - Math.imul(bytes[i - 8], power)) >>> 0;
    fingerprint = (Math.imul(fingerprint, 31) + bytes[i]) >>> 0;
    const length = i + 1 - start;
    if ((length >= 8 && (fingerprint & ((1 << bits) - 1)) === 0) || length >= 64) {
      append(start, i + 1);
      start = i + 1;
    }
  }
  if (start < bytes.length) append(start, bytes.length);
  return chunks;
}
export function compareSyncBoundaries(
  base: string,
  local: string,
  mode: 'fixed' | 'content',
  size = 32,
  bits = 4,
) {
  const before = cutSyncBytes(base, mode, size, bits),
    after = cutSyncBytes(local, mode, size, bits),
    available = new Set(before.map((c) => c.key)),
    unique = new Map(after.filter((c) => !available.has(c.key)).map((c) => [c.key, c]));
  return {
    before,
    after,
    uploadBytes: [...unique.values()].reduce((sum, c) => sum + c.bytes.length, 0),
    newChunks: unique.size,
    reusedPositions: after.filter((c) => available.has(c.key)).length,
    fileBytes: after.reduce((sum, c) => sum + c.bytes.length, 0),
  };
}
