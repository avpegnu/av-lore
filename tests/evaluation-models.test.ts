import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pairedEvaluation,
  wilsonInterval,
  judgeOrderProbabilities,
  evaluationGates,
} from '../src/lib/evaluation-models';
test('paired bootstrap preserves matched outcomes and distinguishes equal marginal scores with different discordance', () => {
  const many = pairedEvaluation({ both: 50, gain: 12, loss: 8, neither: 30 })!;
  const few = pairedEvaluation({ both: 58, gain: 4, loss: 0, neither: 38 })!;
  assert.equal(many.baseline, few.baseline);
  assert.equal(many.candidate, few.candidate);
  assert.equal(many.delta, 0.04);
  assert.equal(many.discordant, 20);
  assert.ok(many.lo < 0 && many.hi > 0);
  assert.ok(many.hi - many.lo > few.hi - few.lo);
  assert.deepEqual(pairedEvaluation({ both: 50, gain: 12, loss: 8, neither: 30 }), many);
  const reversed = pairedEvaluation({ both: 50, gain: 8, loss: 12, neither: 30 })!;
  assert.equal(reversed.delta, -many.delta);
});
test('empty and degenerate bootstrap inputs do not imply population certainty; Wilson stays bounded at extremes', () => {
  assert.equal(pairedEvaluation({ both: 0, gain: 0, loss: 0, neither: 0 }), null);
  const same = pairedEvaluation({ both: 50, gain: 0, loss: 0, neither: 50 })!;
  assert.equal(same.degenerate, true);
  assert.equal(same.lo, 0);
  assert.equal(same.hi, 0);
  const w = wilsonInterval(70, 100);
  assert.ok(Math.abs(w.lo - 0.60415) < 0.0001);
  assert.ok(Math.abs(w.hi - 0.78105) < 0.0001);
  assert.ok(wilsonInterval(0, 100).hi > 0);
  assert.ok(wilsonInterval(100, 100).lo < 1);
  assert.throws(() => pairedEvaluation({ both: -1, gain: 0, loss: 0, neither: 0 }));
});
test('swapping reveals position effects without making consistency a correctness guarantee or hiding unresolved cases', () => {
  const p = judgeOrderProbabilities(0.6, 0.4, 0.8);
  assert.ok(Math.abs(p.first - 0.736) < 1e-12);
  assert.ok(Math.abs(p.second - 0.336) < 1e-12);
  assert.ok(Math.abs(p.bothA + p.bothB + p.unresolved - 1) < 1e-12);
  assert.ok(Math.abs(p.consistentOnlyB! - 0.6) > 0.01);
  const perfect = judgeOrderProbabilities(0.6, 0, 1);
  assert.equal(perfect.consistentOnlyB, 0.6);
  assert.equal(perfect.unresolved, 0);
  const firstOnly = judgeOrderProbabilities(0.6, 1, 1);
  assert.equal(firstOnly.unresolved, 1);
  assert.equal(firstOnly.consistentOnlyB, null);
  const random = judgeOrderProbabilities(0.8, 0, 0.5);
  assert.equal(random.first, 0.5);
  assert.equal(random.consistentOnlyB, 0.5);
});
test('aggregate improvement cannot bypass slice regressions, privacy failures, missing evidence or canary qualification', () => {
  const shift = evaluationGates('slice-regression', 20, true, true, true);
  assert.equal(shift.overallDelta, 0.06);
  assert.equal(shift.state, 'BLOCKED');
  assert.ok(shift.failures.includes('quality/enterprise'));
  assert.equal(evaluationGates('privacy-failure', 20, true, true, true).state, 'BLOCKED');
  assert.equal(evaluationGates('clean', 30, true, true, true).state, 'INSUFFICIENT_EVIDENCE');
  assert.equal(evaluationGates('clean', 20, false, true, true).state, 'INSUFFICIENT_EVIDENCE');
  assert.equal(evaluationGates('clean', 20, true, false, true).state, 'INSUFFICIENT_EVIDENCE');
  assert.equal(evaluationGates('clean', 20, true, true, false).state, 'INSUFFICIENT_EVIDENCE');
  assert.equal(evaluationGates('clean', 20, true, true, true).state, 'CANARY_CANDIDATE');
});
