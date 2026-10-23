/** Explicit arithmetic and study decision fixtures, not training/quality forecasts. */
export type AdaptTarget = 'q' | 'k' | 'v' | 'o' | 'gate' | 'up' | 'down';
export function adapterBudget(
  large: boolean,
  rank: number,
  selected: AdaptTarget[],
  masterCopy: boolean,
  runtimeGiB: number,
) {
  if (!Number.isInteger(rank) || rank < 1 || rank > 256 || runtimeGiB < 0)
    throw new Error('Invalid adapter budget');
  const hidden = large ? 8192 : 4096,
    ff = large ? 28672 : 14336,
    layers = large ? 80 : 32,
    parameters = large ? 70e9 : 8e9,
    kvWidth = 1024;
  const shapes: Record<AdaptTarget, [number, number]> = {
    q: [hidden, hidden],
    k: [hidden, kvWidth],
    v: [hidden, kvWidth],
    o: [hidden, hidden],
    gate: [hidden, ff],
    up: [hidden, ff],
    down: [ff, hidden],
  };
  const rows = [...new Set(selected)].map((target) => ({
    target,
    shape: shapes[target],
    parameters: layers * rank * (shapes[target][0] + shapes[target][1]),
  }));
  const trainable = rows.reduce((s, r) => s + r.parameters, 0),
    bytesPerTrainable = masterCopy ? 16 : 12;
  const quantMetadata = Math.ceil(parameters / 128) * 2;
  const full = parameters * bytesPerTrainable,
    loRA = parameters * 2 + trainable * bytesPerTrainable,
    qLoRA = parameters * 0.5 + quantMetadata + trainable * bytesPerTrainable;
  const fixed = runtimeGiB * 2 ** 30;
  return {
    hidden,
    ff,
    layers,
    parameters,
    rows,
    trainable,
    bytesPerTrainable,
    quantMetadata,
    fullGiB: (full + fixed) / 2 ** 30,
    loraGiB: (loRA + fixed) / 2 ** 30,
    qloraGiB: (qLoRA + fixed) / 2 ** 30,
    adapterFileMiB: (trainable * 2) / 2 ** 20,
    hasTargets: trainable > 0,
  };
}
export type TuningGap = 'fresh-facts' | 'retrieval' | 'format' | 'preferences' | 'cost' | 'domain';
export function tuningExperiment(
  gap: TuningGap,
  baselineMeasured: boolean,
  dataReady: boolean,
  teacherWorks: boolean,
) {
  if (!baselineMeasured)
    return {
      state: 'NEEDS_EVALS',
      experiment: 'baseline-evaluation',
      companion: 'define-task-slices',
    };
  switch (gap) {
    case 'fresh-facts':
      return {
        state: 'CANDIDATE_EXPERIMENT',
        experiment: 'retrieval-freshness',
        companion: 'permission-and-evidence',
      };
    case 'retrieval':
      return {
        state: 'CANDIDATE_EXPERIMENT',
        experiment: 'retrieval-diagnosis',
        companion: 'ingest-candidates-packing',
      };
    case 'format':
      return {
        state: dataReady ? 'CANDIDATE_EXPERIMENT' : 'NEEDS_DATA',
        experiment: 'prompt-schema-baseline',
        companion: dataReady ? 'sft-comparison' : 'review-targets-and-holdouts',
      };
    case 'preferences':
      return {
        state: dataReady ? 'CANDIDATE_EXPERIMENT' : 'NEEDS_DATA',
        experiment: dataReady ? 'preference-comparison' : 'review-preference-pairs',
        companion: 'reference-and-regression-evaluation',
      };
    case 'cost':
      return {
        state:
          dataReady && teacherWorks
            ? 'CANDIDATE_EXPERIMENT'
            : !teacherWorks
              ? 'NEEDS_TEACHER_EVIDENCE'
              : 'NEEDS_DATA',
        experiment:
          dataReady && teacherWorks ? 'student-distillation' : 'measure-cheaper-baselines',
        companion: 'routing-cache-and-total-cost',
      };
    case 'domain':
      return {
        state: dataReady ? 'CANDIDATE_EXPERIMENT' : 'NEEDS_DATA',
        experiment: 'domain-error-analysis',
        companion: dataReady ? 'compare-retrieval-sft-cpt' : 'collect-representative-data',
      };
  }
}
export function distillationCost(
  dailyVolume: number,
  teacherPerThousand: number,
  studentPerThousand: number,
  fallback: number,
  setup: number,
  monthlyOps: number,
) {
  if (
    dailyVolume < 0 ||
    teacherPerThousand < 0 ||
    studentPerThousand < 0 ||
    fallback < 0 ||
    fallback > 1 ||
    setup < 0 ||
    monthlyOps < 0
  )
    throw new Error('Invalid cost inputs');
  const monthRequests = dailyVolume * 30,
    baseline = (monthRequests / 1000) * teacherPerThousand,
    studentInference = (monthRequests / 1000) * studentPerThousand,
    fallbackCost = (monthRequests / 1000) * fallback * teacherPerThousand;
  const monthly = studentInference + fallbackCost + monthlyOps,
    savings = baseline - monthly;
  return {
    monthRequests,
    baseline,
    studentInference,
    fallbackCost,
    monthly,
    savings,
    breakEvenDays: savings > 0 ? (setup / savings) * 30 : null,
    firstYearDifference: savings * 12 - setup,
  };
}
