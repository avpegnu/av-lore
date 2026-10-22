export function tileBudget(zoom: number, tileKB: number) {
  if (
    !Number.isInteger(zoom) ||
    zoom < 0 ||
    zoom > 21 ||
    !Number.isFinite(tileKB) ||
    tileKB < 1 ||
    tileKB > 100
  )
    throw new RangeError('Invalid bounded tile budget');
  const side = 2 ** zoom,
    level = side * side,
    pyramid = (4 ** (zoom + 1) - 1) / 3;
  return { side, level, pyramid, naivePB: (pyramid * tileKB) / 1e12 };
}
// Synthetic projected pixel plane:256px tiles,768x512px viewport centered
// at fractional tile position(x+.75,y+.5). Horizontal world wrap, vertical
// clipping; no real map data.
export function viewportTiles(zoom: number, pan: number, version: string) {
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > 21 || !Number.isInteger(pan))
    throw new RangeError('Invalid bounded tile viewport');
  const side = 2 ** zoom,
    cx = Math.floor(side / 2) + pan,
    cy = Math.floor(side / 2);
  const tiles: { x: number; y: number; dx: number; dy: number; key: string }[] = [];
  // [cx-1,cx+2] contains four intersected columns at this horizontal offset.
  // Three rows intersect: [cy-1,cy+1]. Wrapped duplicates are drawn but
  // fetched only once through unique keys when the low-zoom world repeats.
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 2; dx++) {
      const y = cy + dy;
      if (y < 0 || y >= side) continue;
      const x = (((cx + dx) % side) + side) % side;
      tiles.push({ x, y, dx, dy, key: `${version}/${zoom}/${x}/${y}` });
    }
  return { tiles, unique: [...new Set(tiles.map((t) => t.key))] };
}
export const roadNodes = Array.from({ length: 40 }, (_, id) => ({
  id,
  x: id % 8,
  y: Math.floor(id / 8),
}));
export function roadEdges(congestion: number, bridgeClosed: boolean) {
  if (!Number.isFinite(congestion) || congestion < 1 || congestion > 6)
    throw new RangeError('Invalid bounded traffic scenario');
  return roadNodes.flatMap((n) => {
    const edges: { from: number; to: number; minutes: number; busy: boolean }[] = [];
    if (n.x < 7 && (n.x !== 3 || n.y === 0 || (n.y === 2 && !bridgeClosed))) {
      const busy = n.y === 2 && n.x >= 2 && n.x <= 4;
      edges.push({ from: n.id, to: n.id + 1, minutes: busy ? congestion : 1, busy });
    }
    if (n.y < 4) edges.push({ from: n.id, to: n.id + 8, minutes: 1.2, busy: false });
    return edges;
  });
}
// Every displayed road is two-way. Query uses a fixed nonnegative snapshot.
// One grid unit is1km and no edge allows speed above60km/h: Euclidean
// distance in grid units is therefore a consistent lower bound in minutes.
export function routeSearch(
  algorithm: 'dijkstra' | 'astar',
  congestion: number,
  bridgeClosed: boolean,
) {
  const edges = roadEdges(congestion, bridgeClosed),
    start = 16,
    goal = 23;
  const distances = Array(40).fill(Infinity) as number[],
    previous = Array(40).fill(-1) as number[],
    settled = new Set<number>(),
    order: number[] = [];
  distances[start] = 0;
  const h = (id: number) =>
    algorithm === 'astar' ? Math.hypot(roadNodes[id].x - 7, roadNodes[id].y - 2) : 0;
  while (settled.size < 40) {
    const candidates = roadNodes.filter(
      (n) => !settled.has(n.id) && Number.isFinite(distances[n.id]),
    );
    candidates.sort((a, b) => distances[a.id] + h(a.id) - distances[b.id] - h(b.id) || a.id - b.id);
    if (!candidates.length) break;
    const id = candidates[0].id;
    settled.add(id);
    order.push(id);
    if (id === goal) break;
    for (const e of edges) {
      const next = e.from === id ? e.to : e.to === id ? e.from : -1;
      if (next < 0 || settled.has(next)) continue;
      const cost = distances[id] + e.minutes;
      if (cost < distances[next]) {
        distances[next] = cost;
        previous[next] = id;
      }
    }
  }
  const path: number[] = [];
  if (Number.isFinite(distances[goal])) {
    for (let id = goal; id !== -1; id = previous[id]) path.push(id);
    path.reverse();
  }
  return { edges, order, path, minutes: distances[goal] };
}
export function blendedEta(age: number, samples: number, live: number) {
  if (
    !Number.isFinite(age) ||
    age < 0 ||
    age > 900 ||
    !Number.isInteger(samples) ||
    samples < 0 ||
    samples > 40 ||
    !Number.isFinite(live) ||
    live < 5 ||
    live > 80
  )
    throw new RangeError('Invalid bounded ETA evidence');
  const historical = 40,
    trust = age > 600 ? 0 : Math.min(1, samples / 20) * Math.exp(-age / 300),
    speed = trust * live + (1 - trust) * historical;
  return { historical, trust, speed, minutes: (10 / speed) * 60 };
}
