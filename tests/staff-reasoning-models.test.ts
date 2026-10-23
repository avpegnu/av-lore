import test from 'node:test';
import assert from 'node:assert/strict';
import { demandRunway, survivorLoad } from '../src/lib/staff-reasoning-models';
test('stationary demand runway distinguishes continuous crossing, first discrete month and no-growth cases', () => {
  const r = demandRunway(0.6, 0.1, 0.75);
  assert.ok(Math.abs(r.months! - Math.log(1.25) / Math.log(1.1)) < 1e-10);
  assert.equal(r.firstWholeMonth, 3);
  assert.ok(r.samples[2].ratio < 0.75);
  assert.ok(r.samples[3].ratio > 0.75);
  assert.equal(demandRunway(0.8, 0.1, 0.75).months, 0);
  assert.equal(demandRunway(0.6, 0, 0.75).months, null);
  assert.equal(demandRunway(0, 0.1, 0.75).months, null);
  assert.throws(() => demandRunway(0.5, NaN, 0.75));
  assert.throws(() => demandRunway(0.5, 0.1, 0));
});
test('regional survivor ratio conserves equal transferable demand without claiming availability', () => {
  assert.deepEqual(survivorLoad(0.35, 2, 1, 0.7), { ratio: 0.7, fits: true, survivors: 1 });
  assert.equal(survivorLoad(0.49, 2, 1, 0.7).fits, false);
  assert.ok(Math.abs(survivorLoad(0.4, 3, 1, 0.7).ratio - 0.6) < 1e-12);
  assert.ok(Math.abs(survivorLoad(0.4, 3, 0, 0.7).ratio - 0.4) < 1e-12);
  assert.throws(() => survivorLoad(0.4, 2, 2, 0.7));
  assert.throws(() => survivorLoad(0.4, 2.5, 1, 0.7));
});
