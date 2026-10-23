import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { quizQuestionSchema } from '../src/lib/quiz-models';
const read = (directory: string) =>
  fs
    .readdirSync(directory)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(directory + '/' + f, 'utf8')));
test('quiz corpus has unambiguous bilingual options, consistent categories and existing lesson/topic links', () => {
  const questions = read('src/content/quiz').flatMap((rows) =>
      quizQuestionSchema.array().parse(rows),
    ),
    ids = new Set<string>(),
    categories = new Map<string, string>();
  const lessons = new Set(read('src/content/handbook').map((l) => l.id)),
    topics = new Set(read('src/content/topics').map((t) => t.id));
  assert.ok(questions.length);
  for (const q of questions) {
    assert.ok(!ids.has(q.id), 'duplicate ' + q.id);
    ids.add(q.id);
    if (q.lessonId) assert.ok(lessons.has(q.lessonId), q.id + '/' + q.lessonId);
    if (q.topicId) assert.ok(topics.has(q.topicId), q.id + '/' + q.topicId);
    assert.ok(
      q.relatedTopics.every((id) => topics.has(id)),
      q.id,
    );
    const label = JSON.stringify(q.category.label);
    assert.ok(!categories.has(q.category.id) || categories.get(q.category.id) === label);
    categories.set(q.category.id, label);
    for (const pair of [
      q.question,
      ...q.options.flatMap((o) => [o.text, o.rationale]),
      ...q.explanation,
    ])
      assert.ok(!/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(pair.en), 'Untranslated quiz ' + q.id);
  }
});

test('worked numeric answer keys preserve units, denominators and stated analytical assumptions', () => {
  const questions = read('src/content/quiz').flat();
  const key = (id: string) => {
    const q = questions.find((q) => q.id === id);
    assert.ok(q, id);
    return q.options.find((o: { id: string }) => o.id === q.correctId).text.en;
  };
  const number = (id: string) => Number(key(id).match(/\d+(?:\.\d+)?/)![0]);
  assert.equal(number('average-rate'), 864000000 / 86400);
  assert.equal(number('bit-byte-rate'), 2e9 / 8 / 1e6);
  assert.ok(Math.abs(number('time-budget') - 30 * 24 * 60 * 0.001) < 1e-9);
  assert.equal(number('mean-concurrency'), 200 * 0.25);
  assert.equal(number('backlog-drain'), 600000 / (3000 - 2000));
  assert.equal(number('sequence-bits'), 2 ** 12);
  assert.equal(number('kv-bytes'), 2 * 80 * 8 * 128 * 2);
  assert.equal(number('mds-erasure'), 12 / 8);
  assert.equal(key('code-space'), '62^8');
});
