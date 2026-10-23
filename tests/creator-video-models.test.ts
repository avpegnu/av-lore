import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creatorRetrieval, codecPayback, shortPrefetch } from '../src/lib/creator-video-models';
test('retrieval recall uses explicit eligible oracle and a deduplicated source union', () => {
  const one = creatorRetrieval(4, 2, 30, false),
    mixed = creatorRetrieval(4, 2, 30, true);
  assert.equal(one.recall, 0);
  assert.equal(mixed.recall, 0.5);
  assert.ok(!one.shown.some((v) => v.id === 'v03'));
  assert.equal(new Set(mixed.candidates.map((v) => v.id)).size, 4);
  assert.equal(creatorRetrieval(16, 1, 30, false).withinBudget, false);
  assert.equal(creatorRetrieval(16, 8, 30, false).withinBudget, true);
  assert.equal(creatorRetrieval(16, 1, 100, false).recall, 1);
  assert.equal(mixed.totalMs, 17);
  assert.deepEqual(
    mixed.shown.map((v) => v.id),
    ['v15', 'v11', 'v02'],
  );
});
test('codec payback converts Mbps and seconds to decimal GB; incompatibility can eliminate savings', () => {
  const s = codecPayback(20000, 100, 3, 1, 12, 1);
  assert.equal(s.fixedCost, 15);
  assert.ok(Math.abs(s.savedGb - 450) < 1e-9);
  assert.equal(s.savings, 18);
  assert.equal(s.net, 3);
  assert.equal(s.breakEvenViews, 16667);
  assert.equal(codecPayback(20000, 50, 3, 1, 12, 1).net, -6);
  assert.equal(codecPayback(20000, 0, 3, 1, 12, 1).breakEvenViews, null);
  assert.ok(codecPayback(20000, 100, 3, 1, 12, 12).breakEvenViews! > s.breakEvenViews!);
});
test('prefetch is constrained by spare link capacity; unused future prefixes count as waste', () => {
  const s = shortPrefetch(3, 1, 3.2, 2000, 2);
  assert.equal(s.prefetchedMb, 0.5);
  assert.equal(s.selectedMb, 0.3);
  assert.ok(Math.abs(s.wastedMb - 0.2) < 1e-9);
  assert.equal(s.startupMs, 80);
  assert.equal(shortPrefetch(5, 1, 1, 3000, 2).prefetchedMb, 0);
  assert.ok(Math.abs(shortPrefetch(0, 1, 3.2, 2000, 2).startupMs - 830) < 1e-9);
  assert.ok(shortPrefetch(3, 1, 3.2, 2000, 0.5).wastedMb > s.wastedMb);
  assert.equal(shortPrefetch(3, 5, 3.2, 2000, 2).selectedMb, 0);
  for (let d = 0; d <= 5; d++)
    for (let n = 1; n <= 5; n++) {
      const r = shortPrefetch(d, n, 3.2, 2000, 2);
      assert.ok(r.prefetchedMb <= 0.5);
      assert.ok(Math.abs(r.usefulMb + r.wastedMb - r.prefetchedMb) < 1e-9);
    }
});
