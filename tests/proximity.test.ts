import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gridSearch,
  geoPoints,
  clusteredPoints,
  quadPartition,
  quadQuery,
} from '../src/lib/proximity-models';
test('bounding-box cell covers never lose true radius matches; center-only can lose boundary neighbors', () => {
  for (const size of [1, 2, 3, 4, 5])
    for (const x of [0, 2.9, 5, 9.9, 10])
      for (const y of [0, 3.1, 5, 10])
        for (const radius of [0.5, 2, 5]) {
          const result = gridSearch(x, y, radius, size);
          assert.deepEqual(
            result.exact.map((p) => p.id),
            result.truth.map((p) => p.id),
          );
          assert.equal(result.missed.length, 0);
          assert.ok(result.candidates.length >= result.exact.length);
        }
  assert.ok(gridSearch(5, 5, 2, 2, true).missed.length > 0);
  assert.throws(() => gridSearch(NaN, 5, 2, 2));
});
test('adaptive leaves partition the region, keep every point exactly once and stop at bounded depth for duplicates', () => {
  for (const points of [
    geoPoints,
    [...geoPoints, ...clusteredPoints],
    Array.from({ length: 20 }, (_, i) => ({ id: 'D' + i, x: 1, y: 1 })),
  ])
    for (const capacity of [1, 2, 8])
      for (const depth of [0, 2, 6]) {
        const leaves = quadPartition(points, capacity, depth);
        assert.equal(
          leaves.reduce((s, l) => s + l.size * l.size, 0),
          100,
        );
        assert.deepEqual(
          leaves.flatMap((l) => l.points.map((p) => p.id)).sort(),
          points.map((p) => p.id).sort(),
        );
        assert.ok(
          leaves.every(
            (l) => l.depth <= depth && (l.points.length <= capacity || l.depth === depth),
          ),
        );
        assert.ok(
          leaves.every((l) =>
            l.points.every(
              (p) => p.x >= l.x && p.x < l.x + l.size && p.y >= l.y && p.y < l.y + l.size,
            ),
          ),
        );
      }
  assert.throws(() => quadPartition([{ id: 'bad', x: 10, y: 1 }], 2, 4));
});

test('quadtree circle pruning preserves exact matches and checks fewer points for selective queries', () => {
  const points = [...geoPoints, ...clusteredPoints];
  for (const capacity of [1, 2, 8])
    for (const depth of [0, 2, 6])
      for (const [x, y, radius] of [
        [0, 0, 0],
        [5, 5, 2],
        [10, 10, 5],
        [2, 8, 0.3],
      ]) {
        const q = quadQuery(points, capacity, depth, x, y, radius),
          expected = points
            .filter((p) => Math.hypot(p.x - x, p.y - y) <= radius)
            .map((p) => p.id)
            .sort();
        assert.deepEqual(q.found.map((p) => p.id).sort(), expected);
        assert.ok(q.checked <= points.length);
        assert.ok(q.visited.length <= q.totalNodes);
      }
  const selective = quadQuery(points, 2, 6, 2, 8, 0.3);
  assert.ok(selective.checked < points.length);
  assert.ok(selective.visited.length < selective.totalNodes);
  assert.deepEqual(
    selective.found.map((p) => p.id),
    ['P2'],
  );
  assert.throws(() => quadQuery(points, 2, 6, NaN, 5, 1), RangeError);
});
