/** Deterministic teaching histories. No card calls, signatures, charges or production migrations. */
export type ProcessorOutcome = 'accepted' | 'absent' | 'delayed';
export function processorEvidence(stage: number, outcome: ProcessorOutcome, blind: boolean) {
  const step = Math.max(0, Math.min(5, Math.floor(stage)));
  const a = (outcome === 'accepted' && step >= 1) || (outcome === 'delayed' && step >= 5) ? 1 : 0;
  const b = (blind && step >= 3) || (!blind && outcome === 'absent' && step >= 4) ? 1 : 0;
  const absentProof = outcome === 'absent' && step >= 4;
  const aKnown = (outcome === 'accepted' && step >= 4) || (outcome === 'delayed' && step >= 5);
  const unresolvedA = step >= 2 && !absentProof && !aKnown;
  const state =
    step === 0
      ? 'RECORDED'
      : step === 1
        ? 'SUBMITTED'
        : aKnown && b
          ? 'CONFLICT'
          : unresolvedA
            ? b
              ? 'B_ACCEPTED_A_UNKNOWN'
              : 'UNKNOWN'
            : aKnown || b
              ? 'AUTHORIZED'
              : 'UNKNOWN';
  return {
    step,
    a,
    b,
    holds: a + b,
    heldMinor: (a + b) * 5000,
    attempts: (step >= 1 ? 1 : 0) + b,
    state,
    absentProof,
    unresolvedA,
    duplicateHolds: Math.max(0, a + b - 1),
    observed:
      step < 2
        ? 'NO_FINAL_REPLY'
        : step === 2
          ? 'TIMEOUT'
          : step === 3
            ? 'STALE_NOT_FOUND'
            : absentProof
              ? 'TERMINAL_ABSENT_AND_FENCED'
              : aKnown
                ? 'AUTHORITATIVE_ACCEPTED'
                : 'STILL_UNRESOLVED',
  };
}
export const hookFixture = [
  { id: 'e1', state: 'succeeded', signature: true, age: 30, tenant: 'm1', payment: 'p1' },
  { id: 'e1', state: 'succeeded', signature: true, age: 10, tenant: 'm1', payment: 'p1' },
  { id: 'e2', state: 'processing', signature: true, age: 10, tenant: 'm1', payment: 'p1' },
  { id: 'e3', state: 'succeeded', signature: true, age: 5, tenant: 'm1', payment: 'p1' },
  { id: 'e4', state: 'succeeded', signature: false, age: 5, tenant: 'm1', payment: 'p1' },
  { id: 'e5', state: 'succeeded', signature: true, age: 600, tenant: 'm1', payment: 'p1' },
  { id: 'e6', state: 'succeeded', signature: true, age: 5, tenant: 'other', payment: 'p1' },
] as const;
export function merchantInbox(
  count: number,
  verify: boolean,
  dedup: boolean,
  businessGuard: boolean,
) {
  const inbox = new Set<string>();
  let state = 'processing',
    fulfillments = 0,
    unsafeAccepted = 0;
  const rows = hookFixture.slice(0, count).map((event) => {
    const trusted =
      event.signature && event.age <= 300 && event.tenant === 'm1' && event.payment === 'p1';
    if (verify && !trusted)
      return {
        ...event,
        result: !event.signature
          ? 'BAD_SIGNATURE'
          : event.age > 300
            ? 'STALE_DELIVERY'
            : 'WRONG_CONTEXT',
      };
    if (!trusted) unsafeAccepted++;
    const key = event.tenant + ':' + event.id;
    if (dedup && inbox.has(key)) return { ...event, result: 'INBOX_DUPLICATE' };
    inbox.add(key);
    if (businessGuard && state === 'succeeded') return { ...event, result: 'BUSINESS_NOOP' };
    state = event.state;
    if (state === 'succeeded') fulfillments++;
    return { ...event, result: 'APPLIED' };
  });
  return { rows, state, fulfillments, unsafeAccepted, inboxRecords: inbox.size };
}
export function migrationCutover(
  stage: number,
  versionGuard: boolean,
  readiness: boolean,
  fencing: boolean,
) {
  const step = Math.max(0, Math.min(6, Math.floor(stage)));
  let old = { version: 1, minor: 1000 },
    next: { version: number; minor: number } | null = null;
  if (step >= 2) old = { version: 2, minor: 2500 };
  if (step >= 3) next = { version: 2, minor: 2500 };
  if (step >= 4 && !versionGuard) next = { version: 1, minor: 1000 };
  const safeAtFirstAttempt = !!next && next.version === 2 && next.minor === 2500;
  const premature = step >= 4 && !readiness && !safeAtFirstAttempt;
  // A deliberate final verification/repair pass runs before the second cutover attempt.
  if (step >= 5) next = { version: 2, minor: 2500 };
  const cutover = step >= 4 && (!readiness || safeAtFirstAttempt || step >= 5);
  const epoch = cutover ? 2 : 1;
  const staleWrite =
    step >= 6 && cutover ? (fencing ? 'FENCED' : 'ACCEPTED_OLD_OWNER') : 'NOT_ATTEMPTED';
  if (staleWrite === 'ACCEPTED_OLD_OWNER') old = { version: 3, minor: 3000 };
  return {
    step,
    old,
    next,
    epoch,
    cutover,
    staleWrite,
    premature,
    readMinor: cutover ? (next?.minor ?? null) : old.minor,
    diverged: !!next && (next.version !== old.version || next.minor !== old.minor),
    capturedBackfill: step >= 1 ? { version: 1, minor: 1000 } : null,
  };
}
