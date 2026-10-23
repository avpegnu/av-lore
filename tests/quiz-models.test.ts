import test from 'node:test';
import assert from 'node:assert/strict';
import {
  quizQuestionSchema,
  buildQuizSession,
  resolveQuizItem,
  quizSummary,
} from '../src/lib/quiz-models';
const t = { vi: 'Ví dụ', en: 'Example' };
const q = quizQuestionSchema.parse({
  id: 'example',
  category: { id: 'core', label: t },
  question: t,
  options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: { vi: id, en: id }, rationale: t })),
  correctId: 'b',
  explanation: [t],
  lessonId: 'framework',
  relatedTopics: ['system-design'],
});
test('quiz content validates stable options and sample/option permutations preserve identities without mutation', () => {
  assert.throws(() => quizQuestionSchema.parse({ ...q, correctId: 'missing' }));
  assert.throws(() =>
    quizQuestionSchema.parse({
      ...q,
      options: [q.options[0], q.options[0], ...q.options.slice(2)],
    }),
  );
  const pool = [q, { ...q, id: 'second' }, { ...q, id: 'third' }],
    before = JSON.stringify(pool),
    items = buildQuizSession(pool, 2, () => 0.25);
  assert.equal(items.length, 2);
  assert.equal(new Set(items.map((i) => i.questionId)).size, 2);
  for (const i of items) assert.deepEqual(new Set(i.order), new Set(['a', 'b', 'c', 'd']));
  assert.equal(JSON.stringify(pool), before);
  assert.throws(() => buildQuizSession([q, q], 'all'));
  assert.throws(() => buildQuizSession(pool, 0));
});
test('first decision is immutable, expired clicks time out, pause timing is supplied as elapsed and skips remain distinct', () => {
  const item = buildQuizSession([q], 'all', () => 0.4)[0];
  const right = resolveQuizItem(item, q, 'b', 29999, 30000);
  assert.equal(right.outcome, 'answered');
  assert.equal(resolveQuizItem(right, q, 'a', 30001, 30000), right);
  const late = resolveQuizItem(item, q, 'b', 30000, 30000);
  assert.equal(late.outcome, 'timed-out');
  assert.equal(late.picked, null);
  assert.equal(resolveQuizItem(item, q, 'skip', 0, null).outcome, 'skipped');
  assert.throws(() => resolveQuizItem(item, q, 'unknown', 0, null));
  const summary = quizSummary(
    [right, { ...late, questionId: 'second' }, { ...item, questionId: 'third' }],
    [q, { ...q, id: 'second' }, { ...q, id: 'third' }],
  );
  assert.equal(summary.correct, 1);
  assert.equal(summary.timedOut, 1);
  assert.equal(summary.unanswered, 1);
  assert.equal(summary.correctAnsweredPercent, 100);
  assert.equal(summary.correctAllPercent, 100 / 3);
  assert.equal(quizSummary([], []).correctAllPercent, null);
});
