export type CrawlJob = { id: string; host: string; duration: number };
export const crawlJobs: CrawlJob[] = [
  ...Array.from({ length: 4 }, (_, i) => ({ id: 'A' + (i + 1), host: 'a.example', duration: 1 })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: 'B' + (i + 1), host: 'b.example', duration: 2 })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: 'C' + (i + 1), host: 'c.example', duration: 1 })),
];
export function crawlSchedule(concurrency: number, delay: number, polite: boolean) {
  if (
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > 4 ||
    !Number.isInteger(delay) ||
    delay < 0 ||
    delay > 5
  )
    throw new RangeError('Invalid scheduler config');
  const pending = [...crawlJobs],
    active: { job: CrawlJob; end: number }[] = [],
    ready = new Map<string, number>(),
    rows: { job: CrawlJob; start: number; end: number }[] = [];
  let time = 0;
  while (pending.length) {
    for (let i = active.length - 1; i >= 0; i--) if (active[i].end <= time) active.splice(i, 1);
    while (active.length < concurrency) {
      const index = pending.findIndex(
        (job) =>
          !polite ||
          (!active.some((a) => a.job.host === job.host) && (ready.get(job.host) ?? 0) <= time),
      );
      if (index < 0) break;
      const job = pending.splice(index, 1)[0],
        end = time + job.duration;
      rows.push({ job, start: time, end });
      active.push({ job, end });
      ready.set(job.host, time + delay);
    }
    if (!pending.length) break;
    const changes = [
      ...active.map((a) => a.end),
      ...(polite ? pending.map((j) => ready.get(j.host) ?? 0) : []),
    ].filter((t) => t > time);
    if (!changes.length) throw new Error('Scheduler made no progress');
    time = Math.min(...changes);
  }
  let violations = 0;
  for (const host of new Set(crawlJobs.map((j) => j.host))) {
    const jobs = rows.filter((r) => r.job.host === host).sort((a, b) => a.start - b.start);
    for (let i = 1; i < jobs.length; i++)
      if (jobs[i].start < jobs[i - 1].end || jobs[i].start - jobs[i - 1].start < delay)
        violations++;
  }
  return {
    rows,
    makespan: Math.max(...rows.map((r) => r.end)),
    violations,
    work: rows.reduce((s, r) => s + r.job.duration, 0),
  };
}
export function bloomSizing(bitsPerItem: number, load: number) {
  if (!Number.isFinite(bitsPerItem) || bitsPerItem <= 0 || !Number.isFinite(load) || load < 0)
    throw new RangeError('Invalid Bloom sizing');
  const capacity = 10e9,
    bits = capacity * bitsPerItem,
    hashes = Math.max(1, Math.round(bitsPerItem * Math.log(2))),
    inserted = capacity * load;
  const falsePositive = (1 - Math.exp((-hashes * inserted) / bits)) ** hashes;
  return {
    bits,
    hashes,
    inserted,
    memoryGB: bits / 8 / 1e9,
    falsePositive,
    expectedSkippedNovel: 1e6 * falsePositive,
  };
}
