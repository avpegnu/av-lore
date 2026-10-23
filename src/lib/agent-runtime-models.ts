/** Bounded synthetic runs and sink receipts; no external model, refund or credential is used. */
export type AgentFailure = 'none' | 'once' | 'persistent';
export type AgentApproval = 'pending' | 'approved' | 'rejected';
export function agentWorkflow(
  maxTurns: number,
  maxTokens: number,
  failure: AgentFailure,
  approval: AgentApproval,
  authorized: boolean,
) {
  const events: { turn: number; code: string; tool: string }[] = [],
    turns: { input: number; outputReservation: number }[] = [];
  let context = 1000,
    spent = 0,
    step = 0,
    errors = 0,
    effects = 0;
  const plan = [
    { tool: 'read_ticket', observation: 120 },
    { tool: 'get_order', observation: 80 },
    { tool: 'issue_refund', observation: 50 },
  ];
  const finish = (state: string) => ({ state, events, turns, spent, effects });
  for (;;) {
    if (turns.length >= maxTurns) return finish('STEP_LIMIT');
    const reservation = context + 100;
    if (spent + reservation > maxTokens) return finish('TOKEN_BUDGET');
    turns.push({ input: context, outputReservation: 100 });
    spent += reservation;
    if (step === plan.length) {
      events.push({ turn: turns.length, code: 'FINAL_OUTCOME_CHECK', tool: 'none' });
      return finish('DONE');
    }
    const p = plan[step];
    events.push({ turn: turns.length, code: 'PROPOSE', tool: p.tool });
    if (step === 2) {
      if (!authorized) {
        events.push({ turn: turns.length, code: 'AUTHORIZATION_DENIED', tool: p.tool });
        return finish('AUTH_BLOCKED');
      }
      if (approval !== 'approved') {
        events.push({
          turn: turns.length,
          code: approval === 'pending' ? 'CHECKPOINT_WAIT' : 'HUMAN_REJECTED',
          tool: p.tool,
        });
        return finish(approval === 'pending' ? 'WAIT_APPROVAL' : 'REJECTED');
      }
    }
    if (step === 0 && (failure === 'persistent' || (failure === 'once' && errors === 0))) {
      errors++;
      context += 140;
      events.push({ turn: turns.length, code: 'READ_TIMEOUT', tool: p.tool });
      if (errors === 3) return finish('LOOP_GUARD');
      continue;
    }
    context += 100 + p.observation;
    if (step === 2) effects++;
    events.push({
      turn: turns.length,
      code: step === 2 ? 'COMMITTED_RECEIPT' : 'READ_OBSERVATION',
      tool: p.tool,
    });
    step++;
  }
}
export function agentContextCost(
  turns: number,
  baseTokens: number,
  historyPerTurn: number,
  recentTurns: number,
) {
  if (
    !Number.isInteger(turns) ||
    turns < 1 ||
    turns > 100 ||
    baseTokens < 0 ||
    historyPerTurn < 0 ||
    recentTurns < 0
  )
    throw new Error('Invalid context inputs');
  const rows = Array.from({ length: turns }, (_, i) => ({
    turn: i + 1,
    full: baseTokens + i * historyPerTurn,
    window: baseTokens + Math.min(i, recentTurns) * historyPerTurn,
  }));
  return {
    rows,
    full: rows.reduce((s, r) => s + r.full, 0),
    window: rows.reduce((s, r) => s + r.window, 0),
    fullFormula: turns * baseTokens + (historyPerTurn * turns * (turns - 1)) / 2,
  };
}
export function agentEffectReplay(
  durableIntent: boolean,
  sinkDedup: boolean,
  approvalMatches: boolean,
  approvalFresh: boolean,
  authorized: boolean,
  cancelAfterFirst: boolean,
) {
  const events: { phase: string; key: string; outcome: string }[] = [],
    receipts = new Set<string>();
  let effects = 0;
  // Persisted approved intent uses the exact same amount/target and request identity on recovery.
  for (let attempt = 0; attempt < 2; attempt++) {
    const key = attempt === 0 || durableIntent ? 'refund-intent-7' : 'refund-recovery-8';
    const phase = attempt === 0 ? 'initial dispatch' : 'recovery after lost response';
    if (!authorized) {
      events.push({ phase, key, outcome: 'AUTHORIZATION_DENIED' });
      break;
    }
    if (!approvalMatches) {
      events.push({ phase, key, outcome: 'APPROVAL_PAYLOAD_MISMATCH' });
      break;
    }
    if (!approvalFresh) {
      events.push({ phase, key, outcome: 'APPROVAL_EXPIRED' });
      break;
    }
    if (attempt === 1 && cancelAfterFirst) {
      // Cancellation stops new effects but still permits receipt reconciliation.
      events.push({
        phase,
        key,
        outcome:
          sinkDedup && durableIntent && receipts.has(key)
            ? 'CANCELLED_RECEIPT_CONFIRMED'
            : 'CANCELLED_OUTCOME_UNRESOLVED',
      });
      return {
        events,
        effects,
        state: sinkDedup && durableIntent ? 'CANCELLED_WITH_PRIOR_EFFECT' : 'RECONCILE_REQUIRED',
      };
    }
    if (sinkDedup && receipts.has(key))
      events.push({ phase, key, outcome: 'REPLAY_EXISTING_RECEIPT' });
    else {
      effects++;
      receipts.add(key);
      events.push({
        phase,
        key,
        outcome: attempt === 0 ? 'COMMIT_RESPONSE_LOST' : 'COMMIT_NEW_EFFECT',
      });
    }
  }
  return {
    events,
    effects,
    state: effects === 0 ? 'BLOCKED' : effects === 1 ? 'ONE_EFFECT_CONFIRMED' : 'DUPLICATE_EFFECT',
  };
}
