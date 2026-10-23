import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agentWorkflow,
  agentContextCost,
  agentEffectReplay,
} from '../src/lib/agent-runtime-models';
test('agent loop charges model turns before tools, persists approval waits and independently enforces authorization', () => {
  const wait = agentWorkflow(8, 8000, 'none', 'pending', true);
  assert.equal(wait.state, 'WAIT_APPROVAL');
  assert.equal(wait.effects, 0);
  assert.equal(wait.turns.length, 3);
  assert.equal(wait.spent, 3920);
  const done = agentWorkflow(8, 8000, 'none', 'approved', true);
  assert.equal(done.state, 'DONE');
  assert.equal(done.effects, 1);
  assert.equal(done.spent, 5570);
  assert.equal(agentWorkflow(8, 8000, 'none', 'approved', false).state, 'AUTH_BLOCKED');
  assert.equal(agentWorkflow(8, 8000, 'none', 'rejected', true).effects, 0);
});
test('retry, step and pre-turn token ceilings bound the script without assuming side effects roll back', () => {
  assert.equal(agentWorkflow(8, 8000, 'persistent', 'approved', true).state, 'LOOP_GUARD');
  assert.equal(agentWorkflow(8, 8000, 'once', 'approved', true).state, 'DONE');
  const spent = agentWorkflow(8, 4000, 'none', 'approved', true);
  assert.equal(spent.state, 'TOKEN_BUDGET');
  assert.equal(spent.effects, 1);
  assert.equal(spent.spent, 3920);
  assert.equal(agentWorkflow(2, 8000, 'none', 'approved', true).state, 'STEP_LIMIT');
  assert.equal(agentWorkflow(8, 1000, 'none', 'approved', true).turns.length, 0);
});
test('context accumulation is quadratic only under growing full-history assumptions; bounded windows change the arithmetic', () => {
  const a = agentContextCost(6, 1000, 200, 3);
  assert.equal(a.full, 9000);
  assert.equal(a.window, 8400);
  assert.equal(a.full, a.fullFormula);
  assert.equal(agentContextCost(6, 1000, 0, 3).full, 6000);
  assert.equal(agentContextCost(6, 1000, 200, 0).window, 6000);
  assert.equal(agentContextCost(6, 1000, 200, 20).window, 9000);
});
test('lost response recovery requires stable durable intent AND sink receipts; cancellation does not undo committed effects', () => {
  assert.equal(agentEffectReplay(true, true, true, true, true, false).effects, 1);
  assert.equal(agentEffectReplay(false, true, true, true, true, false).effects, 2);
  assert.equal(agentEffectReplay(true, false, true, true, true, false).effects, 2);
  assert.equal(agentEffectReplay(true, true, false, true, true, false).effects, 0);
  assert.equal(agentEffectReplay(true, true, true, false, true, false).effects, 0);
  assert.equal(agentEffectReplay(true, true, true, true, false, false).effects, 0);
  const cancelled = agentEffectReplay(true, true, true, true, true, true);
  assert.equal(cancelled.effects, 1);
  assert.equal(cancelled.state, 'CANCELLED_WITH_PRIOR_EFFECT');
  const unknown = agentEffectReplay(false, true, true, true, true, true);
  assert.equal(unknown.effects, 1);
  assert.equal(unknown.state, 'RECONCILE_REQUIRED');
});
