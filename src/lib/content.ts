import { z } from 'zod';
import trackData from './tracks.json';
const source = z.object({ title: z.string().min(1), url: z.url() });
const diagram = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('flow'),
    title: z.string(),
    nodes: z.array(z.string()),
    caption: z.string(),
  }),
  z.object({
    type: z.literal('sequence'),
    title: z.string(),
    actors: z.array(z.string()),
    steps: z.array(z.tuple([z.number(), z.number(), z.string()])),
    caption: z.string(),
  }),
  z.object({
    type: z.literal('graph'),
    title: z.string(),
    nodes: z.array(z.tuple([z.number(), z.number(), z.string()])),
    edges: z.array(z.tuple([z.number(), z.number()])),
    caption: z.string(),
  }),
  z.object({
    type: z.literal('boxes'),
    title: z.string(),
    labels: z.array(z.string()),
    caption: z.string(),
  }),
]);
const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.array(z.string()),
  example: z.string(),
  pitfall: z.string(),
  exercise: z.string(),
  diagram: diagram.optional(),
  table: z.object({ headers: z.array(z.string()), rows: z.array(z.array(z.string())) }).optional(),
  download: z.object({ url: z.string(), title: z.string() }).optional(),
});
const topicSchema = z.object({
  id: z.string(),
  title: z.string(),
  group: z.string(),
  description: z.string(),
  sources: z.array(source),
  prerequisites: z.array(z.string()),
  notes: z.array(noteSchema),
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      answer: z.string(),
      explanation: z.string(),
      followUp: z.string(),
      note: z.string(),
      level: z.string(),
    }),
  ),
});
const courseSchema = z.object({
  id: z.string(),
  track: z.string(),
  trackTitle: z.string(),
  slug: z.string(),
  order: z.number(),
  title: z.string(),
  description: z.string(),
  html: z.string(),
  headings: z.array(z.object({ id: z.string(), text: z.string(), depth: z.number() })),
  source: z.string(),
  sourceHash: z.string(),
  readingMinutes: z.number(),
});
const order =
  'programming oop dsa os git linux network html-css javascript typescript react rendering backend nodejs api auth security sql database nosql cache messaging architecture distributed storage-search system-design testing docker-cicd kubernetes observability interview-skills'.split(
    ' ',
  );
export const topics = Object.values(
  import.meta.glob('../content/topics/*.json', { eager: true, import: 'default' }),
)
  .map((t) => topicSchema.parse(t))
  .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
export const courses = Object.values(
  import.meta.glob('../content/courses/*.json', { eager: true, import: 'default' }),
)
  .map((c) => courseSchema.parse(c))
  .sort((a, b) => a.order - b.order);
export const tracks = trackData.map((t) => ({
  ...t,
  chapters: courses.filter((c) => c.track === t.id),
}));
export type Topic = z.infer<typeof topicSchema>;
export type Note = z.infer<typeof noteSchema>;
export type Diagram = z.infer<typeof diagram>;
export const stats = {
  chapters: courses.length,
  topics: topics.length,
  notes: topics.reduce((n, t) => n + t.notes.length, 0),
  questions: topics.reduce((n, t) => n + t.questions.length, 0),
};
import { url } from './url';
export { url } from './url';
// Imported prose uses canonical site-relative URLs. Prefix only local roots.
export const prose = (html: string) =>
  html.replace(/(href|src)="\/(?!\/)([^"]*)"/g, (_, attr, rest) => `${attr}="${url('/' + rest)}"`);
export const groups = [...new Set(topics.map((t) => t.group))];
