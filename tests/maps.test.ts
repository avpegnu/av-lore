import test from 'node:test';
import assert from 'node:assert/strict';
import { tileBudget, viewportTiles, routeSearch, blendedEta } from '../src/lib/maps-models';

test('tile pyramid counts and viewport keys separate world scale, bounded view, cache reuse and immutable version', () => {
  assert.equal(tileBudget(0, 25).pyramid, 1);
  assert.equal(tileBudget(21, 25).pyramid, 5864062014805);
  for (let z = 0; z <= 21; z++) {
    const a = viewportTiles(z, 0, 'v1'),
      b = viewportTiles(z, 1, 'v1'),
      c = viewportTiles(z, 0, 'v2');
    assert.ok(a.unique.length <= 12);
    assert.ok(a.tiles.every((t) => t.x >= 0 && t.x < 2 ** z && t.y >= 0 && t.y < 2 ** z));
    assert.equal(
      c.unique.some((k) => a.unique.includes(k)),
      false,
    );
    if (z >= 3) assert.equal(b.unique.filter((k) => a.unique.includes(k)).length, 9);
  }
  assert.equal(viewportTiles(0, 0, 'v1').unique.length, 1);
  assert.equal(viewportTiles(10, 0, 'v1').unique.length, 12);
  assert.throws(() => tileBudget(22, 25));
});
test('consistent A* and Dijkstra agree on shortest fixed-snapshot route; closures are hard constraints', () => {
  for (let factor = 1; factor <= 6; factor += 0.25)
    for (const closed of [false, true]) {
      const d = routeSearch('dijkstra', factor, closed),
        a = routeSearch('astar', factor, closed);
      assert.ok(Math.abs(d.minutes - a.minutes) < 1e-9);
      assert.equal(a.path[0], 16);
      assert.equal(a.path.at(-1), 23);
      let sum = 0;
      for (let i = 1; i < a.path.length; i++) {
        const edge = a.edges.find(
          (e) =>
            (e.from === a.path[i - 1] && e.to === a.path[i]) ||
            (e.to === a.path[i - 1] && e.from === a.path[i]),
        );
        assert.ok(edge);
        sum += edge.minutes;
      }
      assert.ok(Math.abs(sum - a.minutes) < 1e-9);
      if (closed) assert.ok(!a.edges.some((e) => e.from === 19 && e.to === 20));
    }
  assert.equal(routeSearch('dijkstra', 1, false).minutes, 7);
  assert.ok(routeSearch('astar', 1, true).minutes > 7);
  assert.throws(() => routeSearch('astar', 0, false));
});
test('ETA evidence decays towards historical fallback with explicit count/age assumptions', () => {
  assert.equal(blendedEta(0, 20, 20).minutes, 30);
  assert.equal(blendedEta(0, 0, 20).minutes, 15);
  assert.equal(blendedEta(601, 20, 20).minutes, 15);
  assert.ok(blendedEta(300, 20, 20).trust < blendedEta(0, 20, 20).trust);
  assert.ok(blendedEta(0, 5, 20).trust < blendedEta(0, 20, 20).trust);
  assert.throws(() => blendedEta(-1, 20, 20));
});
