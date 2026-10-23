import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyMock,
  createMockSession,
  practiceElapsed,
  pausePractice,
  resumePractice,
  mockPhaseBounds,
  mockPhaseAt,
  startMock,
  archiveMock,
  nextMockCurve,
  validateMock,
  type MockPrompt,
} from '../src/lib/mock-interview-models';
const t = (s: string) => ({ vi: s, en: s }),
  prompt: MockPrompt = {
    id: 'one',
    title: t('Test prompt'),
    prompt: t('Specify a bounded system.'),
    difficulty: 'core',
    lessonId: 'news-feed',
    curveballs: [t('Region loss'), t('Duplicate input'), t('Changed access')],
  };
test('practice clocks use elapsed deltas, clamp boundaries and preserve paused and resumed time without tick counting', () => {
  let c = { elapsedMs: 0, anchor: null as number | null };
  c = resumePractice(c, 100, 1000);
  assert.equal(practiceElapsed(c, 765, 1000), 665);
  assert.equal(
    practiceElapsed(resumePractice(c, 765, 1000), 800, 1000),
    700,
    'Repeated resume does not double count an active interval',
  );
  c = pausePractice(c, 765, 1000);
  assert.equal(practiceElapsed(c, 5000, 1000), 665);
  c = resumePractice(c, 6000, 1000);
  assert.equal(practiceElapsed(c, 6100, 1000), 765);
  assert.equal(practiceElapsed(c, 10000, 1000), 1000);
  assert.equal(resumePractice(pausePractice(c, 10000, 1000), 11000, 1000).anchor, null);
  assert.equal(practiceElapsed({ elapsedMs: 50, anchor: 100 }, 80, 1000), 50);
  assert.throws(() => practiceElapsed(c, NaN, 1000));
});
test('all practice durations allocate exact budgets and select next phases at boundaries', () => {
  for (const minutes of [30, 45, 60] as const) {
    const phases = mockPhaseBounds(minutes);
    assert.equal(phases[0].start, 0);
    assert.equal(phases.at(-1)!.end, minutes * 60000);
    for (let i = 1; i < phases.length; i++) {
      assert.equal(phases[i].start, phases[i - 1].end);
      assert.equal(mockPhaseAt(phases[i].start, minutes).id, phases[i].id);
    }
    assert.equal(mockPhaseAt(minutes * 60000, minutes).id, 'wrap');
  }
});
test('starting another prompt archives prior notes, and repeated saves update one identity rather than duplicating history', () => {
  let store = startMock(emptyMock(), prompt, 45, 'session-one', 1);
  store.current!.notes.depth = 'Evidence to retain';
  store = startMock(store, { ...prompt, id: 'two' }, 30, 'session-two', 2);
  assert.equal(store.history[0].notes.depth, 'Evidence to retain');
  assert.equal(store.current!.notes.depth, '');
  store = archiveMock(store, { ...store.history[0], elapsedMs: 123 });
  assert.equal(store.history.length, 1);
  assert.equal(store.history[0].elapsedMs, 123);
  assert.equal(store.current!.id, 'session-two');
});
test('curveball draws sample only remaining identities and preserve notes after exhaustion', () => {
  let s = createMockSession(prompt, 45, 'a', 1);
  s.notes.scope = 'keep';
  for (let i = 0; i < 3; i++) s = nextMockCurve(s, 0.99);
  assert.equal(new Set(s.curveIds).size, 3);
  assert.deepEqual(nextMockCurve(s, 0.1), s);
  assert.equal(s.notes.scope, 'keep');
  assert.throws(() => nextMockCurve(s, 1));
});
test('mock import validation rejects unbounded, malformed and contradictory state while allowing explicit unreviewed evidence', () => {
  const store = startMock(emptyMock(), prompt, 45, 'a', 1);
  assert.deepEqual(validateMock(store), store);
  const bad = structuredClone(store);
  bad.current!.elapsedMs = 46 * 60000;
  assert.throws(() => validateMock(bad));
  const dup = structuredClone(store);
  dup.current!.curveIds = [0, 0];
  assert.throws(() => validateMock(dup));
  const note = structuredClone(store);
  note.current!.notes.scope = 'x'.repeat(8001);
  assert.throws(() => validateMock(note));
  assert.throws(() => validateMock({ ...store, arbitrary: 'field' }));
  assert.throws(() => validateMock({ ...store, history: Array(21).fill(store.current) }));
});

test('authored mock prompts and coaching have bilingual text and resolvable authoritative references', async () => {
  const fs = await import('node:fs');
  const { mockConfigSchema } = await import('../src/lib/mock-interview-models');
  const lesson = JSON.parse(fs.readFileSync('src/content/handbook/mock.json', 'utf8'));
  const config = mockConfigSchema.parse(
    lesson.sections.find((s: { mock?: unknown }) => s.mock).mock,
  );
  assert.ok(config.prompts.length >= 36);
  for (const p of config.prompts) {
    if (p.lessonId)
      assert.ok(fs.existsSync('src/content/handbook/' + p.lessonId + '.json'), p.id + ' lesson');
    if (p.topicId)
      assert.ok(fs.existsSync('src/content/topics/' + p.topicId + '.json'), p.id + ' topic');
  }
  function inspect(value: unknown) {
    if (!value || typeof value !== 'object') return;
    if ('vi' in value && 'en' in value) {
      assert.ok(typeof value.vi === 'string' && value.vi.trim());
      assert.ok(typeof value.en === 'string' && value.en.trim());
      assert.equal(/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(value.en), false);
      return;
    }
    for (const item of Object.values(value)) inspect(item);
  }
  inspect(config);
});
