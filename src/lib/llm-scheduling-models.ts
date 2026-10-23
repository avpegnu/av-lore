// Deterministic analytical fixtures; not a GPU simulator or production scheduling algorithm.
export function prefillInterference(
  promptTokens: number,
  chunkTokens: number,
  decodeStreams: number,
  mode: 'chunked' | 'monolithic' | 'decode-only',
) {
  if (
    ![promptTokens, chunkTokens, decodeStreams].every(Number.isInteger) ||
    promptTokens <= 0 ||
    chunkTokens <= 0 ||
    decodeStreams < 1 ||
    decodeStreams > 16
  )
    throw new RangeError('Invalid scheduler fixture');
  const chunks =
    mode === 'decode-only'
      ? Array(8).fill(0)
      : mode === 'monolithic'
        ? [promptTokens]
        : Array.from({ length: Math.ceil(promptTokens / chunkTokens) }, (_, i) =>
            Math.min(chunkTokens, promptTokens - i * chunkTokens),
          );
  let time = 0,
    remaining = promptTokens;
  const iterations = chunks.map((prefill, index) => {
    const duration = 2 + decodeStreams + prefill / 128,
      start = time;
    time += duration;
    remaining -= prefill;
    return {
      index: index + 1,
      start,
      end: time,
      duration,
      prefill,
      decodeTokens: decodeStreams,
      remaining,
    };
  });
  return {
    iterations,
    remaining,
    firstTokenMs: remaining === 0 ? time : null,
    maxDecodeGap: Math.max(...iterations.map((i) => i.duration)),
    promptProcessed: promptTokens - remaining,
    elapsed: time,
  };
}
export function speculativeMass(
  target: number[],
  draftWeights: number[],
  residualCorrection: boolean,
) {
  if (
    target.length !== 3 ||
    draftWeights.length !== 3 ||
    ![...target, ...draftWeights].every((n) => Number.isFinite(n) && n >= 0) ||
    Math.abs(target.reduce((s, n) => s + n, 0) - 1) > 1e-9
  )
    throw new RangeError('Invalid distribution');
  const sum = draftWeights.reduce((s, n) => s + n, 0);
  if (sum === 0) return null;
  const draft = draftWeights.map((n) => n / sum),
    accepted = target.map((p, i) => Math.min(p, draft[i])),
    acceptance = accepted.reduce((s, n) => s + n, 0),
    rejection = Math.max(0, 1 - acceptance),
    positive = target.map((p, i) => Math.max(0, p - draft[i])),
    denom = positive.reduce((s, n) => s + n, 0),
    correction = residualCorrection
      ? denom > 1e-12
        ? positive.map((n) => n / denom)
        : [0, 0, 0]
      : target,
    output = accepted.map((n, i) => n + rejection * correction[i]),
    totalVariation = output.reduce((s, n, i) => s + Math.abs(n - target[i]), 0) / 2;
  return {
    target,
    draft,
    accepted,
    acceptance,
    rejection,
    correction,
    output,
    totalVariation,
    acceptanceGivenDraft: draft.map((q, i) => (q === 0 ? null : Math.min(1, target[i] / q))),
  };
}
export function speculativeCost(
  alpha: number,
  gamma: number,
  draftMs: number,
  verifyExtraMs: number,
  draftGiB: number,
) {
  if (
    !Number.isFinite(alpha) ||
    alpha < 0 ||
    alpha > 1 ||
    !Number.isInteger(gamma) ||
    gamma < 0 ||
    gamma > 12 ||
    ![draftMs, verifyExtraMs, draftGiB].every((n) => Number.isFinite(n) && n >= 0)
  )
    throw new RangeError('Invalid speculative assumptions');
  const baselineMs = 20;
  const estimate = (g: number) => {
    const expectedTokens = Array.from({ length: g + 1 }, (_, i) => alpha ** i).reduce(
        (s, n) => s + n,
        0,
      ),
      cycleMs = g === 0 ? baselineMs : g * draftMs + baselineMs + g * verifyExtraMs + 2,
      speedup = (baselineMs * expectedTokens) / cycleMs;
    return { gamma: g, expectedTokens, cycleMs, speedup, canAdmit: g === 0 || 8 - draftGiB >= 1 };
  };
  const choices = Array.from({ length: 9 }, (_, g) => estimate(g)),
    chosen = estimate(gamma),
    best = choices.filter((c) => c.canAdmit).reduce((a, b) => (b.speedup > a.speedup ? b : a)),
    baselineSlots = 8,
    kvBudgetGiB = Math.max(0, 8 - (gamma === 0 ? 0 : draftGiB)),
    slots = Math.floor(kvBudgetGiB);
  return { ...chosen, choices, best, baselineSlots, kvBudgetGiB, slots };
}
export function splitServing(
  kvGiB: number,
  linkGBps: number,
  monolithicQueueMs: number,
  splitQueueMs: number,
  ttftBudget: number,
) {
  if (
    ![kvGiB, linkGBps, ttftBudget].every((n) => Number.isFinite(n) && n > 0) ||
    ![monolithicQueueMs, splitQueueMs].every((n) => Number.isFinite(n) && n >= 0)
  )
    throw new RangeError('Invalid split serving assumptions');
  const transferMs = ((kvGiB * 2 ** 30) / (linkGBps * 1e9)) * 1000 + 2,
    monolithic = [monolithicQueueMs, 70, 20],
    split = [splitQueueMs, 40, transferMs, splitQueueMs, 12],
    monolithicTtft = monolithic.reduce((s, n) => s + n, 0),
    splitTtft = split.reduce((s, n) => s + n, 0),
    monolithicTpot = 25,
    splitTpot = 12,
    tpotBudget = 20;
  return {
    transferMs,
    monolithic,
    split,
    monolithicTtft,
    splitTtft,
    monolithicTpot,
    splitTpot,
    tpotBudget,
    monolithicMeetsBoth: monolithicTtft <= ttftBudget && monolithicTpot <= tpotBudget,
    splitMeetsBoth: splitTtft <= ttftBudget && splitTpot <= tpotBudget,
  };
}
