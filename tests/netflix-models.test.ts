import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fillAssets, netflixFill, netflixLive, netflixQuality } from '../src/lib/netflix-models';
test('rate-quality choice respects device, bandwidth and measured-fixture target rather than scaling bitrate', () => {
  const simple = netflixQuality(false, 1080, 90, 6);
  assert.equal(simple.selected?.id, '1080-22');
  assert.ok(Math.abs(simple.selectedGB! - 1.98) < 1e-10);
  assert.equal(simple.fixedGB, 5.4);
  assert.equal(simple.fixedMeets, true);
  assert.equal(netflixQuality(true, 1080, 90, 6).selected?.id, '1080-60');
  assert.equal(netflixQuality(true, 1080, 90, 4).status, 'TARGET_UNMET');
  assert.equal(netflixQuality(false, 720, 90, 6).selected?.id, '720-40');
  assert.equal(netflixQuality(false, 480, 90, 6).selected, null);
  for (const complex of [true, false])
    for (const cap of [480, 720, 1080])
      for (const floor of [60, 75, 90, 95])
        for (const budget of [1, 2, 4, 6, 8]) {
          const r = netflixQuality(complex, cap, floor, budget);
          if (r.selected) {
            assert.ok(
              r.selected.resolution <= cap &&
                r.selected.quality >= floor &&
                r.selected.mbps <= budget,
            );
            assert.equal(
              r.compatible.some(
                (p) => p.quality >= floor && p.mbps <= budget && p.mbps < r.selected!.mbps,
              ),
              false,
            );
          } else
            assert.equal(
              r.compatible.some((p) => p.quality >= floor && p.mbps <= budget),
              false,
            );
        }
});
test('prefill fits complete objects within storage and fill window; popularity is not byte savings', () => {
  const r = netflixFill(10, 50, 60);
  assert.equal(r.fillGB, 22.5);
  assert.deepEqual(r.greedy.ids, ['A', 'D', 'E']);
  assert.deepEqual(r.optimal.ids, ['B', 'C']);
  assert.equal(r.greedy.savedGB, 770);
  assert.equal(r.optimal.savedGB, 1000);
  assert.notEqual(r.optimal.byteHit, r.optimal.requestHit);
  assert.deepEqual(netflixFill(20, 5, 10).optimal.ids, []);
  for (const storage of [0, 1, 3, 5, 10, 20])
    for (const speed of [0, 5, 20, 50])
      for (const minutes of [0, 10, 60]) {
        const f = netflixFill(storage, speed, minutes);
        assert.ok(f.optimal.gb <= f.budget && f.greedy.gb <= f.budget);
        assert.ok(f.optimal.savedGB >= f.greedy.savedGB);
        assert.ok(f.optimal.ids.every((id) => fillAssets.some((a) => a.id === id)));
      }
});
test('live media coalescing preserves viewer egress and cannot relieve personalized control work', () => {
  const raw = netflixLive(3, 30, 4, 'none', 1),
    edge = netflixLive(3, 30, 4, 'edge', 2),
    shield = netflixLive(3, 30, 4, 'shield', 3);
  assert.equal(raw.originFetches, 3_000_000);
  assert.equal(edge.originFetches, 80);
  assert.equal(shield.originFetches, 4);
  assert.equal(raw.controlRps, 200_000);
  assert.equal(raw.controlOverload, 100_000);
  assert.equal(shield.controlRps, raw.controlRps);
  assert.equal(shield.edgeEgressGB, raw.edgeEgressGB);
  assert.equal(raw.latencySeconds, 8);
  assert.equal(raw.stallSeconds, 2);
  assert.equal(shield.latencySeconds, 16);
  assert.equal(shield.stallSeconds, 0);
  assert.equal(netflixLive(3, 120, 1, 'shield', 2).controlOverload, 0);
});
