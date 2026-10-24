export interface EncodeTask {
  id: string;
  stage: 'probe' | 'low' | 'mid' | 'high' | 'audio' | 'package';
  lane: number;
  duration: number;
  dependencies: string[];
}
export interface ScheduledEncodeTask extends EncodeTask {
  start: number;
  end: number;
  worker: number;
}
/** Illustrative work units, not encoder benchmarks or arbitrary byte-split support. */
export function encodeSchedule(
  minutes: number,
  segments: number,
  workers: number,
  overhead: number,
) {
  if (
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 60 ||
    !Number.isInteger(segments) ||
    segments < 1 ||
    segments > 16 ||
    !Number.isInteger(workers) ||
    workers < 1 ||
    workers > 32 ||
    !Number.isFinite(overhead) ||
    overhead < 0 ||
    overhead > 10
  )
    throw new RangeError('Invalid encode scheduling assumptions');
  const tasks: EncodeTask[] = [
    { id: 'probe', stage: 'probe', lane: 0, duration: minutes * 2, dependencies: [] },
  ];
  for (const [stage, unit] of [
    ['low', 20],
    ['mid', 40],
    ['high', 80],
  ] as const)
    for (let lane = 0; lane < segments; lane++)
      tasks.push({
        id: `${stage}-${lane + 1}`,
        stage,
        lane,
        duration: (minutes * unit) / segments + overhead,
        dependencies: ['probe'],
      });
  tasks.push({
    id: 'audio',
    stage: 'audio',
    lane: 0,
    duration: minutes * 5,
    dependencies: ['probe'],
  });
  tasks.push({
    id: 'package',
    stage: 'package',
    lane: 0,
    duration: minutes + 5,
    dependencies: tasks.filter((t) => t.stage !== 'probe').map((t) => t.id),
  });
  const pending = [...tasks],
    active: ScheduledEncodeTask[] = [],
    completed = new Set<string>(),
    scheduled: ScheduledEncodeTask[] = [];
  let time = 0;
  while (pending.length || active.length) {
    for (let i = active.length - 1; i >= 0; i--)
      if (active[i].end <= time) completed.add(active.splice(i, 1)[0].id);
    while (active.length < workers) {
      const ready = pending
        .filter((t) => t.dependencies.every((id) => completed.has(id)))
        .sort((a, b) => b.duration - a.duration || (a.id < b.id ? -1 : 1));
      if (!ready.length) break;
      const task = ready[0],
        worker = Array.from({ length: workers }, (_, i) => i).find(
          (id) => !active.some((t) => t.worker === id),
        )!;
      const row = { ...task, start: time, end: time + task.duration, worker };
      pending.splice(pending.indexOf(task), 1);
      active.push(row);
      scheduled.push(row);
    }
    if (!active.length && pending.length) throw new Error('Unresolved encode dependencies');
    if (active.length) time = Math.min(...active.map((t) => t.end));
  }
  const workerSeconds = tasks.reduce((sum, t) => sum + t.duration, 0),
    criticalPath =
      minutes * 2 + Math.max((minutes * 80) / segments + overhead, minutes * 5) + minutes + 5;
  return {
    tasks: scheduled,
    makespan: time,
    workerSeconds,
    lowerBound: Math.max(workerSeconds / workers, criticalPath),
  };
}
