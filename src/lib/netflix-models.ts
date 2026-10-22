/** Small declared fixtures, not Netflix data, VMAF measurements or production simulations. */
export type RateQualityPoint = { id: string; resolution: number; mbps: number; quality: number };
const points = [
  ['480-08', 480, 0.8],
  ['720-15', 720, 1.5],
  ['1080-22', 1080, 2.2],
  ['720-25', 720, 2.5],
  ['720-40', 720, 4],
  ['1080-40', 1080, 4],
  ['1080-60', 1080, 6],
] as const;
export function netflixQuality(complex: boolean, cap: number, floor: number, budget: number) {
  const scores = complex ? [48, 62, 68, 76, 80, 87, 93] : [72, 86, 94, 87, 91, 95, 96];
  const all: RateQualityPoint[] = points.map(([id, resolution, mbps], i) => ({
    id,
    resolution,
    mbps,
    quality: scores[i],
  }));
  const compatible = all.filter((p) => p.resolution <= cap);
  const frontier = compatible.filter(
    (p) =>
      !compatible.some(
        (q) =>
          q.mbps <= p.mbps && q.quality >= p.quality && (q.mbps < p.mbps || q.quality > p.quality),
      ),
  );
  const selected =
    frontier
      .filter((p) => p.quality >= floor && p.mbps <= budget)
      .sort((a, b) => a.mbps - b.mbps || b.quality - a.quality)[0] ?? null;
  const fixed =
    compatible
      .filter((p) => p.resolution === Math.min(cap, 1080))
      .sort((a, b) => b.mbps - a.mbps)[0] ?? null;
  const twoHourGB = (p: RateQualityPoint | null) => (p ? (p.mbps * 7200) / 8 / 1000 : null);
  return {
    all,
    compatible,
    frontier,
    selected,
    fixed,
    selectedGB: twoHourGB(selected),
    fixedGB: twoHourGB(fixed),
    fixedMeets: !!fixed && fixed.mbps <= budget && fixed.quality >= floor,
    status: selected ? 'TARGET_MET' : 'TARGET_UNMET',
  };
}
export const fillAssets = [
  { id: 'A', gb: 6, plays: 110 },
  { id: 'B', gb: 5, plays: 100 },
  { id: 'C', gb: 5, plays: 100 },
  { id: 'D', gb: 3, plays: 30 },
  { id: 'E', gb: 1, plays: 20 },
] as const;
export function netflixFill(storageGB: number, fillMbps: number, minutes: number) {
  const fillGB = Math.max(0, (fillMbps * minutes * 60) / 8 / 1000);
  const budget = Math.max(0, Math.min(storageGB, fillGB));
  const stats = (ids: string[]) => {
    const items = fillAssets.filter((a) => ids.includes(a.id));
    const gb = items.reduce((s, a) => s + a.gb, 0);
    const savedGB = items.reduce((s, a) => s + a.gb * a.plays, 0);
    const plays = items.reduce((s, a) => s + a.plays, 0);
    return {
      ids: items.map((a) => a.id),
      gb,
      savedGB,
      plays,
      byteHit: savedGB / fillAssets.reduce((s, a) => s + a.gb * a.plays, 0),
      requestHit: plays / fillAssets.reduce((s, a) => s + a.plays, 0),
    };
  };
  const greedyIds: string[] = [];
  let used = 0;
  for (const a of [...fillAssets].sort((a, b) => b.plays - a.plays)) {
    if (used + a.gb <= budget) {
      greedyIds.push(a.id);
      used += a.gb;
    }
  }
  let optimal = stats([]);
  for (let mask = 1; mask < 1 << fillAssets.length; mask++) {
    const candidate = stats(fillAssets.filter((_, i) => mask & (1 << i)).map((a) => a.id));
    if (
      candidate.gb <= budget &&
      (candidate.savedGB > optimal.savedGB ||
        (candidate.savedGB === optimal.savedGB && candidate.gb < optimal.gb))
    )
      optimal = candidate;
  }
  return { budget, fillGB, greedy: stats(greedyIds), optimal };
}
export function netflixLive(
  millions: number,
  joinSeconds: number,
  variants: number,
  policy: 'none' | 'edge' | 'shield',
  bufferSegments: number,
) {
  // Assume each of 20 POPs receives requests for every variant of this one segment.
  const viewers = millions * 1_000_000,
    pops = 20;
  const controlRps = (viewers * 2) / Math.max(1, joinSeconds),
    controlCapacity = 100_000;
  const originFetches =
    policy === 'none' ? viewers : policy === 'edge' ? pops * variants : variants;
  const segmentMB = 2,
    segmentSeconds = 4,
    encodePackSeconds = 3,
    networkSeconds = 1,
    failoverSeconds = 6;
  const bufferSeconds = bufferSegments * segmentSeconds;
  return {
    viewers,
    pops,
    controlRps,
    controlCapacity,
    controlOverload: Math.max(0, controlRps - controlCapacity),
    originFetches,
    originGB: (originFetches * segmentMB) / 1000,
    edgeEgressGB: (viewers * segmentMB) / 1000,
    latencySeconds: encodePackSeconds + networkSeconds + bufferSeconds,
    bufferSeconds,
    failoverSeconds,
    stallSeconds: Math.max(0, failoverSeconds - bufferSeconds),
  };
}
