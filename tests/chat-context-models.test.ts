import test from 'node:test';
import assert from 'node:assert/strict';
import { planChatContext } from '../src/lib/chat-context-models';
const input = {
  window: 32768,
  turns: 40,
  tokensPerGroup: 750,
  chunks: 8,
  output: 4096,
  strategy: 'recent' as const,
};
test('context planner preserves atomic newest groups and accounts for all reservations', () => {
  const r = planChatContext(input);
  assert.equal(r.fates.filter((f) => f === 'kept').length, 27);
  assert.equal(r.fates[12], 'dropped');
  assert.equal(r.fates[13], 'kept');
  assert.equal(r.required, 32026);
  assert.equal(r.free, 742);
  assert.equal(r.required, r.prompt + r.output + r.margin);
});
test('summary competes with history; selected retrieval is not complete memory', () => {
  const s = planChatContext({ ...input, strategy: 'summary' });
  assert.equal(s.fates.filter((f) => f === 'kept').length, 26);
  assert.equal(s.fates.filter((f) => f === 'summarized').length, 14);
  assert.equal(s.summary, 1050);
  assert.equal(s.free, 442);
  const r = planChatContext({ ...input, strategy: 'retrieve' });
  assert.equal(r.fates.filter((f) => f === 'kept').length, 4);
  assert.equal(r.fates.filter((f) => f === 'retrieved').length, 3);
  assert.equal(r.fates.filter((f) => f === 'dropped').length, 33);
  assert.equal(r.history, 5250);
});
test('oversized fixed content rejects all history without silently reducing evidence/output', () => {
  const r = planChatContext({ ...input, window: 8192, strategy: 'summary' });
  assert.equal(r.overflow, 3584);
  assert.equal(r.fits, false);
  assert.equal(r.summary, 0);
  assert.ok(r.fates.every((f) => f === 'dropped'));
  assert.equal(r.output, input.output);
  assert.equal(r.evidence, input.chunks * 512);
  assert.equal(planChatContext({ ...input, turns: 0 }).history, 0);
  const all = planChatContext({ ...input, window: 131072, strategy: 'summary' });
  assert.ok(all.fates.every((f) => f === 'kept'));
  assert.equal(all.summary, 0);
});
