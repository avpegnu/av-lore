import { normalizeGlossary } from './glossary-models';
import { validateStudy, type StudyState } from './study';
export type BankOrigin = {
  id: string;
  key: string;
  title: string;
  href: string;
  source: 'topic' | 'handbook';
  group: string;
};
export type BankQuestion = {
  id: string;
  source: 'topic' | 'handbook';
  group: string;
  title: string;
  question: string;
  answer: string[];
  followUp?: string;
  subjects: string[];
  origins: BankOrigin[];
  english: { title: string; question: string; answer: string[]; followUp?: string };
};
export type BankFilter = {
  query: string;
  source: 'all' | 'topic' | 'handbook';
  group: string;
  topic: string;
  status: 'all' | 'unseen' | 'known' | 'review' | 'saved';
};
export const defaultBankFilter: BankFilter = {
  query: '',
  source: 'all',
  group: 'all',
  topic: 'all',
  status: 'all',
};
/** Exact edited content only. Do not collapse similar questions with different contexts/answers. */
export function deduplicateQuestions(questions: BankQuestion[]): BankQuestion[] {
  const output = new Map<string, BankQuestion>(),
    ids = new Set<string>();
  const tidy = (s: string) => s.trim();
  for (const q of questions) {
    if (ids.has(q.id)) throw Error('Duplicate question identity ' + q.id);
    ids.add(q.id);
    const key = JSON.stringify([
      tidy(q.question),
      q.answer.map(tidy),
      tidy(q.followUp || ''),
      tidy(q.english.question),
      q.english.answer.map(tidy),
      tidy(q.english.followUp || ''),
    ]);
    const previous = output.get(key);
    if (!previous) output.set(key, { ...q, subjects: [...q.subjects], origins: [...q.origins] });
    else {
      previous.subjects = [...new Set([...previous.subjects, ...q.subjects])];
      previous.origins.push(...q.origins);
    }
  }
  return [...output.values()];
}
export function bankMark(q: Pick<BankQuestion, 'origins'>, state: StudyState) {
  const keys = new Set(q.origins.map((o) => o.key));
  return {
    rating: state.review.some((k) => keys.has(k))
      ? ('review' as const)
      : state.known.some((k) => keys.has(k))
        ? ('known' as const)
        : ('unseen' as const),
    saved: state.bookmarks.some((k) => keys.has(k)),
  };
}
export function selectBankQuestions(
  questions: BankQuestion[],
  filter: BankFilter,
  state: StudyState,
) {
  const words = normalizeGlossary(filter.query).split(' ').filter(Boolean);
  const matched = questions.filter((q) => {
    const text = normalizeGlossary(
      [
        q.title,
        q.question,
        ...q.answer,
        q.followUp || '',
        q.english.title,
        q.english.question,
        ...q.english.answer,
        q.english.followUp || '',
        ...q.subjects,
        ...q.origins.map((o) => o.title),
      ].join(' '),
    );
    const mark = bankMark(q, state);
    return (
      words.every((w) => text.includes(w)) &&
      (filter.source === 'all' || q.origins.some((o) => o.source === filter.source)) &&
      (filter.topic === 'all' || q.subjects.includes(filter.topic)) &&
      (filter.status === 'all' ||
        (filter.status === 'saved' ? mark.saved : mark.rating === filter.status))
    );
  });
  const counts: Record<string, number> = {};
  matched.forEach((q) => {
    for (const group of new Set(
      q.origins
        .filter((o) => filter.source === 'all' || o.source === filter.source)
        .map((o) => o.group),
    ))
      counts[group] = (counts[group] || 0) + 1;
  });
  return {
    questions: matched.filter(
      (q) =>
        filter.group === 'all' ||
        q.origins.some(
          (o) =>
            o.group === filter.group && (filter.source === 'all' || o.source === filter.source),
        ),
    ),
    counts,
  };
}
/** Pure mutation: remove conflicting alias marks, preserve unrelated notes/ratings/session. */
export function changeBankMark(
  state: StudyState,
  question: Pick<BankQuestion, 'origins'>,
  action: 'known' | 'review' | 'unseen' | 'bookmark',
): StudyState {
  const keys = new Set(question.origins.map((o) => o.key));
  if (!keys.size) throw Error('A question needs an authoritative origin');
  const primary = question.origins[0].key;
  if (action === 'bookmark') {
    const saved = state.bookmarks.some((k) => keys.has(k));
    return {
      ...state,
      bookmarks: [...state.bookmarks.filter((k) => !keys.has(k)), ...(saved ? [] : [primary])],
    };
  }
  return {
    ...state,
    known: [...state.known.filter((k) => !keys.has(k)), ...(action === 'known' ? [primary] : [])],
    review: [
      ...state.review.filter((k) => !keys.has(k)),
      ...(action === 'review' ? [primary] : []),
    ],
  };
}
/** Missing storage is fresh. Malformed existing data must never silently become empty data. */
export function parseBankStudy(raw: string | null): StudyState {
  return raw === null
    ? { bookmarks: [], known: [], review: [], last: null, session: null }
    : validateStudy(JSON.parse(raw));
}
export function shuffledQuestionIds(ids: string[], random = Math.random) {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw Error('Invalid random source');
    const j = Math.floor(value * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
