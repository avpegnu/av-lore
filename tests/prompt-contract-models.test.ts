import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tinyLanguage,
  tinyVocab,
  tinyCandidates,
  tinyDecode,
  extractionCheck,
  newTicketFixture,
  closeTicketFixture,
} from '../src/lib/prompt-contract-models';
test('token pieces can span grammar boundaries; only completed language permits EOS', () => {
  assert.equal(tinyLanguage.length, 6);
  assert.equal(tinyCandidates('').find((c) => c.token === '<eos>')!.allowed, false);
  assert.ok(tinyCandidates('{"status":"').find((c) => c.token === 'ok","count":')!.allowed);
  for (const text of tinyLanguage) {
    let prefix = '';
    for (const char of text) {
      assert.ok(tinyVocab.includes(char));
      assert.ok(tinyCandidates(prefix).find((c) => c.token === char)!.allowed);
      prefix += char;
    }
    assert.ok(tinyCandidates(text).find((c) => c.token === '<eos>')!.allowed);
    assert.equal(tinyCandidates(text).filter((c) => c.allowed).length, 1);
  }
  assert.equal(tinyCandidates('Sure!').filter((c) => c.allowed).length, 0);
});
test('locally constrained prefixes may still truncate before a completed output', () => {
  const full = tinyDecode(true, 16),
    short = tinyDecode(true, 2),
    free = tinyDecode(false, 16);
  assert.ok(full.complete && full.finished);
  assert.equal(full.reason, 'EOS');
  assert.equal(JSON.parse(full.prefix).status, 'ok');
  assert.equal(short.complete, false);
  assert.equal(short.reason, 'LIMIT');
  assert.equal(free.prefix, 'Sure!');
  for (const h of free.history) assert.equal(h.token, tinyCandidates(h.prefix)[0].token);
  assert.ok(free.finished && !free.complete);
  for (const h of full.history)
    assert.ok(tinyCandidates(h.prefix).find((c) => c.token === h.token)!.allowed);
});
test('parse, schema, task truth and envelope are independent validation boundaries', () => {
  assert.equal(extractionCheck('correct', true).result, 'MATCHES_FIXTURE');
  assert.equal(extractionCheck('semantic', true).schema, true);
  assert.equal(extractionCheck('semantic', true).result, 'SEMANTIC_MISMATCH');
  for (const p of ['extra', 'type', 'missing'] as const)
    assert.equal(extractionCheck(p, true).result, 'SCHEMA_ERROR');
  assert.equal(extractionCheck('syntax', true).result, 'PARSE_ERROR');
  assert.equal(extractionCheck('truncated', true).result, 'PARSE_ERROR');
  assert.equal(extractionCheck('correct', false).result, 'INCOMPLETE');
  assert.equal(extractionCheck('refused', true).result, 'REFUSAL');
});
test('server authorizes and checks versions/business rules; same logical retry replays one atomic receipt', () => {
  const initial = newTicketFixture();
  assert.equal(closeTicketFixture(initial, 'beta', 0, 7, 'k1').result, 'DENIED');
  assert.equal(closeTicketFixture(initial, 'alpha', 1, 7, 'k1').result, 'BLOCKED');
  assert.equal(closeTicketFixture(initial, 'alpha', 0, 6, 'k1').result, 'VERSION_CONFLICT');
  const first = closeTicketFixture(initial, 'alpha', 0, 7, 'k1');
  assert.equal(first.result, 'COMMITTED');
  assert.equal(first.state.effects, 1);
  assert.equal(first.state.version, 8);
  const replay = closeTicketFixture(first.state, 'alpha', 0, 7, 'k1');
  assert.equal(replay.result, 'REPLAYED');
  assert.equal(replay.state.effects, 1);
  assert.equal(closeTicketFixture(first.state, 'alpha', 0, 8, 'k1').result, 'KEY_MISMATCH');
  assert.equal(closeTicketFixture(first.state, 'alpha', 0, 7, 'k2').result, 'VERSION_CONFLICT');
  assert.equal(closeTicketFixture(first.state, 'beta', 0, 7, 'k1').result, 'DENIED');
});
