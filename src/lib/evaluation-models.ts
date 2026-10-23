/** Teaching fixtures: paired binary outcomes, exact judge probabilities and explicit release gates. */
export type PairCounts = { both: number; gain: number; loss: number; neither: number };
export function pairedEvaluation(c: PairCounts, iterations = 2000, seed = 271) {
  const counts = [c.both, c.gain, c.loss, c.neither];
  if (counts.some((v) => !Number.isInteger(v) || v < 0) || iterations < 100)
    throw new Error('Invalid paired outcomes');
  const n = counts.reduce((a, b) => a + b, 0);
  if (!n) return null;
  // Each draw selects one ORIGINAL paired case; only gain/loss change the paired mean.
  let state = seed >>> 0;
  const draws: number[] = [];
  for (let b = 0; b < iterations; b++) {
    let total = 0;
    for (let j = 0; j < n; j++) {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      const index = Math.floor((state / 2 ** 32) * n);
      if (index >= c.both && index < c.both + c.gain) total++;
      else if (index >= c.both + c.gain && index < c.both + c.gain + c.loss) total--;
    }
    draws.push(total / n);
  }
  draws.sort((a, b) => a - b);
  const lo = draws[Math.floor(0.025 * (iterations - 1))],
    hi = draws[Math.ceil(0.975 * (iterations - 1))];
  return {
    n,
    baseline: (c.both + c.loss) / n,
    candidate: (c.both + c.gain) / n,
    delta: (c.gain - c.loss) / n,
    lo,
    hi,
    discordant: c.gain + c.loss,
    degenerate: c.gain + c.loss === 0 || c.gain === n || c.loss === n,
    samples: draws,
  };
}
export function wilsonInterval(passes: number, n: number) {
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(passes) || passes < 0 || passes > n)
    throw new Error('Invalid binomial counts');
  const z = 1.959963984540054,
    p = passes / n,
    divisor = 1 + (z * z) / n,
    center = (p + (z * z) / (2 * n)) / divisor,
    radius = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / divisor;
  return { lo: Math.max(0, center - radius), hi: Math.min(1, center + radius) };
}
export function judgeOrderProbabilities(
  trueB: number,
  positionShortcut: number,
  contentAccuracy: number,
) {
  if ([trueB, positionShortcut, contentAccuracy].some((v) => !Number.isFinite(v) || v < 0 || v > 1))
    throw new Error('Invalid judge probabilities');
  const b = positionShortcut,
    q = contentAccuracy,
    // Conditional on the true winner, the two judge calls use independent decisions.
    firstGivenB = b + (1 - b) * q,
    secondGivenB = (1 - b) * q,
    firstGivenA = b + (1 - b) * (1 - q),
    secondGivenA = (1 - b) * (1 - q);
  const first = trueB * firstGivenB + (1 - trueB) * firstGivenA,
    second = trueB * secondGivenB + (1 - trueB) * secondGivenA,
    bothB = trueB * firstGivenB * secondGivenB + (1 - trueB) * firstGivenA * secondGivenA,
    bothA =
      trueB * (1 - firstGivenB) * (1 - secondGivenB) +
      (1 - trueB) * (1 - firstGivenA) * (1 - secondGivenA),
    consistent = bothA + bothB;
  return {
    first,
    second,
    orderAverage: (first + second) / 2,
    bothB,
    bothA,
    unresolved: Math.max(0, 1 - consistent),
    consistentOnlyB: consistent > 0 ? bothB / consistent : null,
    trueB,
  };
}
export type EvaluationScenario = 'slice-regression' | 'privacy-failure' | 'clean';
export function evaluationGates(
  scenario: EvaluationScenario,
  minimumSliceN: number,
  calibrated: boolean,
  completeRecords: boolean,
  reviewedUncertainty: boolean,
) {
  const slices =
    scenario === 'slice-regression'
      ? [
          { name: 'general', n: 80, a: 44, b: 56 },
          { name: 'enterprise', n: 20, a: 14, b: 8 },
        ]
      : [
          { name: 'general', n: 80, a: 44, b: 52 },
          { name: 'enterprise', n: 20, a: 10, b: 14 },
        ];
  const totalN = slices.reduce((s, r) => s + r.n, 0),
    overallDelta = slices.reduce((s, r) => s + r.b - r.a, 0) / totalN;
  const failures = [
    ...slices.filter((r) => (r.b - r.a) / r.n < -0.05 - 1e-12).map((r) => 'quality/' + r.name),
    ...(scenario === 'privacy-failure' ? ['unauthorized-disclosure'] : []),
  ];
  const missingEvidence = [
    ...slices.filter((r) => r.n < minimumSliceN).map((r) => 'sample-size/' + r.name),
    ...(!calibrated ? ['judge-calibration'] : []),
    ...(!completeRecords ? ['missing-run-records'] : []),
    ...(!reviewedUncertainty ? ['uncertainty-and-holdout-review'] : []),
  ];
  return {
    slices,
    overallDelta,
    failures,
    missingEvidence,
    state: failures.length
      ? 'BLOCKED'
      : missingEvidence.length
        ? 'INSUFFICIENT_EVIDENCE'
        : 'CANARY_CANDIDATE',
  };
}
