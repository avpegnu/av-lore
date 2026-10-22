import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickupAssignment, tripClaims, locationProjection } from '../src/lib/ride-platform-models';
test('matching separates total, worst wait, batching cost and eligible cardinality', () => {
  assert.equal(pickupAssignment(0, 'greedy', 0, false, false).total, 50);
  assert.equal(pickupAssignment(0, 'total', 0, false, false).total, 26);
  assert.equal(pickupAssignment(0, 'total', 20, false, false).totalWait, 66);
  assert.equal(pickupAssignment(1, 'total', 0, false, false).worst, 18);
  assert.equal(pickupAssignment(1, 'fair', 0, false, false).worst, 12);
  assert.equal(pickupAssignment(1, 'fair', 0, false, false).total, 24);
  assert.equal(pickupAssignment(0, 'greedy', 0, false, true).total, 26);
  for (const busy of [true, false])
    for (const scenario of [0, 1])
      for (const policy of ['greedy', 'total', 'fair'] as const) {
        const r = pickupAssignment(scenario, policy, 5, busy, false);
        assert.equal(new Set(r.pairs.map((p) => p.driver)).size, r.matched);
        assert.equal(new Set(r.pairs.map((p) => p.rider)).size, r.matched);
        assert.equal(r.matched, busy ? 1 : 2);
        if (busy) assert.ok(r.pairs.every((p) => p.driver === 0));
      }
});
test('one-trip CAS is insufficient for driver exclusivity or current-offer authority', () => {
  const safe = tripClaims(5, true, true);
  assert.equal(safe.doubleBooked, 0);
  assert.equal(safe.assignments.T3, 'D2');
  assert.equal(safe.results.at(-1)?.result, 'REPLAY_ACCEPTED');
  assert.equal(tripClaims(2, false, true).doubleBooked, 1);
  assert.equal(tripClaims(4, true, false).wrongOfferWon, true);
  assert.equal(tripClaims(4, true, true).wrongOfferWon, false);
  assert.equal(Object.keys(safe.assignments).length, 2);
});
test('location cache uses server-issued epochs/sequences, receipt TTL and version-filtered geo memberships', () => {
  const safe = locationProjection(5, 20, true, true, true);
  assert.equal(safe.latest?.cell, 'C');
  assert.equal(safe.rows[4].result, 'STALE_OR_DUPLICATE');
  assert.equal(locationProjection(5, 20, false, true, true).latest?.cell, 'B');
  assert.equal(locationProjection(3, 21, true, true, true).verifiedCandidates, 0); // duplicates did not refresh received=10
  assert.equal(locationProjection(5, 30, true, true, true).verifiedCandidates, 0);
  assert.equal(locationProjection(5, 30, true, false, true).verifiedCandidates, 1);
  const ghosts = locationProjection(5, 20, true, true, false);
  assert.equal(ghosts.rawCandidates, 2);
  assert.equal(ghosts.verifiedCandidates, 1);
  assert.equal(locationProjection(6, 20, true, true, true).latest?.seq, 2);
});
