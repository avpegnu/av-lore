export type Runway = {
  months: number | null;
  firstWholeMonth: number | null;
  samples: { month: number; ratio: number }[];
};
/** Stationary proportional-demand illustration; this is not a CPU or outage forecast. */
export function demandRunway(
  currentRatio: number,
  monthlyGrowth: number,
  targetRatio: number,
): Runway {
  for (const v of [currentRatio, monthlyGrowth, targetRatio])
    if (!Number.isFinite(v)) throw Error('NONFINITE');
  if (
    currentRatio < 0 ||
    currentRatio > 1 ||
    monthlyGrowth < 0 ||
    monthlyGrowth > 1 ||
    targetRatio <= 0 ||
    targetRatio > 1
  )
    throw Error('OUT_OF_RANGE');
  const months =
    currentRatio >= targetRatio
      ? 0
      : currentRatio === 0 || monthlyGrowth === 0
        ? null
        : Math.log(targetRatio / currentRatio) / Math.log1p(monthlyGrowth);
  return {
    months,
    firstWholeMonth: months === null ? null : Math.ceil(months - 1e-10),
    samples: Array.from({ length: 13 }, (_, month) => ({
      month,
      ratio: currentRatio * Math.pow(1 + monthlyGrowth, month),
    })),
  };
}
/** Equal fixed capacities and equal transferable loads, excluding quorum and recovery delay. */
export function survivorLoad(
  normalRatio: number,
  regions: number,
  lost: number,
  targetRatio: number,
) {
  if (
    !Number.isFinite(normalRatio) ||
    !Number.isFinite(targetRatio) ||
    normalRatio < 0 ||
    normalRatio > 1 ||
    targetRatio <= 0 ||
    targetRatio > 1 ||
    !Number.isInteger(regions) ||
    regions < 2 ||
    regions > 8 ||
    !Number.isInteger(lost) ||
    lost < 0 ||
    lost >= regions
  )
    throw Error('OUT_OF_RANGE');
  const ratio = (normalRatio * regions) / (regions - lost);
  return { ratio, fits: ratio <= targetRatio + 1e-12, survivors: regions - lost };
}
