export type GeoPoint = { id: string; x: number; y: number };
export const geoPoints: GeoPoint[] = [
  { id: 'P1', x: 1, y: 1 },
  { id: 'P2', x: 2, y: 8 },
  { id: 'P3', x: 4.8, y: 4.8 },
  { id: 'P4', x: 5.1, y: 4.9 },
  { id: 'P5', x: 5.3, y: 5.2 },
  { id: 'P6', x: 6.1, y: 6 },
  { id: 'P7', x: 7, y: 4 },
  { id: 'P8', x: 8, y: 8 },
  { id: 'P9', x: 9, y: 2 },
  { id: 'P10', x: 4, y: 6 },
  { id: 'P11', x: 2.8, y: 4.9 },
  { id: 'P12', x: 6.8, y: 3.8 },
];
export const clusteredPoints: GeoPoint[] = Array.from({ length: 16 }, (_, i) => ({
  id: 'C' + (i + 1),
  x: 4.55 + (i % 4) * 0.12,
  y: 4.55 + Math.floor(i / 4) * 0.12,
}));
export function gridSearch(x: number, y: number, radius: number, size: number, centerOnly = false) {
  if (
    ![x, y, radius, size].every(Number.isFinite) ||
    x < 0 ||
    x > 10 ||
    y < 0 ||
    y > 10 ||
    radius < 0 ||
    radius > 5 ||
    size < 1 ||
    size > 5
  )
    throw new RangeError('Invalid bounded teaching coordinates');
  const cell = (v: number) => Math.floor(v / size),
    cells: { x: number; y: number }[] = [];
  const minX = centerOnly ? cell(x) : cell(x - radius),
    maxX = centerOnly ? cell(x) : cell(x + radius),
    minY = centerOnly ? cell(y) : cell(y - radius),
    maxY = centerOnly ? cell(y) : cell(y + radius);
  for (let cx = minX; cx <= maxX; cx++)
    for (let cy = minY; cy <= maxY; cy++) cells.push({ x: cx, y: cy });
  const candidates = geoPoints.filter(
    (p) => cell(p.x) >= minX && cell(p.x) <= maxX && cell(p.y) >= minY && cell(p.y) <= maxY,
  );
  const distance = (p: GeoPoint) => Math.hypot(p.x - x, p.y - y),
    sort = (a: GeoPoint, b: GeoPoint) => distance(a) - distance(b) || a.id.localeCompare(b.id);
  const exact = candidates.filter((p) => distance(p) <= radius).sort(sort),
    truth = geoPoints.filter((p) => distance(p) <= radius).sort(sort);
  return {
    cells,
    candidates,
    exact,
    truth,
    missed: truth.filter((p) => !exact.includes(p)),
    distance,
  };
}
export type QuadLeaf = { x: number; y: number; size: number; depth: number; points: GeoPoint[] };
export function quadPartition(points: GeoPoint[], capacity: number, maxDepth: number): QuadLeaf[] {
  if (
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    capacity > 8 ||
    !Number.isInteger(maxDepth) ||
    maxDepth < 0 ||
    maxDepth > 6
  )
    throw new RangeError('Invalid bounded tree configuration');
  if (
    points.some(
      (p) =>
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        p.x < 0 ||
        p.x >= 10 ||
        p.y < 0 ||
        p.y >= 10,
    )
  )
    throw new RangeError('Points outside half-open teaching region');
  const leaves: QuadLeaf[] = [];
  function split(x: number, y: number, size: number, depth: number, contained: GeoPoint[]) {
    if (contained.length <= capacity || depth === maxDepth) {
      leaves.push({ x, y, size, depth, points: contained });
      return;
    }
    const half = size / 2;
    for (const dx of [0, half])
      for (const dy of [0, half])
        split(
          x + dx,
          y + dy,
          half,
          depth + 1,
          contained.filter(
            (p) => p.x >= x + dx && p.x < x + dx + half && p.y >= y + dy && p.y < y + dy + half,
          ),
        );
  }
  split(0, 0, 10, 0, points);
  return leaves;
}
