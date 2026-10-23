/** Closed multi-user retrieval and lifecycle fixtures, not an authorization implementation. */
export type RetrievalMode = 'eligible-first' | 'top-k-then-filter' | 'no-permission-filter';
const documents = [
  { id: 'BETA', tenant: 'beta', allow: ['staff'], relevant: true, score: 0.995 },
  { id: 'LEGAL', tenant: 'alpha', allow: ['legal'], relevant: true, score: 0.99 },
  { id: 'BILLING', tenant: 'alpha', allow: ['finance'], relevant: false, score: 0.97 },
  { id: 'RECOVERY', tenant: 'alpha', allow: ['eng'], relevant: true, score: 0.92 },
  { id: 'GUIDE', tenant: 'alpha', allow: ['staff'], relevant: true, score: 0.85 },
  { id: 'HISTORY', tenant: 'alpha', allow: ['staff'], relevant: false, score: 0.8 },
];
export function enterpriseRetrieval(k: number, mode: RetrievalMode, candidateMiss: boolean) {
  const users = [
    { id: 'support', groups: ['staff'] },
    { id: 'engineer', groups: ['staff', 'eng'] },
    { id: 'legal', groups: ['staff', 'legal'] },
  ];
  const tenantDocs = documents.filter((d) => d.tenant === 'alpha');
  return users.map((u) => {
    const canRead = (d: (typeof documents)[number]) => d.allow.some((g) => u.groups.includes(g));
    // Simulate one candidate miss without calling an ANN index or promising filter-perfect recall.
    const candidates = tenantDocs.filter((d) => !candidateMiss || d.id !== 'GUIDE');
    const selected =
      mode === 'eligible-first' ? candidates.filter(canRead).slice(0, k) : candidates.slice(0, k);
    const shown = mode === 'top-k-then-filter' ? selected.filter(canRead) : selected;
    const relevantTotal = tenantDocs.filter((d) => canRead(d) && d.relevant).length;
    const relevantFound = shown.filter((d) => canRead(d) && d.relevant).length;
    return {
      user: u.id,
      groups: u.groups,
      shown: shown.map((d) => ({ ...d, allowed: canRead(d) })),
      relevantTotal,
      relevantFound,
      recall: relevantTotal ? relevantFound / relevantTotal : null,
      leaked: shown.filter((d) => !canRead(d)).length,
      dropped: selected.length - shown.length,
    };
  });
}
export type RevocationTiming = 'before-rerank' | 'before-model' | 'after-model';
export function enterpriseRevocation(
  timing: RevocationTiming,
  rerankGuard: boolean,
  modelGuard: boolean,
  answerGuard: boolean,
) {
  const stages = ['reranker', 'generator', 'answer'] as const;
  const revokedAt = timing === 'before-rerank' ? 0 : timing === 'before-model' ? 1 : 2;
  const guards = [rerankGuard, modelGuard, answerGuard],
    events: { stage: string; authorized: boolean; guard: boolean; result: string }[] = [];
  let upstreamDisclosure = false,
    userDisclosure = false;
  for (let i = 0; i < stages.length; i++) {
    const authorized = i < revokedAt;
    if (!authorized && guards[i]) {
      events.push({ stage: stages[i], authorized, guard: true, result: 'DENIED_CURRENT_ACCESS' });
      return {
        events,
        upstreamDisclosure,
        userDisclosure,
        state: 'BLOCKED_AT_' + stages[i].toUpperCase(),
      };
    }
    if (!authorized) {
      if (i === 2) userDisclosure = true;
      else upstreamDisclosure = true;
    }
    events.push({
      stage: stages[i],
      authorized,
      guard: guards[i],
      result: authorized ? 'AUTHORIZED_AT_THIS_STAGE' : 'UNAUTHORIZED_EXPOSURE',
    });
  }
  return {
    events,
    upstreamDisclosure,
    userDisclosure,
    state: userDisclosure ? 'USER_DISCLOSURE' : 'ANSWER_SERVED',
  };
}
export function enterpriseIndexCutover(
  backfillPercent: number,
  caughtUpSequence: number,
  pairedEncoder: boolean,
  evalsPassed: boolean,
  force: boolean,
) {
  const highWatermark = 120;
  const gaps = [
    ...(backfillPercent < 100 ? ['backfill-incomplete'] : []),
    ...(caughtUpSequence < highWatermark ? ['change-log-gap'] : []),
    ...(!pairedEncoder ? ['query-document-space-mismatch'] : []),
    ...(!evalsPassed ? ['evaluation-evidence-missing'] : []),
  ];
  const ready = gaps.length === 0,
    cutover = ready || force;
  return {
    highWatermark,
    gaps,
    ready,
    activeIndex: cutover ? 'candidate-E2' : 'production-E1',
    queryEncoder: cutover && pairedEncoder ? 'E2' : 'E1',
    state: !cutover
      ? 'NOT_READY'
      : !pairedEncoder
        ? 'QUERY_SPACE_MISMATCH'
        : gaps.length
          ? 'FORCED_WITH_GAPS'
          : 'QUALIFIED_FIXTURE_CUTOVER',
  };
}
