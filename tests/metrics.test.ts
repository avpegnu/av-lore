import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cardinalityBudget,
  gaugeSamples,
  gaugeRollup,
  alertReplay,
} from '../src/lib/metrics-models';
test('cardinality budgets distinguish possible combinations, assumed observed coverage and sample intervals', () => {
  const base = cardinalityBudget(1, 100, 10),
    ids = cardinalityBudget(10000, 100, 10),
    half = cardinalityBudget(10000, 50, 10);
  assert.equal(base.potential, 2880);
  assert.equal(ids.observed, base.observed * 10000);
  assert.equal(half.observed, ids.observed / 2);
  assert.equal(cardinalityBudget(10000, 100, 20).samplesPerSecond, ids.samplesPerSecond / 2);
  assert.equal(ids.hotTB, (ids.compressedGB * 15 * 2) / 1000);
  assert.equal(cardinalityBudget(1, 0, 10).samplesPerSecond, 0);
  assert.throws(() => cardinalityBudget(1, 100, 0));
});
test('sum/count rollups conserve sample-weighted gauge means and extrema while unweighted means distort uneven buckets', () => {
  const total = gaugeSamples.reduce((s, n) => s + n, 0);
  for (let width = 1; width <= 10; width++) {
    const r = gaugeRollup(width);
    assert.equal(r.total, total);
    assert.equal(r.count, gaugeSamples.length);
    assert.equal(r.weightedMean, total / gaugeSamples.length);
    assert.equal(r.retainedMax, 100);
  }
  const r = gaugeRollup(10);
  assert.notEqual(r.meanOfMeans, r.weightedMean);
  assert.ok(r.maxAverage < 80);
  assert.equal(gaugeRollup(1).maxAverage, 100);
  assert.throws(() => gaugeRollup(0));
});
test('for-duration waits elapsed evaluation time, rejects brief spikes and resets pending on absent expression results', () => {
  assert.equal(alertReplay(14, 5, 3, false).firstFiring, 10);
  assert.equal(alertReplay(14, 5, 3, true).firstFiring, 14);
  assert.equal(alertReplay(19, 5, 5, true).firstFiring, undefined);
  assert.equal(alertReplay(19, 5, 0, false).firstFiring, 2);
  assert.equal(alertReplay(10, 5, 3, true).state, 'NO_DATA');
  assert.equal(alertReplay(15, 5, 3, false).state, 'INACTIVE');
  for (let t = 0; t < 20; t++)
    for (let hold = 0; hold <= 5; hold++) {
      const r = alertReplay(t, 5, hold, false);
      assert.ok(
        r.rows
          .filter((row) => row.state === 'FIRING')
          .every(
            (row) =>
              row.since !== undefined &&
              row.time - row.since >= hold &&
              row.rate !== null &&
              row.rate > 5,
          ),
      );
    }
  assert.throws(() => alertReplay(20, 5, 3, false));
});

test('burn rates use eligible request sums rather than average minute percentages and require both windows', async () => {
  const { sloBurn } = await import('../src/lib/metrics-models');
  assert.equal(sloBurn(1, 10000, 400).firing, false);
  assert.equal(sloBurn(20, 10000, 400).firing, false);
  const sustained = sloBurn(22, 10000, 400);
  assert.equal(sustained.firing, true);
  assert.equal(sustained.short.burn, 40);
  const quiet = sloBurn(22, 1000, 400);
  assert.equal(quiet.firing, false);
  assert.ok(quiet.unweightedBurn > 14.4);
  assert.ok(quiet.long.burn < 14.4);
  for (let duration = 0; duration <= 60; duration++)
    for (const requests of [1000, 10000]) {
      const r = sloBurn(duration, requests, 400);
      assert.ok(r.short.bad <= r.long.bad);
      assert.equal(r.budgetPercentEstimate, (r.long.burn / 720) * 100);
      assert.equal(r.firing, r.short.burn > 14.4 && r.long.burn > 14.4);
    }
  assert.throws(() => sloBurn(61, 10000, 400));
});
