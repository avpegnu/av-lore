import { buildReviewDeck } from './review-deck';
import { handbookGroups, handbookLessons } from './handbook';
import { topics } from './content';
import cache from '../i18n/en.json';
import overrides from '../i18n/en-overrides.json';
import { deduplicateQuestions, type BankQuestion } from './question-bank-models';
const authoredKeys = new Set<string>();
const dictionary: Record<string, string> = { ...cache, ...overrides };
function collect(v: unknown) {
  if (!v || typeof v !== 'object') return;
  const pair = v as { vi?: string; en?: string };
  if (typeof pair.vi === 'string' && typeof pair.en === 'string') {
    const key=pair.vi.replace(/\s+/g,' ').trim();
    authoredKeys.add(key);dictionary[key] = pair.en;
    return;
  }
  Object.values(v).forEach(collect);
}
handbookLessons.forEach(collect);
function english(s: string) {
  const key = s.replace(/\s+/g, ' ').trim(),
    value = dictionary[key];
  if (!value && /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(key))
    throw Error('Missing question-bank English: ' + key);
  const result = value || s;
  if (!authoredKeys.has(key) && /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(result))
    throw Error('Untranslated question-bank English: ' + key);
  return result;
}
export const bankGroups = [
  { id: 'notes', title: 'Notes & Interview' },
  ...Object.entries(handbookGroups).map(([id, title]) => ({ id, title: title.vi })),
];
export const bankTopics = topics.map((t) => ({ id: t.id, title: t.title }));
export const bankQuestions = deduplicateQuestions(
  buildReviewDeck()
    .filter((c) => c.source === 'topic' || c.source === 'handbook')
    .map((c) => {
      const lesson =
        c.source === 'handbook'
          ? handbookLessons.find((l) => c.id.startsWith('handbook:' + l.id + ':'))
          : undefined;
      const result: BankQuestion = {
        id: c.id,
        source: c.source as 'topic' | 'handbook',
        group: lesson?.group || 'notes',
        title: c.title,
        question: c.question,
        answer: c.answer,
        followUp: c.followUp,
        subjects: c.subjects,
        origins: [
          {
            id: c.id,
            key: c.legacyKey!,
            title: c.title,
            href: c.href,
            source: c.source as 'topic' | 'handbook',
            group: lesson?.group || 'notes',
          },
        ],
        english: {
          title: english(c.title),
          question: english(c.question),
          answer: c.answer.map(english),
          ...(c.followUp ? { followUp: english(c.followUp) } : {}),
        },
      };
      if (!c.legacyKey) throw Error('Question is missing its shared study identity: ' + c.id);
      return result;
    }),
);
