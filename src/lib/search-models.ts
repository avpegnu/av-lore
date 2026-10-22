// Fixed English corpus and timing traces for offline teaching, not a production search engine.
export const searchCorpus = [
  { id: 'd1', public: true, text: 'cache redis fast cache' },
  { id: 'd2', public: false, text: 'cache redis cache redis' },
  { id: 'd3', public: true, text: 'redis durable queue' },
  { id: 'd4', public: true, text: 'cache database transactions' },
  { id: 'd5', public: true, text: 'redis cache' },
];
export const searchTokens = (text: string): string[] =>
  text.toLowerCase().match(/[a-z0-9]+/g) || [];
export function searchIndex(
  query: string,
  and: boolean,
  b: number,
  filterBefore: boolean,
  k: number,
) {
  if (!Number.isFinite(b) || b < 0 || b > 1 || !Number.isInteger(k) || k < 1 || k > 5)
    throw new RangeError('Invalid ranking fixture');
  const terms = [...new Set(searchTokens(query.slice(0, 120)))],
    docs = searchCorpus.map((d) => ({ ...d, tokens: searchTokens(d.text) })),
    avg = docs.reduce((a, d) => a + d.tokens.length, 0) / docs.length;
  const postings = terms.map((term) => ({
    term,
    rows: docs.flatMap((d) => {
      const positions = d.tokens.flatMap((t, i) => (t === term ? [i] : []));
      return positions.length ? [{ id: d.id, tf: positions.length, positions }] : [];
    }),
  }));
  const ranked = docs
    .filter(
      (d) =>
        terms.length &&
        (and ? terms.every((t) => d.tokens.includes(t)) : terms.some((t) => d.tokens.includes(t))),
    )
    .map((d) => {
      const parts = postings.map((p) => {
        const tf = p.rows.find((r) => r.id === d.id)?.tf || 0,
          df = p.rows.length,
          idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
        return {
          term: p.term,
          tf,
          df,
          idf,
          score: tf ? (idf * tf * 2.2) / (tf + 1.2 * (1 - b + (b * d.tokens.length) / avg)) : 0,
        };
      });
      return { ...d, score: parts.reduce((a, p) => a + p.score, 0), parts };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const candidates = (filterBefore ? ranked.filter((d) => d.public) : ranked).slice(0, k),
    results = candidates.filter((d) => d.public);
  return { terms, postings, ranked, candidates, results, avg };
}
export function searchFanout(
  shards: number,
  slowPercent: number,
  hedge: boolean,
  delay: number,
  deadline: number,
  partial: boolean,
) {
  if (
    !Number.isInteger(shards) ||
    shards < 1 ||
    shards > 128 ||
    !Number.isFinite(slowPercent) ||
    slowPercent < 0 ||
    slowPercent > 100 ||
    !Number.isInteger(delay) ||
    delay < 0 ||
    delay > 150 ||
    !Number.isInteger(deadline) ||
    deadline < 20 ||
    deadline > 250
  )
    throw new RangeError('Invalid fanout fixture');
  const primaries = [30, 40, 180, 55],
    backups = [90, 90, 45, 90];
  const rows = primaries.map((p, i) => {
    const hedged = hedge && delay < deadline && p > delay,
      done = hedged ? Math.min(p, delay + backups[i]) : p;
    return { id: i + 1, primary: p, backup: backups[i], hedged, done, returned: done <= deadline };
  });
  const returned = rows.filter((r) => r.returned).length;
  return {
    rows,
    anySlowProbability: 1 - (1 - slowPercent / 100) ** shards,
    extraRequests: rows.filter((r) => r.hedged).length,
    duration: Math.min(deadline, Math.max(...rows.map((r) => r.done))),
    returned,
    status: returned === rows.length ? 'COMPLETE' : partial ? 'PARTIAL' : 'FAILED',
    usable: returned === rows.length || partial ? returned : 0,
  };
}
export function searchFreshness(stage: number, guard: boolean) {
  if (!Number.isInteger(stage) || stage < 0 || stage > 5)
    throw new RangeError('Invalid indexing stage');
  const resurrected = !guard && stage >= 4;
  return {
    sourceVersion: stage >= 1 ? 2 : 1,
    sourceExists: stage < 1,
    readerVersion: stage < 2 ? 1 : resurrected ? 1 : 2,
    searchable: stage < 2 || resurrected,
    lateEvent: stage < 3 ? 'NOT_ARRIVED' : guard ? 'IGNORED_OLD_VERSION' : 'ACCEPTED_STALE_UPDATE',
    physicalBodyCopies: stage >= 5 ? (resurrected ? 1 : 0) : !guard && stage >= 3 ? 2 : 1,
    retainedVersionGuard: guard && stage >= 1 ? 2 : null,
  };
}
export function judgedNdcg(returnedIds: string[], judgments: Record<string, number>, k: number) {
  const dcg = (rels: number[]) =>
    rels.reduce((sum, r, i) => sum + (2 ** r - 1) / Math.log2(i + 2), 0);
  const ideal = dcg(
    Object.values(judgments)
      .sort((a, b) => b - a)
      .slice(0, k),
  );
  return ideal ? dcg(returnedIds.slice(0, k).map((id) => judgments[id] || 0)) / ideal : null;
}
