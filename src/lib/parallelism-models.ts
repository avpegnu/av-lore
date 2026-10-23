/** Hypothetical inference fixtures. No hardware benchmark or deployment planner. */
const GiB = 2 ** 30;
export function parallelLayout(
  tp: number,
  pp: number,
  dp: number,
  tokens: number,
  linkGBps: number,
  latencyUs: number,
  spread: boolean,
) {
  if (
    ![1, 2, 4, 8, 16].includes(tp) ||
    ![1, 2, 4].includes(pp) ||
    ![1, 2, 4].includes(dp) ||
    tokens < 1 ||
    linkGBps <= 0 ||
    latencyUs < 0
  )
    throw new Error('Invalid layout');
  const perReplica = tp * pp,
    nodesPerReplica = Math.ceil(perReplica / 8);
  const ranks = Array.from({ length: dp * perReplica }, (_, rank) => {
    const replica = Math.floor(rank / perReplica),
      local = rank % perReplica;
    return {
      rank,
      replica,
      stage: Math.floor(local / tp),
      shard: local % tp,
      node: spread ? replica * nodesPerReplica + Math.floor(local / 8) : Math.floor(rank / 8),
    };
  });
  const nodeIds = [...new Set(ranks.map((r) => r.node))];
  const survivors = nodeIds.map(
    (n) => dp - new Set(ranks.filter((r) => r.node === n).map((r) => r.replica)).size,
  );
  const weightsGiB = (70e9 * 2) / perReplica / GiB;
  const payloadBytes = tokens * 8192 * 2;
  // Ring all-reduce, no overlap, two collectives per layer in this chosen layout.
  const bytesPerCollective = ((2 * (tp - 1)) / tp) * payloadBytes;
  const collectiveMs =
    tp === 1
      ? 0
      : (bytesPerCollective / (linkGBps * 1e9)) * 1000 + (2 * (tp - 1) * latencyUs) / 1000;
  return {
    ranks,
    nodeIds,
    worstSurvivors: Math.min(...survivors),
    weightsGiB,
    memoryFits: weightsGiB + 8 <= 80,
    headroomGiB: 80 - weightsGiB - 8,
    payloadBytes,
    bytesPerCollective,
    stageCommMs: collectiveMs * 2 * (80 / pp),
    boundaryBytes: payloadBytes * (pp - 1),
    gpuCount: ranks.length,
  };
}
export function pipelineSchedule(
  stages: number,
  batches: number,
  slowStage: number,
  slowFactor: number,
) {
  if (
    !Number.isInteger(stages) ||
    stages < 1 ||
    stages > 8 ||
    !Number.isInteger(batches) ||
    batches < 1 ||
    batches > 16 ||
    slowStage < 0 ||
    slowStage >= stages ||
    slowFactor < 1
  )
    throw new Error('Invalid pipeline');
  const costs = Array.from({ length: stages }, (_, s) => 10 * (s === slowStage ? slowFactor : 1));
  const end = Array.from({ length: stages }, () => Array<number>(batches).fill(0));
  const tasks: { stage: number; batch: number; start: number; end: number }[] = [];
  for (let s = 0; s < stages; s++)
    for (let b = 0; b < batches; b++) {
      const start = Math.max(s ? end[s - 1][b] : 0, b ? end[s][b - 1] : 0);
      end[s][b] = start + costs[s];
      tasks.push({ stage: s, batch: b, start, end: end[s][b] });
    }
  const makespan = end[stages - 1][batches - 1],
    busy = costs.reduce((a, b) => a + b, 0) * batches;
  return {
    tasks,
    costs,
    makespan,
    utilization: busy / (stages * makespan),
    balancedUtilization: batches / (batches + stages - 1),
    firstComplete: end[stages - 1][0],
  };
}
export function expertDispatch(
  skew: boolean,
  replicate: boolean,
  capacityFactor: number,
  drop: boolean,
) {
  if (capacityFactor <= 0) throw new Error('Invalid capacity');
  const copies = Array.from({ length: 4 }, (_, e) => ({ expert: e, gpu: e, load: 0 }));
  if (replicate) for (let g = 1; g < 4; g++) copies.push({ expert: 0, gpu: g, load: 0 });
  const capacity = Math.ceil((capacityFactor * 16) / 4);
  const assignments: {
    token: number;
    origin: number;
    expert: number;
    gpu: number;
    dropped: boolean;
    queued: boolean;
  }[] = [];
  for (let t = 0; t < 8; t++) {
    const selected = skew ? [0, (t % 3) + 1] : [t % 4, (t + 1) % 4];
    for (const e of selected) {
      const origin = t % 4;
      const candidates = copies
        .filter((c) => c.expert === e)
        .sort(
          (a, b) =>
            a.load - b.load || Number(b.gpu === origin) - Number(a.gpu === origin) || a.gpu - b.gpu,
        );
      const c = candidates[0],
        overflow = c.load >= capacity;
      assignments.push({
        token: t,
        origin,
        expert: e,
        gpu: c.gpu,
        dropped: overflow && drop,
        queued: overflow && !drop,
      });
      // Count all selected work, including dropped, so capacity decisions never hide demand.
      c.load++;
    }
  }
  const delivered = assignments.filter((a) => !a.dropped);
  const gpuLoads = Array.from({ length: 4 }, (_, g) => delivered.filter((a) => a.gpu === g).length);
  const logicalLoads = Array.from(
    { length: 4 },
    (_, e) => assignments.filter((a) => a.expert === e).length,
  );
  const remote = delivered.filter((a) => a.gpu !== a.origin).length;
  return {
    copies,
    assignments,
    capacity,
    gpuLoads,
    logicalLoads,
    remote,
    transferBytes: remote * 4096 * 2 * 2, // BF16 hidden vector, dispatch + return, no headers.
    physicalGiB: copies.length * 2,
    queued: assignments.filter((a) => a.queued).length,
    dropped: assignments.filter((a) => a.dropped).length,
    waves: drop ? 1 : Math.max(...copies.map((c) => Math.ceil(c.load / capacity))),
  };
}
