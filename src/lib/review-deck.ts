import { createHash } from 'node:crypto';
import { topics } from './content';
import { glossaryEntries } from './glossary';
import { handbookLessons, handbookPath } from './handbook';
import type { HandbookLesson } from './handbook';
export type ReviewCard = {
  id: string;
  revision: string;
  source: 'topic' | 'handbook' | 'visual' | 'term';
  title: string;
  question: string;
  answer: string[];
  subjects: string[];
  href: string;
  legacyKey?: string;
  followUp?: string;
  flow?: NonNullable<HandbookLesson['overview']>;
};
const hash = (v: unknown) =>
  createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 24);
/** Build from authoritative content; never maintain a second copy of interview answers. */
export function buildReviewDeck(): ReviewCard[] {
  const cards: ReviewCard[] = [];
  for (const t of topics)
    for (const q of t.questions) {
      const answer = [q.answer, q.explanation].filter((p) => p.trim());
      cards.push({
        id: `topic:${t.id}:${q.id}`,
        revision: hash([q.question, ...answer, q.followUp]),
        source: 'topic',
        title: t.title,
        question: q.question,
        answer,
        subjects: [t.id],
        href: `/handbook/${t.id}/#question-${q.id}`,
        legacyKey: `q/${t.id}/${q.id}`,
        followUp: q.followUp,
      });
    }
  for (const lesson of handbookLessons) {
    for (const s of lesson.sections)
      for (const q of s.questions || []) {
        const answer = q.answer.map((p) => p.vi);

        cards.push({
          id: `handbook:${lesson.id}:${s.id}:${hash(q.question.vi)}`,
          revision: hash([q.question, q.answer, q.followup]),
          followUp: q.followup?.vi,
          source: 'handbook',
          title: lesson.title.vi,
          question: q.question.vi,
          answer,
          subjects: lesson.relatedTopics,
          href: handbookPath(lesson) + '#' + s.id,
        });
      }
    if (lesson.overview)
      cards.push({
        id: `flow:${lesson.id}:overview`,
        revision: hash([lesson.overview, lesson.takeaways]),
        source: 'visual',
        title: lesson.title.vi,
        question: lesson.title.vi,
        answer: lesson.takeaways.map((t) => t.vi),
        subjects: lesson.relatedTopics,
        href: handbookPath(lesson),
        flow: lesson.overview,
      });
  }
  for (const entry of glossaryEntries)
    cards.push({
      id: `term:${entry.id}`,
      revision: hash([entry.definition, entry.example, entry.pitfall]),
      source: 'term',
      title: 'Thuật ngữ',
      question: entry.term,
      answer: [entry.definition.vi, entry.example.vi, entry.pitfall.vi],
      subjects: [
        ...new Set([
          ...entry.relatedTopics,
          ...entry.relatedLessons.flatMap(
            (id) => handbookLessons.find((l) => l.id === id)?.relatedTopics || [],
          ),
        ]),
      ],
      href: '/system-design/glossary/#term-' + entry.id,
    });
  const unique = new Map<string, ReviewCard>();
  for (const c of cards) {
    if (unique.has(c.id)) throw Error('Duplicate recall identity ' + c.id);
    unique.set(c.id, c);
  }
  return [...unique.values()];
}
