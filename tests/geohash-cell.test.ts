import test from 'node:test';
import assert from 'node:assert/strict';
import { geohashCell, geohashNeighbors } from '../src/lib/geohash-cell';
test('geohash bisection matches a known point, preserves prefix containment and exact angular dimensions', () => {
  assert.equal(geohashCell(48, -126, 5).code, 'c0w3h');
  for (const [lat, lon] of [
    [48, -126],
    [21.0285, 105.8542],
    [0.00001, -0.00001],
    [-89.999, 179.999],
  ])
    for (let p = 1; p <= 8; p++) {
      const c = geohashCell(lat, lon, p);
      assert.ok(c.south <= lat && lat < c.north && c.west <= lon && lon < c.east);
      assert.equal(c.east - c.west, 360 / 2 ** Math.ceil((5 * p) / 2));
      assert.equal(c.north - c.south, 180 / 2 ** Math.floor((5 * p) / 2));
      assert.equal(c.steps.length, p * 5);
      if (p > 1) assert.ok(c.code.startsWith(geohashCell(lat, lon, p - 1).code));
    }
  assert.throws(() => geohashCell(90, 0, 5), RangeError);
  assert.throws(() => geohashCell(0, 180, 5), RangeError);
  assert.throws(() => geohashCell(0, 0, 9), RangeError);
});
test('neighbor browsing wraps longitude, omits polar overflow and shows prefix discontinuities across the meridian', () => {
  const around = geohashNeighbors(0.00001, -0.00001, 5),
    center = around.find((n) => n.dx === 0 && n.dy === 0)!.cell!;
  assert.equal(around.length, 9);
  assert.equal(new Set(around.map((n) => n.cell?.code)).size, 9);
  const east = around.find((n) => n.dx === 1 && n.dy === 0)!.cell!;
  assert.notEqual(center.code[0], east.code[0]);
  assert.ok(geohashNeighbors(0, 179.999, 5).some((n) => n.longitude < 0));
  assert.equal(geohashNeighbors(89.999999, 0, 1).filter((n) => n.cell === null).length, 3);
});
