/** Synthetic serving fixtures, not production quality/cost estimates. */
export type RoutePolicy = 'small' | 'large' | 'router' | 'cascade';
export function routingPolicies(
  easyShare: number,
  routerAccuracy: number,
  recall: number,
  falseAlarm: number,
) {
  for (const x of [easyShare, routerAccuracy, recall, falseAlarm])
    if (x < 0 || x > 1) throw new Error('Invalid probability');
  // Joint outcomes [both correct, small-only correct, large-only correct, both wrong].
  const easy = [0.85, 0.05, 0.08, 0.02],
    hard = [0.35, 0.1, 0.45, 0.1];
  const joint = easy.map((x, i) => easyShare * x + (1 - easyShare) * hard[i]);
  const qs = joint[0] + joint[1],
    ql = joint[0] + joint[2],
    pEsc = (1 - qs) * recall + qs * falseAlarm;
  const mix = (a: number, b: number) => easyShare * a + (1 - easyShare) * b;
  const pSmall = mix(routerAccuracy, 1 - routerAccuracy);
  const qRouter = mix(
    routerAccuracy * (easy[0] + easy[1]) + (1 - routerAccuracy) * (easy[0] + easy[2]),
    (1 - routerAccuracy) * (hard[0] + hard[1]) + routerAccuracy * (hard[0] + hard[2]),
  );
  const quantile = (pSlow: number, fast: number, slow: number) =>
    pSlow > 0.05 + 1e-12 ? slow : fast;
  const policies = [
    { id: 'small' as const, quality: qs, cost: 1, meanSec: 0.5, p95Sec: 0.5, largeShare: 0 },
    { id: 'large' as const, quality: ql, cost: 8, meanSec: 2, p95Sec: 2, largeShare: 1 },
    {
      id: 'router' as const,
      quality: qRouter,
      cost: 0.05 + pSmall + 8 * (1 - pSmall),
      meanSec: 0.05 + 0.5 * pSmall + 2 * (1 - pSmall),
      p95Sec: quantile(1 - pSmall, 0.55, 2.05),
      largeShare: 1 - pSmall,
    },
    {
      id: 'cascade' as const,
      quality: joint[0] + joint[1] * (1 - falseAlarm) + joint[2] * recall,
      cost: 1.2 + 8 * pEsc,
      meanSec: 0.6 + 2 * pEsc,
      p95Sec: quantile(pEsc, 0.6, 2.6),
      largeShare: pEsc,
    },
  ];
  return { joint, policies, regressed: joint[1] * falseAlarm, recovered: joint[2] * recall };
}
const adapters = {
  A: { tenant: 'alpha', base: 'v1', size: 2 },
  B: { tenant: 'beta', base: 'v1', size: 2 },
  C: { tenant: 'alpha', base: 'v1', size: 3 },
  D: { tenant: 'alpha', base: 'v2', size: 1 },
} as const;
export type AdapterId = keyof typeof adapters;
export function adapterAdmission(
  target: AdapterId,
  capacity: number,
  caller: 'alpha' | 'beta',
  pinA: boolean,
  pinB: boolean,
) {
  if (capacity < 4 || capacity > 8) throw new Error('Invalid adapter capacity');
  const requested = adapters[target],
    initial: AdapterId[] = ['A', 'B'];
  const result = (
    status: 'HIT' | 'LOAD' | 'WAIT' | 'DENIED' | 'INCOMPATIBLE',
    resident: AdapterId[] = initial,
    evicted: AdapterId[] = [],
    loadGiB = 0,
  ) => ({
    status,
    resident,
    evicted,
    loadGiB,
    usedGiB: resident.reduce((s, k) => s + adapters[k].size, 0),
    transferMs: loadGiB ? ((loadGiB * 2 ** 30) / 8e9) * 1000 + 20 : 0,
  });
  if (requested.tenant !== caller) return result('DENIED');
  if (requested.base !== 'v1') return result('INCOMPATIBLE');
  if (initial.includes(target)) return result('HIT');
  const plan: AdapterId[] = [...initial],
    evicted: AdapterId[] = [];
  // Fixed LRU order: A older than B. Plan atomically; never evict an active adapter.
  for (const candidate of initial) {
    if (plan.reduce((s, k) => s + adapters[k].size, 0) + requested.size <= capacity) break;
    if (candidate === 'A' ? pinA : pinB) continue;
    plan.splice(plan.indexOf(candidate), 1);
    evicted.push(candidate);
  }
  if (plan.reduce((s, k) => s + adapters[k].size, 0) + requested.size > capacity)
    return result('WAIT');
  return result('LOAD', [...plan, target], evicted, requested.size);
}
export function servingEconomics(
  gpus: number,
  price: number,
  tps: number,
  busy: number,
  windowBasis: boolean,
  overhead: number,
  qualifying: number,
) {
  if (
    gpus < 1 ||
    price < 0 ||
    tps < 0 ||
    busy < 0 ||
    busy > 1 ||
    overhead < 0 ||
    qualifying < 0 ||
    qualifying > 1
  )
    throw new Error('Invalid economics');
  const hourly = gpus * price + overhead,
    observedTps = tps * (windowBasis ? 1 : busy),
    sloTps = observedTps * qualifying;
  return {
    hourly,
    observedTps,
    sloTps,
    millionCost: observedTps ? (hourly / (observedTps * 3600)) * 1e6 : null,
    sloMillionCost: sloTps ? (hourly / (sloTps * 3600)) * 1e6 : null,
  };
}
