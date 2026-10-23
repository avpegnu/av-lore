import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reviewIntervals,
  emptyRecall,
  nextRecall,
  gradeRecall,
  undoRecall,
  recallPool,
  recallQueue,
  recallForecast,
  validateRecall,
  recallDay,
} from '../src/lib/daily-review-models';
const now = Date.UTC(2026, 9, 23, 10),
  card = { id: 'topic:sql:q1', revision: 'r1', source: 'topic' };
test('schedule is an explicit elapsed-time ladder, never requeues a ten-minute miss immediately', () => {
  const again = nextRecall(undefined, 'r1', 'again', now),
    good = nextRecall(undefined, 'r1', 'good', now),
    easy = nextRecall(undefined, 'r1', 'easy', now);
  assert.equal(again.due - now, 600000);
  assert.equal(good.due - now, 86400000);
  assert.equal(easy.due - now, 3 * 86400000);
  let s = gradeRecall(emptyRecall(), card.id, 'r1', 'again', now);
  assert.equal(recallQueue(s, [card], now + 599999, 5, 20).length, 0);
  assert.deepEqual(recallQueue(s, [card], now + 600000, 5, 20), [card.id]);
  for (let i = 0; i < 20; i++) s = gradeRecall(s, card.id, 'r1', 'easy', now + i * 86400000);
  assert.equal(s.cards[card.id].level, reviewIntervals.length - 1);
});
test('daily new allowance is global while due counts and forecasts respect only the filtered deck', () => {
  const b = { id: 'handbook:cache:q1', revision: 'r1', source: 'handbook' };
  let s = gradeRecall(emptyRecall(), card.id, 'r1', 'again', now);
  assert.equal(recallPool(s, [b], now + 600000, 1).newAvailable, 0);
  assert.equal(recallPool(s, [b], now + 600000, 5).due.length, 0);
  assert.equal(recallForecast(s, [b], now)[0], 0);
  assert.equal(recallForecast(s, [card], now)[0], 1);
  assert.deepEqual(recallQueue(s, [b, card], now + 600000, 5, 1), [card.id]);
});
test('content revisions reopen cards; undo restores exact cards and daily counters without reconstructing truncated history', () => {
  let s = gradeRecall(emptyRecall(), card.id, 'r1', 'good', now);
  const before = s;
  s = gradeRecall(s, card.id, 'r2', 'easy', now + 1000);
  assert.equal(s.days[recallDay(now)].newCards, 2);
  assert.deepEqual(undoRecall(s), before);
  for (let i = 0; i < 80; i++) s = gradeRecall(s, card.id, 'r1', 'good', now + i * 1000);
  assert.equal(s.undo.length, 50);
  const reviews = s.days[recallDay(now)].reviews;
  s = undoRecall(s);
  assert.equal(s.days[recallDay(now)].reviews, reviews - 1);
  assert.deepEqual(validateRecall(JSON.parse(JSON.stringify(s))), s);
});
test('pool interleaves fresh sources, session limits apply, and malformed imports are rejected', () => {
  const deck = [
    card,
    { ...card, id: 'topic:sql:q2' },
    { ...card, id: 'handbook:cache:q1', source: 'handbook' },
    { ...card, id: 'flow:cache:overview', source: 'visual' },
  ];
  const q = recallQueue(emptyRecall(), deck, now, 4, 3);
  assert.equal(new Set(q.map((id) => deck.find((c) => c.id === id)!.source)).size, 3);
  assert.throws(() => validateRecall({ ...emptyRecall(), cards: { constructor: {} } }));
  assert.throws(() => validateRecall({ ...emptyRecall(), undo: [{}] }));
  assert.throws(() => nextRecall(undefined, 'r1', 'bad' as never, now));
  assert.throws(() => recallPool(emptyRecall(), deck, now, 51));
});

test('session cap cannot exceed retained undo history', () => {
  assert.throws(() => recallQueue(emptyRecall(), [card], now, 5, 51));
});
