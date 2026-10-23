import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bankMark,
  changeBankMark,
  defaultBankFilter,
  deduplicateQuestions,
  parseBankStudy,
  selectBankQuestions,
  shuffledQuestionIds,
  type BankQuestion,
} from '../src/lib/question-bank-models';
const q: BankQuestion = {
  id: 'topic:cache:q',
  source: 'topic',
  group: 'notes',
  title: 'Bộ nhớ đệm',
  question: 'Cache có giữ bí mật không?',
  answer: ['Kiểm tra quyền và scope.'],
  subjects: ['cache', 'auth'],
  origins: [
    {
      id: 'topic:cache:q',
      key: 'q/cache/q',
      title: 'Cache',
      href: '/handbook/cache/#question-q',
      source: 'topic',
      group: 'notes',
    },
  ],
  english: {
    title: 'Caching',
    question: 'Does caching preserve confidentiality?',
    answer: ['Check authorization and scope.'],
  },
};
const other: BankQuestion = {
  ...q,
  id: 'handbook:cache:q',
  source: 'handbook',
  group: 'building',
  origins: [
    {
      ...q.origins[0],
      id: 'handbook:cache:q',
      key: 'q/handbook/cache/q',
      source: 'handbook',
      group: 'building',
    },
  ],
};
test('exact duplicate answers merge origins, while different answers, code case and follow-ups remain separate', () => {
  const merged = deduplicateQuestions([q, other]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].origins.length, 2);
  assert.equal(q.origins.length, 1);
  const state = parseBankStudy(null);
  assert.equal(
    selectBankQuestions(
      merged,
      { ...defaultBankFilter, source: 'handbook', group: 'building' },
      state,
    ).questions.length,
    1,
  );
  assert.equal(
    selectBankQuestions(merged, { ...defaultBankFilter, source: 'topic', group: 'building' }, state)
      .questions.length,
    0,
  );
  assert.equal(deduplicateQuestions([q, { ...other, answer: ['Khác scope.'] }]).length, 2);
  assert.equal(deduplicateQuestions([q, { ...other, followUp: 'What if revoked?' }]).length, 2);
  assert.equal(
    deduplicateQuestions([
      q,
      { ...other, answer: ['checkRole(A)'] },
      { ...other, id: 'third', answer: ['checkRole(a)'] },
    ]).length,
    3,
  );
  assert.throws(() => deduplicateQuestions([q, q]));
});
test('search is bilingual, accent-insensitive AND, while group counts precede group facet and filters compose', () => {
  const state = parseBankStudy(null),
    deck = [q, { ...other, answer: ['Không merge.'] }];
  assert.equal(
    selectBankQuestions(deck, { ...defaultBankFilter, query: 'bi mat quyen' }, state).questions
      .length,
    1,
  );
  assert.equal(
    selectBankQuestions(
      deck,
      { ...defaultBankFilter, query: 'confidentiality scope', source: 'handbook' },
      state,
    ).questions.length,
    1,
  );
  const result = selectBankQuestions(
    deck,
    { ...defaultBankFilter, group: 'notes', topic: 'auth' },
    state,
  );
  assert.deepEqual(result.counts, { notes: 1, building: 1 });
  assert.equal(result.questions.length, 1);
  assert.equal(
    selectBankQuestions(deck, { ...defaultBankFilter, query: 'totally absent' }, state).questions
      .length,
    0,
  );
});
test('rating precedence, alias cleanup and bookmarks preserve unrelated session, notes and unknown identities', () => {
  const merged = deduplicateQuestions([q, other])[0];
  const state = {
    ...parseBankStudy(null),
    known: ['q/cache/q', 'q/other/q'],
    review: ['q/handbook/cache/q'],
    bookmarks: ['n/cache/note', 'q/handbook/cache/q'],
    last: 'keep',
    session: { keep: true },
  };
  assert.equal(bankMark(merged, state).rating, 'review');
  const next = changeBankMark(state, merged, 'known');
  assert.deepEqual(next.known, ['q/other/q', 'q/cache/q']);
  assert.deepEqual(next.review, []);
  assert.equal(next.session, state.session);
  assert.deepEqual(state.review, ['q/handbook/cache/q']);
  assert.deepEqual(changeBankMark(next, merged, 'bookmark').bookmarks, ['n/cache/note']);
  assert.deepEqual(changeBankMark(next, merged, 'unseen').known, ['q/other/q']);
  assert.equal(
    selectBankQuestions([merged], { ...defaultBankFilter, status: 'review' }, state).questions
      .length,
    1,
  );
  assert.equal(
    selectBankQuestions([merged], { ...defaultBankFilter, status: 'saved' }, state).questions
      .length,
    1,
  );
});
test('malformed persisted data fails closed; shuffle preserves identities and rejects invalid randomness', () => {
  assert.throws(() => parseBankStudy('{bad'));
  assert.throws(() => parseBankStudy('null'));
  assert.throws(() => parseBankStudy('{"bookmarks":[],"known":[1],"review":[]}'));
  const ids = ['a', 'b', 'c', 'd'];
  assert.deepEqual(new Set(shuffledQuestionIds(ids, () => 0.4)), new Set(ids));
  assert.deepEqual(ids, ['a', 'b', 'c', 'd']);
  assert.throws(() => shuffledQuestionIds(ids, () => 1));
});
