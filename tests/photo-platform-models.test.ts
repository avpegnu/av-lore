import test from 'node:test';
import assert from 'node:assert/strict';
import { photoIds, photoPublication, storyEligibility } from '../src/lib/photo-platform-models';
test('photo IDs: capacity, clock, owner isolation and lossless serialization are separate constraints', () => {
  assert.equal(photoIds(1100, false, false, false, 1341).duplicates, 76);
  const guarded = photoIds(1100, true, false, true, 1341);
  assert.equal(guarded.duplicates, 0);
  assert.equal(guarded.backwards, false);
  assert.ok(guarded.deferred > 0);
  assert.equal(guarded.shard, 1341);
  assert.equal(guarded.bits.map((s) => s.length).join('/'), '41/13/10');
  assert.equal(photoIds(2, true, true, false, 1341).duplicates, 2);
  assert.equal(photoIds(2, true, false, false, 1341).numberLoss, true);
});
test('photo publication: intent, readiness and mutation version guards solve distinct failures', () => {
  assert.equal(photoPublication(3, true, true, true).brokenReference, true);
  assert.equal(photoPublication(4, false, false, true).stuckProcessing, true);
  assert.equal(photoPublication(4, false, true, true).state, 'READY');
  assert.equal(photoPublication(6, false, true, true).state, 'DELETED');
  assert.equal(photoPublication(6, false, true, false).resurrected, true);
});
test('story expiry is a read predicate; maximum viewed sequence loses holes', () => {
  const exact = storyEligibility(23, 3, true, false, true);
  assert.equal(exact.returned.length, 3);
  assert.equal(exact.falselySeen, 0);
  assert.equal(storyEligibility(23, 3, true, true, true).falselySeen, 1);
  assert.equal(storyEligibility(24, 3, true, false, true).returned.length, 0);
  assert.equal(storyEligibility(24, 3, false, false, true).expiredReturned, 3);
  assert.equal(storyEligibility(27, 3, false, false, false).cached, 0);
  assert.equal(exact.archiveRetained, 3);
});
