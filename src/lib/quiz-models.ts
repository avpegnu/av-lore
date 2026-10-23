import { z } from 'zod';
import { shuffledQuestionIds } from './question-bank-models';
const text = z.strictObject({ vi: z.string().min(1).max(12000), en: z.string().min(1).max(12000) });
const id = z.string().regex(/^[a-z][a-z0-9-]{0,99}$/);
export const quizQuestionSchema = z
  .strictObject({
    id,
    category: z.strictObject({ id, label: text }),
    question: text,
    options: z
      .array(z.strictObject({ id: z.enum(['a', 'b', 'c', 'd']), text, rationale: text }))
      .length(4),
    correctId: z.enum(['a', 'b', 'c', 'd']),
    explanation: z.array(text).min(1).max(8),
    lessonId: id.optional(),
    topicId: id.optional(),
    relatedTopics: z.array(id).min(1),
  })
  .superRefine((q, ctx) => {
    if (!q.lessonId && !q.topicId)
      ctx.addIssue({ code: 'custom', message: 'A quiz question needs a lesson or topic' });
    for (const locale of ['vi', 'en'] as const)
      if (new Set(q.options.map((o) => o.text[locale].trim())).size !== 4)
        ctx.addIssue({ code: 'custom', message: 'Duplicate option text' });
    if (new Set(q.options.map((o) => o.id)).size !== 4)
      ctx.addIssue({ code: 'custom', message: 'Duplicate options' });
    if (!q.options.some((o) => o.id === q.correctId))
      ctx.addIssue({ code: 'custom', message: 'Unknown correct option' });
  });
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizItem = {
  questionId: string;
  order: string[];
  picked: string | null;
  outcome: 'unanswered' | 'answered' | 'skipped' | 'timed-out';
  elapsedMs: number;
};
export function buildQuizSession(
  questions: QuizQuestion[],
  count: number | 'all',
  random = Math.random,
): QuizItem[] {
  if (new Set(questions.map((q) => q.id)).size !== questions.length)
    throw Error('Duplicate quiz identities');
  if (count !== 'all' && (!Number.isInteger(count) || count < 1 || count > 200))
    throw Error('Invalid quiz length');
  const byId = new Map(questions.map((q) => [q.id, q]));
  return shuffledQuestionIds(
    questions.map((q) => q.id),
    random,
  )
    .slice(0, count === 'all' ? questions.length : count)
    .map((id) => ({
      questionId: id,
      order: shuffledQuestionIds(
        byId.get(id)!.options.map((o) => o.id),
        random,
      ),
      picked: null,
      outcome: 'unanswered',
      elapsedMs: 0,
    }));
}
/** Only the first terminal decision counts; a late click cannot win over an expired timer. */
export function resolveQuizItem(
  item: QuizItem,
  question: QuizQuestion,
  choice: string | 'skip',
  elapsedMs: number,
  budgetMs: number | null,
): QuizItem {
  if (question.id !== item.questionId) throw Error('Mismatched quiz question');
  if (
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0 ||
    (budgetMs !== null && (!Number.isFinite(budgetMs) || budgetMs <= 0))
  )
    throw Error('Invalid quiz time');
  if (item.outcome !== 'unanswered') return item;
  if (choice !== 'skip' && !question.options.some((o) => o.id === choice))
    throw Error('Unknown quiz option');
  if (budgetMs !== null && elapsedMs >= budgetMs)
    return { ...item, picked: null, outcome: 'timed-out', elapsedMs: budgetMs };
  return {
    ...item,
    picked: choice === 'skip' ? null : choice,
    outcome: choice === 'skip' ? 'skipped' : 'answered',
    elapsedMs,
  };
}
export function quizSummary(items: QuizItem[], questions: QuizQuestion[]) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const result = {
    total: items.length,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    timedOut: 0,
    unanswered: 0,
    answered: 0,
  };
  for (const item of items) {
    const q = byId.get(item.questionId);
    if (!q) throw Error('Unknown quiz question');
    if (item.outcome === 'answered') {
      if (!q.options.some((o) => o.id === item.picked)) throw Error('Unknown answered option');
      result.answered++;
      if (item.picked === q.correctId) result.correct++;
      else result.incorrect++;
    } else if (item.outcome === 'skipped') result.skipped++;
    else if (item.outcome === 'timed-out') result.timedOut++;
    else result.unanswered++;
  }
  return {
    ...result,
    correctAllPercent: result.total ? (100 * result.correct) / result.total : null,
    correctAnsweredPercent: result.answered ? (100 * result.correct) / result.answered : null,
  };
}
