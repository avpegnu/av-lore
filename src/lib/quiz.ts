import { quizQuestionSchema } from './quiz-models';
import { handbookLessons } from './handbook';
import { topics } from './content';
const lessonIds = new Set(handbookLessons.map((l) => l.id)),
  topicIds = new Set(topics.map((t) => t.id));
export const quizQuestions = Object.values(
  import.meta.glob('../content/quiz/*.json', { eager: true, import: 'default' }),
).flatMap((value) => quizQuestionSchema.array().parse(value));
const seen = new Set<string>(),
  categories = new Map<string, { vi: string; en: string }>();
for (const q of quizQuestions) {
  if (seen.has(q.id)) throw Error('Duplicate quiz identity ' + q.id);
  seen.add(q.id);
  if (q.lessonId && !lessonIds.has(q.lessonId)) throw Error('Unknown quiz lesson ' + q.lessonId);
  if (q.topicId && !topicIds.has(q.topicId)) throw Error('Unknown quiz topic ' + q.topicId);
  if (q.relatedTopics.some((id) => !topicIds.has(id))) throw Error('Unknown quiz topic in ' + q.id);
  const label = categories.get(q.category.id);
  if (label && JSON.stringify(label) !== JSON.stringify(q.category.label))
    throw Error('Conflicting quiz category ' + q.category.id);
  categories.set(q.category.id, q.category.label);
}
export const quizCategories = [...categories].map(([id, label]) => ({ id, label }));
