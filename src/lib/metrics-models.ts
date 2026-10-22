export function cardinalityBudget(extraValues: number, coverage: number, interval: number) {
  if (
    !Number.isInteger(extraValues) ||
    extraValues < 1 ||
    extraValues > 1e6 ||
    !Number.isFinite(coverage) ||
    coverage < 0 ||
    coverage > 100 ||
    !Number.isFinite(interval) ||
    interval < 5 ||
    interval > 60
  )
    throw new RangeError('Invalid bounded cardinality scenario');
  const potential = 30 * 4 * 8 * 3 * extraValues,
    observed = Math.ceil((potential * coverage) / 100),
    samplesPerSecond = observed / interval,
    dailySamples = samplesPerSecond * 86400;
  return {
    potential,
    observed,
    samplesPerSecond,
    rawGB: (dailySamples * 16) / 1e9,
    compressedGB: (dailySamples * 2) / 1e9,
    hotTB: (dailySamples * 2 * 15 * 2) / 1e12,
    headGB: (observed * 2000) / 1e9,
  };
}
export const gaugeSamples = [
  10, 10, 10, 10, 100, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 40, 50, 60,
];
export function gaugeRollup(width: number) {
  if (!Number.isInteger(width) || width < 1 || width > 10)
    throw new RangeError('Invalid bounded rollup width');
  const buckets = Array.from({ length: Math.ceil(gaugeSamples.length / width) }, (_, i) => {
    const values = gaugeSamples.slice(i * width, (i + 1) * width),
      sum = values.reduce((s, v) => s + v, 0);
    return {
      start: i * width,
      end: i * width + values.length,
      count: values.length,
      sum,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: sum / values.length,
    };
  });
  const total = buckets.reduce((s, b) => s + b.sum, 0),
    count = buckets.reduce((s, b) => s + b.count, 0);
  return {
    buckets,
    total,
    count,
    weightedMean: total / count,
    meanOfMeans: buckets.reduce((s, b) => s + b.mean, 0) / buckets.length,
    maxAverage: Math.max(...buckets.map((b) => b.mean)),
    retainedMax: Math.max(...buckets.map((b) => b.max)),
  };
}
export const errorPercent = [
  0.2, 0.2, 12, 12, 0.2, 0.2, 0.2, 8, 8, 8, 8, 8, 8, 8, 8, 0.2, 0.2, 0.2, 0.2, 0.2,
];
export type AlertState = 'INACTIVE' | 'PENDING' | 'FIRING' | 'NO_DATA';
export function alertReplay(
  clock: number,
  threshold: number,
  forMinutes: number,
  missing: boolean,
) {
  if (
    !Number.isInteger(clock) ||
    clock < 0 ||
    clock > 19 ||
    !Number.isFinite(threshold) ||
    threshold < 1 ||
    threshold > 20 ||
    !Number.isInteger(forMinutes) ||
    forMinutes < 0 ||
    forMinutes > 5
  )
    throw new RangeError('Invalid bounded alert replay');
  let since: number | undefined,
    firstFiring: number | undefined,
    state: AlertState = 'INACTIVE',
    firingEvaluations = 0,
    noData = 0;
  const rows = errorPercent.slice(0, clock + 1).map((value, time) => {
    const rate = missing && time === 10 ? null : value;
    if (rate === null) {
      state = 'NO_DATA';
      since = undefined;
      noData++;
    } else if (rate > threshold) {
      if (since === undefined) since = time;
      state = time - since >= forMinutes ? 'FIRING' : 'PENDING';
      if (state === 'FIRING') {
        firstFiring ??= time;
        firingEvaluations++;
      }
    } else {
      state = 'INACTIVE';
      since = undefined;
    }
    return { time, rate, state, since };
  });
  return { rows, state: state as AlertState, since, firstFiring, firingEvaluations, noData };
}
