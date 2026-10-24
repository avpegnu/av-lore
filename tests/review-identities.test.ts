import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { handbookQuestionIdentity } from '../src/lib/review-identities';

test('handbook question identities keep legacy marks and remain stable after wording corrections', () => {
  const original = { question: { vi: 'Vì sao35% chưa đủ để kết luận availability?' } };
  const legacy = createHash('sha256')
    .update(JSON.stringify(original.question.vi))
    .digest('hex')
    .slice(0, 24);
  assert.equal(handbookQuestionIdentity(original), legacy);
  assert.equal(
    handbookQuestionIdentity({
      id: legacy,
      question: { vi: 'Vì sao 35% chưa đủ để kết luận availability?' },
    }),
    legacy,
  );
});

test('authored question identities are explicit and unique within their stored lesson/section scope', () => {
  for (const file of fs.readdirSync('src/content/handbook').filter((f) => f.endsWith('.json'))) {
    const lesson = JSON.parse(fs.readFileSync('src/content/handbook/' + file, 'utf8'));
    for (const section of lesson.sections) {
      const ids = (section.questions || []).map((q: { id: string; question: { vi: string } }) => {
        assert.match(q.id, /^[a-z0-9][a-z0-9-]{0,79}$/);
        return handbookQuestionIdentity(q);
      });
      assert.equal(new Set(ids).size, ids.length, lesson.id + '/' + section.id);
    }
  }
});
