/** Offline teaching fixtures: no upstream APIs, money movement or shared quota store. */
export const gatewayDeployments = [
  { id: 'A', region: 'US', private: false, tools: true, qualified: true, price: 1, latency: 200 },
  { id: 'B', region: 'EU', private: false, tools: true, qualified: true, price: 2, latency: 350 },
  { id: 'C', region: 'EU', private: true, tools: true, qualified: true, price: 1.5, latency: 600 },
  {
    id: 'D',
    region: 'EU',
    private: true,
    tools: false,
    qualified: false,
    price: 0.5,
    latency: 100,
  },
];
export function gatewayRoute(
  privateOnly: boolean,
  euOnly: boolean,
  tools: boolean,
  qualification: boolean,
  bDown: boolean,
  cDown: boolean,
  enforce: boolean,
  policy: 'cost' | 'latency',
) {
  const rows = gatewayDeployments.map((d) => {
    const reasons = [
      ...(privateOnly && !d.private ? ['PRIVATE_REQUIRED'] : []),
      ...(euOnly && d.region !== 'EU' ? ['REGION_MISMATCH'] : []),
      ...(tools && !d.tools ? ['TOOLS_UNSUPPORTED'] : []),
      ...(qualification && !d.qualified ? ['EVAL_NOT_QUALIFIED'] : []),
    ];
    const down = (d.id === 'B' && bDown) || (d.id === 'C' && cDown);
    return { ...d, reasons, down, eligible: (!enforce || !reasons.length) && !down };
  });
  const candidates = rows
      .filter((d) => d.eligible)
      .sort((a, b) => (policy === 'cost' ? a.price - b.price : a.latency - b.latency)),
    selected = candidates[0];
  return {
    rows,
    selected: selected?.id || 'NONE',
    state: !selected
      ? 'NO_ELIGIBLE_ROUTE'
      : selected.reasons.length
        ? 'POLICY_VIOLATION'
        : 'QUALIFIED_FIXTURE_ROUTE',
    candidateCount: candidates.length,
  };
}
export type GatewayFailure =
  'rejected' | 'rate-limit' | 'unknown-timeout' | 'partial-stream' | 'tool-effect';
export function gatewayFailover(
  scenario: GatewayFailure,
  deadlineMs: number,
  retryAfterMs: number,
  replayAllowed: boolean,
) {
  const spent = 200,
    fallback = 450,
    wait = scenario === 'rate-limit' ? retryAfterMs : 0;
  const state =
    scenario === 'partial-stream'
      ? 'PARTIAL_STREAM_ERROR'
      : scenario === 'tool-effect'
        ? 'SIDE_EFFECT_REPLAY_BLOCKED'
        : !replayAllowed
          ? 'REPLAY_POLICY_BLOCKED'
          : spent + wait + fallback > deadlineMs
            ? 'DEADLINE_EXHAUSTED'
            : 'FALLBACK_SUCCEEDED';
  const launched = state === 'FALLBACK_SUCCEEDED';
  return {
    state,
    attempts: launched ? 2 : 1,
    elapsed: launched ? spent + wait + fallback : spent,
    wait,
    unknownPriorUsage:
      scenario === 'unknown-timeout' || scenario === 'partial-stream' || scenario === 'tool-effect',
    events: [
      { at: 0, state: 'ATTEMPT_1_DISPATCHED' },
      { at: spent, state: scenario.toUpperCase().replaceAll('-', '_') },
      ...(launched
        ? [
            { at: spent + wait, state: 'ATTEMPT_2_DISPATCHED' },
            { at: spent + wait + fallback, state: 'ATTEMPT_2_COMPLETE' },
          ]
        : [{ at: spent, state }]),
    ],
  };
}
export type UsageDedup = 'attempt' | 'request' | 'off';
export function gatewayAccounting(
  requests: number,
  reservation: number,
  atomic: boolean,
  retry: boolean,
  duplicate: boolean,
  missing: boolean,
  dedup: UsageDedup,
) {
  const budget = 10000,
    priorSpent = 2000,
    priorHolds = 1500,
    free = budget - priorSpent - priorHolds;
  const admitted = atomic
    ? Math.min(requests, Math.floor(free / reservation))
    : reservation <= free
      ? requests
      : 0;
  const held = admitted * reservation,
    oversubscribed = Math.max(0, held - free);
  const records = [
    { attempt: 'A1', usage: 1200 },
    ...(retry && !missing ? [{ attempt: 'A2', usage: 800 }] : []),
    ...(duplicate ? [{ attempt: 'A1', usage: 1200 }] : []),
  ];
  const seen = new Set<string>();
  let posted = 0;
  const events = records.map((r, i) => {
    const key = dedup === 'attempt' ? r.attempt : dedup === 'request' ? 'REQUEST-1' : String(i),
      applied = !seen.has(key);
    seen.add(key);
    if (applied) posted += r.usage;
    return { ...r, applied };
  });
  const actual = 1200 + (retry ? 800 : 0),
    pending = retry && missing;
  // Unknown provider usage stays held under this fixture policy, never auto-refunded as zero.
  const unresolved = admitted && pending ? Math.max(0, reservation - posted) : 0;
  const otherHolds = Math.max(0, admitted - 1) * reservation;
  const availableAfter =
    budget - priorSpent - priorHolds - otherHolds - (admitted ? posted : 0) - unresolved;
  return {
    admitted,
    held,
    oversubscribed,
    posted: admitted ? posted : 0,
    actual: admitted ? actual : 0,
    unresolved,
    availableAfter,
    events: admitted ? events : [],
    state: !admitted
      ? 'ADMISSION_REJECTED'
      : oversubscribed
        ? 'OVER_RESERVED'
        : pending
          ? 'USAGE_PENDING'
          : posted !== actual
            ? 'LEDGER_MISMATCH'
            : 'SETTLED_FIXTURE',
  };
}
