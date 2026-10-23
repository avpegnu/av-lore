/** Synthetic editor snapshots and patch-evidence gates; never edits workspace files. */
export function completionRace(
  debounceMs: number,
  baseLatencyMs: number,
  snapshotGuard: boolean,
  deadlineGuard: boolean,
  cancel: boolean,
) {
  const keys = [0, 80, 160],
    deadline = 500;
  const requests = keys.flatMap((at, i) =>
    keys[i + 1] !== undefined && keys[i + 1] <= at + debounceMs
      ? []
      : [
          {
            id: 'R' + (i + 1),
            revision: i + 1,
            start: at + debounceMs,
            finish: at + debounceMs + baseLatencyMs + [500, 200, 0][i],
          },
        ],
  );
  const events = requests
    .map((r) => {
      const superseded = r.revision < 3,
        stopped = cancel && superseded && r.revision === 2;
      const currentRevision = 1 + keys.slice(1).filter((t) => t <= r.finish).length;
      const stale = r.revision !== currentRevision,
        late = r.finish > deadline;
      return {
        ...r,
        stale,
        late,
        outcome: stopped
          ? 'CANCEL_ACKNOWLEDGED'
          : snapshotGuard && stale
            ? 'DROP_STALE_SNAPSHOT'
            : deadlineGuard && late
              ? 'DROP_PAST_DEADLINE'
              : 'SHOW',
      };
    })
    .sort((a, b) => a.finish - b.finish);
  const shown = events.filter((e) => e.outcome === 'SHOW');
  return {
    events,
    admitted: requests.length,
    cancelRequested: cancel ? requests.filter((r) => r.revision < 3).length : 0,
    staleShown: shown.filter((e) => e.stale).length,
    lastShown: shown.at(-1)?.id || 'NONE',
    deadline,
  };
}
export const contextPieces = [
  { id: 'PREFIX', tokens: 400, required: true, excluded: false, priority: 0 },
  { id: 'SUFFIX', tokens: 200, required: true, excluded: false, priority: 0 },
  { id: 'EXCLUDED_CONFIG', tokens: 300, required: false, excluded: true, priority: 1 },
  { id: 'TYPE_DEFINITION', tokens: 600, required: false, excluded: false, priority: 2 },
  { id: 'RELEVANT_TEST', tokens: 500, required: false, excluded: false, priority: 3 },
  { id: 'README_SNIPPET', tokens: 300, required: false, excluded: false, priority: 4 },
];
export function codingContextPack(budget: number, enforceExclusions: boolean) {
  const required = contextPieces.filter((p) => p.required),
    requiredTokens = required.reduce((s, p) => s + p.tokens, 0);
  if (requiredTokens > budget)
    return {
      state: 'REQUIRED_CONTEXT_OVER_BUDGET',
      selected: [] as string[],
      used: 0,
      excludedIncluded: false,
    };
  let used = requiredTokens;
  const selected = required.map((p) => p.id);
  for (const p of contextPieces
    .filter((p) => !p.required)
    .sort((a, b) => a.priority - b.priority)) {
    if (enforceExclusions && p.excluded) continue;
    if (used + p.tokens <= budget) {
      selected.push(p.id);
      used += p.tokens;
    }
  }
  return {
    state: 'PACKED_FIXTURE',
    selected,
    used,
    excludedIncluded: selected.includes('EXCLUDED_CONFIG'),
  };
}
export type PatchScenario =
  'fresh' | 'workspace-changed' | 'patch-changed' | 'concurrent-edit' | 'excluded-path';
export function codingPatchGate(
  scenario: PatchScenario,
  baseGuard: boolean,
  testBinding: boolean,
  approvalBinding: boolean,
  atomicApply: boolean,
) {
  const base = 'BASE-A',
    current = scenario === 'workspace-changed' ? 'BASE-B' : 'BASE-A',
    proposal = scenario === 'patch-changed' ? 'PATCH-B' : 'PATCH-A';
  const evidence = {
    testedBase: 'BASE-A',
    testedPatch: 'PATCH-A',
    environment: 'SANDBOX-1',
    approvedPatch: 'PATCH-A',
    approvedBase: 'BASE-A',
  };
  const reject = (state: string) => ({ state, applied: false, base, current, proposal, evidence });
  if (scenario === 'excluded-path') return reject('PATH_SCOPE_DENIED');
  if (baseGuard && current !== base) return reject('BASE_CONFLICT');
  if (testBinding && (evidence.testedPatch !== proposal || evidence.testedBase !== current))
    return reject('TEST_EVIDENCE_MISMATCH');
  if (approvalBinding && (evidence.approvedPatch !== proposal || evidence.approvedBase !== current))
    return reject('APPROVAL_PAYLOAD_MISMATCH');
  if (scenario === 'concurrent-edit' && atomicApply) return reject('COMMIT_VERSION_CONFLICT');
  return {
    state:
      scenario === 'concurrent-edit'
        ? 'UNSAFE_OVERWRITE'
        : current !== base
          ? 'STALE_PATCH_APPLIED'
          : proposal !== evidence.testedPatch
            ? 'UNTESTED_PATCH_APPLIED'
            : 'APPLIED_FIXTURE',
    applied: true,
    base,
    current,
    proposal,
    evidence,
  };
}
