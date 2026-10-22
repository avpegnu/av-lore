import test from 'node:test';
import assert from 'node:assert/strict';
import { erasureScenario, readerLifecycle } from '../src/lib/object-storage-models';
test('MDS availability counts unavailable fragments rather than treating zone failures as independent single fragments', () => {
  for (const k of [4, 8] as const) {
    const balanced = erasureScenario(k, 'balanced', [0], []),
      packed = erasureScenario(k, 'packed', [0], []);
    assert.equal(balanced.recoverable, true);
    assert.equal(balanced.unavailable, balanced.m);
    assert.equal(packed.recoverable, false);
    assert.equal(packed.unavailable, k);
    assert.equal(erasureScenario(k, 'balanced', [0], [1]).recoverable, false);
    for (let mask = 0; mask < 8; mask++)
      for (const layout of ['balanced', 'packed'] as const) {
        const failed = [0, 1, 2].filter((i) => mask & (1 << i)),
          r = erasureScenario(k, layout, failed, []);
        assert.equal(r.available, r.fragments.filter((f) => !failed.includes(f.domain)).length);
        assert.equal(r.recoverable, r.available >= k);
      }
  }
  assert.throws(() => erasureScenario(8, 'balanced', [3], []));
});
test('erasure capacity and basic full-stripe one-fragment repair remain distinct from replication and durability probabilities', () => {
  for (const k of [4, 8] as const) {
    const r = erasureScenario(k, 'balanced', [], [0]);
    assert.equal(r.overhead, 1.5);
    assert.equal(r.encodedMB, 1440);
    assert.equal(r.fragmentMB * r.n, r.encodedMB);
    assert.equal(r.basicOneFragmentRepairReadMB, r.fragmentMB * k);
    assert.equal(r.recoverable, true);
  }
  const overlap = erasureScenario(8, 'balanced', [0], [0]);
  assert.equal(overlap.unavailable, 4);
});
test('immutable reader generations need GC protection until completion even after the head pointer is overwritten', () => {
  assert.equal(readerLifecycle(2, true).head, 'v2');
  assert.equal(readerLifecycle(2, true).readerVersion, 'v1');
  assert.equal(readerLifecycle(3, true).oldExists, true);
  assert.equal(readerLifecycle(3, false).oldExists, false);
  assert.equal(readerLifecycle(4, true).readerState, 'COMPLETE');
  assert.equal(readerLifecycle(4, false).readerState, 'FAILED');
  assert.equal(readerLifecycle(5, true).oldExists, false);
  assert.equal(readerLifecycle(5, true).readerState, 'COMPLETE');
  assert.equal(readerLifecycle(5, true).pinActive, false);
  assert.throws(() => readerLifecycle(6, true));
});

test('multipart manifests bind current part tags, while matching tags alone do not prove expected content', async () => {
  const { initialMultipart, multipartAction: a } = await import('../src/lib/object-storage-models');
  const replaced = a(initialMultipart(), 'replace-part'),
    invalid = a(replaced, 'complete');
  assert.equal(invalid.result, 'INVALID_PART');
  assert.equal(invalid.payload, 'OLD');
  assert.equal(invalid.upload, 'OPEN');
  const refreshed = a(replaced, 'refresh-manifest'),
    bad = a(refreshed, 'complete');
  assert.equal(bad.result, 'EXPECTED_CHECKSUM_MISMATCH');
  assert.equal(bad.head, 3);
  const unsafe = a(refreshed, 'complete', true, false);
  assert.equal(unsafe.payload, 'AAAXXXCCC');
  assert.equal(unsafe.upload, 'COMPLETED');
  const restored = a(refreshed, 'restore-part'),
    ok = a(restored, 'complete');
  assert.equal(ok.payload, 'AAABBBCCC');
  assert.equal(ok.head, 4);
  assert.equal(restored.payload, 'OLD');
});
test('conditional publication prevents lost updates; lost completion replies reconcile without making another version', async () => {
  const { initialMultipart, multipartAction: a } = await import('../src/lib/object-storage-models');
  const raced = a(initialMultipart(), 'other-writer');
  assert.equal(a(raced, 'complete').result, 'PRECONDITION_FAILED');
  assert.equal(a(raced, 'complete').payload, 'OTHER');
  assert.equal(a(raced, 'complete', false).payload, 'AAABBBCCC');
  const renewed = a(raced, 'accept-current-head'),
    lost = a(renewed, 'complete-lost-ack');
  assert.equal(lost.client, 'UNKNOWN');
  assert.equal(lost.head, 5);
  const found = a(lost, 'reconcile');
  assert.equal(found.client, 'KNOWN_COMPLETE');
  assert.equal(found.head, 5);
  assert.equal(found.committedVersion, 5);
  assert.equal(a(found, 'complete').head, 5);
});
test('aborting unfinished multipart removes staged parts without deleting the existing public object', async () => {
  const { initialMultipart, multipartAction: a } = await import('../src/lib/object-storage-models');
  const aborted = a(initialMultipart(), 'abort');
  assert.equal(aborted.parts.length, 0);
  assert.equal(aborted.head, 3);
  assert.equal(aborted.payload, 'OLD');
  assert.equal(a(aborted, 'complete').result, 'NO_SUCH_UPLOAD');
  const published = a(initialMultipart(), 'complete');
  assert.equal(a(published, 'abort').payload, 'AAABBBCCC');
  assert.equal(a(published, 'abort').upload, 'COMPLETED');
});
