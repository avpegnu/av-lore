import test from 'node:test';
import assert from 'node:assert/strict';
import {
  disclosurePaths,
  urlBoundaryFixture,
  moderationFixture,
} from '../src/lib/ai-security-models';
test('tool capability/recipient/review and renderer egress guard separate disclosure paths', () => {
  assert.equal(disclosurePaths(true, true, false, false, 'reject', false, false).leaks, 0);
  const toolOnly = disclosurePaths(true, true, true, true, 'approve', false, false);
  assert.equal(toolOnly.leaks, 1);
  assert.equal(toolOnly.tool, 'SIMULATED_TOOL_DISCLOSURE');
  const imageOnly = disclosurePaths(true, true, false, false, 'reject', true, true);
  assert.equal(imageOnly.leaks, 1);
  assert.equal(imageOnly.image, 'SIMULATED_IMAGE_DISCLOSURE');
  assert.equal(disclosurePaths(true, true, true, true, 'not-required', true, true).leaks, 2);
  assert.equal(disclosurePaths(true, false, true, true, 'approve', true, true).leaks, 0);
  assert.equal(disclosurePaths(false, true, true, true, 'approve', true, true).leaks, 0);
});
test('exact hostname and validated connection destinations address different URL boundaries', () => {
  assert.equal(
    urlBoundaryFixture('approved-public', true, true, true).state,
    'FIXTURE_ALLOW_NOT_PROOF',
  );
  assert.equal(urlBoundaryFixture('lookalike-host', true, true, true).networkAttempt, false);
  assert.equal(
    urlBoundaryFixture('lookalike-host', false, true, true).state,
    'UNSAFE_FIXTURE_ALLOW',
  );
  assert.equal(urlBoundaryFixture('private-resolution', true, true, true).state, 'BLOCKED');
  assert.equal(
    urlBoundaryFixture('private-resolution', true, false, true).state,
    'UNSAFE_FIXTURE_ALLOW',
  );
});
test('initial request approval does not validate redirect targets; fixture never performs networking', () => {
  const r = urlBoundaryFixture('redirect-outside', true, true, true);
  assert.equal(r.state, 'BLOCKED');
  assert.equal(r.networkAttempt, true);
  assert.equal(r.stages.at(-1)!.result, 'REDIRECT_TARGET_DENIED');
  assert.equal(
    urlBoundaryFixture('redirect-outside', true, true, false).state,
    'UNSAFE_FIXTURE_ALLOW',
  );
});
test('moderation thresholds expose false positives/negatives and prevalence-dependent positive predictive value', () => {
  const a = moderationFixture(0.7, 0.01);
  assert.deepEqual([a.tp, a.fp, a.fn, a.tn], [3, 2, 3, 4]);
  assert.equal(a.samplePrecision, 0.6);
  assert.equal(a.expectedTP, 50);
  assert.equal(a.expectedFP, 3300);
  assert.ok(Math.abs(a.expectedPrecision! - 0.014925373134328358) < 1e-12);
  const b = moderationFixture(0.4, 0.01);
  assert.ok(b.tpr > a.tpr);
  assert.ok(b.fpr > a.fpr);
  assert.equal(moderationFixture(1, 0.01).samplePrecision, null);
  assert.equal(moderationFixture(0, 0.01).expectedPrecision, 0.01);
});
