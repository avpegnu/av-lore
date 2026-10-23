import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterBudget, tuningExperiment, distillationCost } from '../src/lib/fine-tune-models';
test('LoRA counts GQA-narrow K/V and target-specific FFN matrices, not all square matrices', () => {
  const qv = adapterBudget(false, 16, ['q', 'v'], true, 0);
  assert.equal(qv.trainable, 6_815_744);
  assert.deepEqual(qv.rows[1].shape, [4096, 1024]);
  assert.equal(qv.adapterFileMiB, 13);
  const all = adapterBudget(false, 16, ['q', 'k', 'v', 'o', 'gate', 'up', 'down'], true, 0);
  assert.equal(all.trainable, 41_943_040);
  assert.equal(adapterBudget(true, 16, ['q', 'v'], true, 0).trainable, 32_768_000);
  assert.equal(adapterBudget(false, 32, ['q', 'v'], true, 0).trainable, 2 * qv.trainable);
  assert.equal(
    adapterBudget(false, 16, ['q', 'q'], true, 0).trainable,
    adapterBudget(false, 16, ['q'], true, 0).trainable,
  );
});
test('training memory separates frozen base, trainable state, quant metadata and supplied runtime budget', () => {
  const a = adapterBudget(false, 16, ['q', 'v'], true, 0),
    b = adapterBudget(false, 16, ['q', 'v'], false, 8);
  assert.equal(a.quantMetadata, 125_000_000);
  assert.equal(a.fullGiB * 2 ** 30, 128e9);
  assert.ok(a.qloraGiB > (a.parameters * 0.5) / 2 ** 30);
  assert.ok(Math.abs(b.loraGiB - a.loraGiB - (8 - (a.trainable * 4) / 2 ** 30)) < 1e-12);
  assert.equal(adapterBudget(false, 16, [], true, 0).hasTargets, false);
});
test('intervention studies require evidence and do not force all gaps through a tuning ladder', () => {
  assert.equal(tuningExperiment('cost', false, true, true).state, 'NEEDS_EVALS');
  assert.equal(tuningExperiment('cost', true, true, false).state, 'NEEDS_TEACHER_EVIDENCE');
  assert.equal(tuningExperiment('cost', true, true, true).experiment, 'student-distillation');
  assert.equal(
    tuningExperiment('fresh-facts', true, false, false).experiment,
    'retrieval-freshness',
  );
  assert.equal(tuningExperiment('retrieval', true, true, true).experiment, 'retrieval-diagnosis');
  assert.equal(tuningExperiment('preferences', true, false, false).state, 'NEEDS_DATA');
});
test('distillation cost includes initial project, ongoing operations and double-paid fallbacks', () => {
  const c = distillationCost(100000, 4, 0.8, 0.1, 2400, 300);
  assert.equal(c.baseline, 12000);
  assert.equal(c.monthly, 3900);
  assert.equal(c.savings, 8100);
  assert.ok(Math.abs(c.breakEvenDays! - 80 / 9) < 1e-12);
  assert.equal(c.firstYearDifference, 94800);
  assert.equal(distillationCost(0, 4, 0.8, 0.1, 2400, 300).breakEvenDays, null);
  assert.equal(distillationCost(100000, 4, 0.8, 1, 2400, 300).breakEvenDays, null);
});
