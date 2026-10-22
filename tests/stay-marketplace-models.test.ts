import test from 'node:test';
import assert from 'node:assert/strict';
import { stayAvailability, stayQuote, stayProjection } from '../src/lib/stay-marketplace-models';
test('stay availability: bitmap conflict, eligibility rules and horizon coverage are independent', () => {
  const safe = stayAvailability(4, 3, true, false);
  assert.equal(safe.bitmapCandidates, 3);
  assert.equal(safe.candidates, 1);
  assert.equal(safe.rows[2].status, 'CANDIDATE');
  assert.equal(stayAvailability(4, 3, false, false).candidates, 3);
  assert.ok(stayAvailability(12, 5, true, false).rows.every((r) => r.status === 'UNKNOWN'));
  assert.ok(stayAvailability(14, 5, true, true).falseBeyondHorizon > 0);
  assert.equal(stayAvailability(7, 1, false, false).rows[1].status, 'BLOCKED');
  assert.equal(stayAvailability(8, 1, false, false).rows[1].status, 'CANDIDATE');
});
test('stay quote: chosen price lock ends at strict expiry and changed total requires consent', () => {
  assert.equal(stayQuote(9, true, false).chargeable, 35200);
  assert.equal(stayQuote(10, true, false).status, 'REQUOTE_REQUIRED');
  assert.equal(stayQuote(10, true, false).chargeable, 0);
  assert.equal(stayQuote(10, true, true).chargeable, 41800);
  assert.equal(stayQuote(9, false, false).status, 'REQUOTE_REQUIRED');
});
test('stay projection: monotonic application prevents regressions but cannot recover missing live changes', () => {
  assert.equal(stayProjection(6, true, false, true).status, 'BLOCKED');
  assert.equal(stayProjection(6, false, false, false).falsePositive, true);
  assert.equal(stayProjection(6, true, true, false).falsePositive, true);
  assert.equal(stayProjection(6, true, true, true).status, 'UNKNOWN');
  assert.equal(stayProjection(6, true, true, true).version, 3);
});
