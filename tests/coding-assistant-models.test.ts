import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completionRace,
  codingContextPack,
  codingPatchGate,
} from '../src/lib/coding-assistant-models';
test('debounce suppresses obsolete proposals while snapshot/deadline guards independently bound display races', () => {
  const a = completionRace(100, 200, true, true, false);
  assert.equal(a.admitted, 1);
  assert.equal(a.lastShown, 'R3');
  assert.equal(a.events[0].finish, 460);
  const b = completionRace(0, 200, false, false, false);
  assert.equal(b.admitted, 3);
  assert.equal(b.staleShown, 2);
  assert.equal(b.lastShown, 'R1');
  const c = completionRace(0, 200, true, false, false);
  assert.equal(c.staleShown, 0);
  assert.equal(c.lastShown, 'R3');
  assert.equal(completionRace(100, 600, true, true, false).lastShown, 'NONE');
});
test('cancellation requests do not establish that every obsolete response was stopped', () => {
  const a = completionRace(0, 200, false, false, true);
  assert.equal(a.cancelRequested, 2);
  assert.equal(a.staleShown, 1);
  assert.equal(a.lastShown, 'R1');
  assert.equal(completionRace(0, 200, true, false, true).staleShown, 0);
});
test('context admission enforces exclusions before optional packing and rejects required overflow', () => {
  assert.deepEqual(codingContextPack(1500, true).selected, [
    'PREFIX',
    'SUFFIX',
    'TYPE_DEFINITION',
    'README_SNIPPET',
  ]);
  assert.equal(codingContextPack(1500, true).used, 1500);
  assert.equal(codingContextPack(1500, false).excludedIncluded, true);
  assert.equal(codingContextPack(500, true).state, 'REQUIRED_CONTEXT_OVER_BUDGET');
  assert.equal(codingContextPack(500, true).used, 0);
});
test('patch application binds base, tested patch and approvals then checks current commit version atomically', () => {
  assert.equal(codingPatchGate('fresh', true, true, true, true).state, 'APPLIED_FIXTURE');
  assert.equal(codingPatchGate('workspace-changed', true, true, true, true).state, 'BASE_CONFLICT');
  assert.equal(
    codingPatchGate('workspace-changed', false, true, true, true).state,
    'TEST_EVIDENCE_MISMATCH',
  );
  assert.equal(
    codingPatchGate('workspace-changed', false, false, false, true).state,
    'STALE_PATCH_APPLIED',
  );
  assert.equal(
    codingPatchGate('patch-changed', true, true, true, true).state,
    'TEST_EVIDENCE_MISMATCH',
  );
  assert.equal(
    codingPatchGate('patch-changed', true, false, true, true).state,
    'APPROVAL_PAYLOAD_MISMATCH',
  );
  assert.equal(
    codingPatchGate('patch-changed', true, false, false, true).state,
    'UNTESTED_PATCH_APPLIED',
  );
  assert.equal(
    codingPatchGate('concurrent-edit', true, true, true, true).state,
    'COMMIT_VERSION_CONFLICT',
  );
  assert.equal(
    codingPatchGate('concurrent-edit', true, true, true, false).state,
    'UNSAFE_OVERWRITE',
  );
  assert.equal(codingPatchGate('excluded-path', false, false, false, false).applied, false);
});
