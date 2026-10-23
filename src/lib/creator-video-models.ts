// Synthetic fixtures, not measurements or models of a private recommendation system.
export const recommendationFixture = [
  { id: 'v01', affinity: 99, utility: 30, eligible: true },
  { id: 'v02', affinity: 97, utility: 42, eligible: true },
  { id: 'v03', affinity: 95, utility: 100, eligible: false },
  { id: 'v04', affinity: 92, utility: 72, eligible: true },
  { id: 'v05', affinity: 90, utility: 35, eligible: true },
  { id: 'v06', affinity: 88, utility: 65, eligible: true },
  { id: 'v07', affinity: 85, utility: 91, eligible: true },
  { id: 'v08', affinity: 81, utility: 62, eligible: true },
  { id: 'v09', affinity: 77, utility: 50, eligible: true },
  { id: 'v10', affinity: 74, utility: 45, eligible: true },
  { id: 'v11', affinity: 68, utility: 95, eligible: true },
  { id: 'v12', affinity: 60, utility: 20, eligible: true },
  { id: 'v13', affinity: 55, utility: 88, eligible: true },
  { id: 'v14', affinity: 40, utility: 10, eligible: true },
  { id: 'v15', affinity: 30, utility: 98, eligible: true },
  { id: 'v16', affinity: 20, utility: 60, eligible: true },
];
export function creatorRetrieval(
  count: number,
  slots: number,
  budgetMs: number,
  multipleSources: boolean,
) {
  if (
    !Number.isInteger(count) ||
    count < 2 ||
    count > 16 ||
    !Number.isInteger(slots) ||
    slots < 1 ||
    slots > 8 ||
    !Number.isFinite(budgetMs) ||
    budgetMs <= 0
  )
    throw new RangeError('Invalid fixture budget');
  const primary = recommendationFixture.map((v) => v.id),
    secondary = ['v11', 'v15', 'v07', 'v13', 'v04', 'v16'];
  // Independent discovery source, fixed before selecting candidate count. Deduplicate the union.
  const order = multipleSources
    ? [...new Set(primary.flatMap((id, i) => (secondary[i] ? [id, secondary[i]] : [id])))]
    : primary;
  const candidates = order
    .slice(0, count)
    .map((id) => recommendationFixture.find((v) => v.id === id)!);
  const eligible = candidates.filter((v) => v.eligible),
    ranked = [...eligible].sort((a, b) => b.utility - a.utility || a.id.localeCompare(b.id));
  const oracle = [...recommendationFixture]
    .filter((v) => v.eligible)
    .sort((a, b) => b.utility - a.utility)
    .slice(0, 4);
  const relevant = oracle.filter((v) => eligible.some((c) => c.id === v.id));
  const batches = Math.ceil(eligible.length / slots),
    retrievalMs = 5 + count * 0.25,
    rankMs = batches * 4,
    totalMs = retrievalMs + rankMs + 3;
  return {
    candidates,
    eligible,
    ranked,
    shown: ranked.slice(0, 3),
    oracle: oracle.map((v) => v.id),
    relevant: relevant.length,
    recall: relevant.length / 4,
    batches,
    retrievalMs,
    rankMs,
    totalMs,
    withinBudget: totalMs <= budgetMs,
    fullRankMs: Math.ceil(recommendationFixture.filter((v) => v.eligible).length / slots) * 4,
  };
}
export function codecPayback(
  views: number,
  eligiblePercent: number,
  minutes: number,
  savedMbps: number,
  encodeDollars: number,
  months: number,
) {
  if (
    ![views, eligiblePercent, minutes, savedMbps, encodeDollars, months].every(Number.isFinite) ||
    views < 0 ||
    eligiblePercent < 0 ||
    eligiblePercent > 100 ||
    minutes <= 0 ||
    savedMbps <= 0 ||
    encodeDollars < 0 ||
    months < 1
  )
    throw new RangeError('Invalid codec assumptions');
  const fraction = eligiblePercent / 100,
    seconds = minutes * 60,
    gbPerCompatibleView = (seconds * savedMbps) / 8000,
    egressDollarsPerGb = 0.04,
    storageDollarsPerMonth = 3,
    fixedCost = encodeDollars + months * storageDollarsPerMonth,
    savingsPerAllView = fraction * gbPerCompatibleView * egressDollarsPerGb,
    savedGb = views * fraction * gbPerCompatibleView,
    savings = savedGb * egressDollarsPerGb;
  return {
    fixedCost,
    savedGb,
    savings,
    net: savings - fixedCost,
    gbPerCompatibleView,
    breakEvenViews: savingsPerAllView === 0 ? null : Math.ceil(fixedCost / savingsPerAllView),
    compatibleViews: views * fraction,
    storageDollarsPerMonth,
    egressDollarsPerGb,
  };
}
export function shortPrefetch(
  depth: number,
  nextIndex: number,
  networkMbps: number,
  windowMs: number,
  watchSeconds: number,
) {
  if (
    !Number.isInteger(depth) ||
    depth < 0 ||
    depth > 5 ||
    !Number.isInteger(nextIndex) ||
    nextIndex < 1 ||
    nextIndex > 5 ||
    !Number.isFinite(networkMbps) ||
    networkMbps <= 0 ||
    !Number.isFinite(windowMs) ||
    windowMs < 0 ||
    !Number.isFinite(watchSeconds) ||
    watchSeconds < 0
  )
    throw new RangeError('Invalid prefetch fixture');
  // Reserve the current clip's constant 1.2 Mbps first; prefetch uses only spare bandwidth.
  const clipMbps = 1.2,
    prefixSeconds = 2,
    prefixMb = (clipMbps * prefixSeconds) / 8,
    spareMbps = Math.max(0, networkMbps - clipMbps),
    prefetchedMb = Math.min(depth * prefixMb, ((spareMbps / 8) * windowMs) / 1000),
    clips = Array.from({ length: 5 }, (_, i) => ({
      index: i + 1,
      mb: i < depth ? Math.min(prefixMb, Math.max(0, prefetchedMb - i * prefixMb)) : 0,
    })),
    selectedMb = clips[nextIndex - 1].mb,
    usefulMb = Math.min(selectedMb, (watchSeconds * clipMbps) / 8),
    wastedMb = Math.max(0, prefetchedMb - usefulMb),
    startupMs = 80 + ((prefixMb - selectedMb) / (networkMbps / 8)) * 1000;
  return {
    clips,
    prefixMb,
    spareMbps,
    prefetchedMb,
    selectedMb,
    usefulMb,
    wastedMb,
    startupMs,
    fullyWarmed: clips.filter((v) => v.mb >= prefixMb - 1e-10).length,
  };
}
