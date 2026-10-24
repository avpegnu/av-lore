import { z } from 'zod';
const pair = (max: number) =>
  z.object({ vi: z.string().min(1).max(max), en: z.string().min(1).max(max) }).strict();
const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
export const mockPromptSchema = z
  .object({
    id: slug,
    title: pair(180),
    prompt: pair(4000),
    difficulty: z.enum(['intro', 'core', 'advanced']),
    lessonId: slug.optional(),
    topicId: slug.optional(),
    curveballs: z.array(pair(1500)).min(2).max(6),
  })
  .strict()
  .refine((p) => !!(p.lessonId || p.topicId), 'A lesson or topic reference is required');
export type MockPrompt = z.infer<typeof mockPromptSchema>;
export const mockPhaseIds = ['scope', 'estimate', 'data', 'architecture', 'depth', 'wrap'] as const;
export type MockPhaseId = (typeof mockPhaseIds)[number];
export const mockCoachSchema = z
  .object({
    id: z.enum(mockPhaseIds),
    title: pair(180),
    goal: pair(1200),
    checklist: z.array(pair(1200)).min(1).max(6),
  })
  .strict();
export const mockConfigSchema = z
  .object({ prompts: z.array(mockPromptSchema).min(1), coach: z.array(mockCoachSchema).length(6) })
  .superRefine((config, ctx) => {
    if (new Set(config.prompts.map((p) => p.id)).size !== config.prompts.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate prompt identity' });
    if (config.coach.some((p, i) => p.id !== mockPhaseIds[i]))
      ctx.addIssue({ code: 'custom', message: 'Coach order must match phase identifiers' });
  });
export type MockConfig = z.infer<typeof mockConfigSchema>;
export const mockDimensions = [
  'scope',
  'numbers',
  'design',
  'depth',
  'tradeoffs',
  'operations',
  'communication',
] as const;
export type MockDimension = (typeof mockDimensions)[number];
export const mockReviewStates = ['unreviewed', 'missing', 'partial', 'evidence'] as const;
export const mockHistoryLimit = 20;
const duration = z.union([z.literal(30), z.literal(45), z.literal(60)]);
const time = z.number().nonnegative().max(8_640_000_000_000_000);
const review = z.object({ state: z.enum(mockReviewStates), note: z.string().max(2000) }).strict();
export const mockSessionSchema = z
  .object({
    id: z.string().min(1).max(100),
    prompt: mockPromptSchema,
    durationMinutes: duration,
    startedAt: time,
    endedAt: time.nullable(),
    elapsedMs: z.number().nonnegative(),
    mode: z.enum(['paused', 'review']),
    notes: z
      .object({
        scope: z.string().max(8000),
        estimate: z.string().max(8000),
        data: z.string().max(8000),
        architecture: z.string().max(8000),
        depth: z.string().max(8000),
        wrap: z.string().max(8000),
      })
      .strict(),
    curveIds: z.array(z.number().int().nonnegative()).max(6),
    referenceUsed: z.boolean(),
    review: z
      .object({
        scope: review,
        numbers: review,
        design: review,
        depth: review,
        tradeoffs: review,
        operations: review,
        communication: review,
      })
      .strict(),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.elapsedMs > s.durationMinutes * 60_000)
      ctx.addIssue({ code: 'custom', message: 'Elapsed exceeds practice budget' });
    if (
      new Set(s.curveIds).size !== s.curveIds.length ||
      s.curveIds.some((n) => n >= s.prompt.curveballs.length)
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid curveball identity' });
    if (s.mode === 'paused' && s.endedAt !== null)
      ctx.addIssue({ code: 'custom', message: 'Paused session cannot have an end timestamp' });
    if (s.mode === 'review' && s.endedAt === null)
      ctx.addIssue({ code: 'custom', message: 'Review requires an end timestamp' });
    if (s.endedAt !== null && s.endedAt < s.startedAt)
      ctx.addIssue({ code: 'custom', message: 'End cannot precede start' });
  });
export type MockSession = z.infer<typeof mockSessionSchema>;
export const mockStoreSchema = z
  .object({
    version: z.literal(1),
    current: mockSessionSchema.nullable(),
    history: z.array(mockSessionSchema).max(mockHistoryLimit),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (new Set(s.history.map((h) => h.id)).size !== s.history.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate session identities' });
  });
export type MockStore = z.infer<typeof mockStoreSchema>;
export const emptyMock = (): MockStore => ({ version: 1, current: null, history: [] });
export function validateMock(raw: unknown): MockStore {
  return mockStoreSchema.parse(raw);
}
export { practiceElapsed, pausePractice, resumePractice } from './practice-clock';
export type { PracticeClock } from './practice-clock';
export function mockPhaseBounds(minutes: 30 | 45 | 60) {
  let cursor = 0;
  return [5, 4, 6, 10, 15, 5].map((weight, i) => {
    const start = cursor;
    cursor += (weight * minutes * 60_000) / 45;
    return { id: mockPhaseIds[i], start, end: cursor };
  });
}
export function mockPhaseAt(elapsedMs: number, minutes: 30 | 45 | 60) {
  return (
    mockPhaseBounds(minutes).find((p) => elapsedMs < p.end) || mockPhaseBounds(minutes).at(-1)!
  );
}
export function createMockSession(
  prompt: MockPrompt,
  minutes: 30 | 45 | 60,
  id: string,
  at: number,
): MockSession {
  return mockSessionSchema.parse({
    id,
    prompt,
    durationMinutes: minutes,
    startedAt: at,
    endedAt: null,
    elapsedMs: 0,
    mode: 'paused',
    notes: Object.fromEntries(mockPhaseIds.map((p) => [p, ''])),
    curveIds: [],
    referenceUsed: false,
    review: Object.fromEntries(mockDimensions.map((d) => [d, { state: 'unreviewed', note: '' }])),
  });
}
export function archiveMock(store: MockStore, session: MockSession): MockStore {
  const valid = mockSessionSchema.parse(session),
    history = [...store.history.filter((s) => s.id !== valid.id), valid].slice(-mockHistoryLimit);
  return { ...store, history };
}
export function startMock(
  store: MockStore,
  prompt: MockPrompt,
  minutes: 30 | 45 | 60,
  id: string,
  at: number,
): MockStore {
  const previous = store.current ? archiveMock(store, store.current) : store;
  return { ...previous, current: createMockSession(prompt, minutes, id, at) };
}
export function nextMockCurve(session: MockSession, random: number) {
  if (!Number.isFinite(random) || random < 0 || random >= 1) throw Error('INVALID_RANDOM');
  const remaining = session.prompt.curveballs
    .map((_, i) => i)
    .filter((i) => !session.curveIds.includes(i));
  if (!remaining.length) return session;
  return {
    ...session,
    curveIds: [...session.curveIds, remaining[Math.floor(random * remaining.length)]],
  };
}
