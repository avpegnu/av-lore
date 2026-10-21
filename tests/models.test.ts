import test from 'node:test';
import assert from 'node:assert/strict';
import {
  base62,
  percentile,
  leftJoin,
  schedule,
  capacity,
  cacheRead,
  queueDelivery,
  stockRace,
  estimate,
} from '../src/lib/models';
import { validateStudy } from '../src/lib/study';
import { learning } from '../src/lib/learning';
import { scenarios } from '../src/lib/scenarios';
import { cases } from '../src/lib/cases';
import fs from 'node:fs';

test('base62 preserves uniqueness and boundaries in the demonstrated ID range', () => {
  assert.equal(base62(0), '0');
  assert.equal(base62(61), 'Z');
  assert.equal(base62(62), '10');
  const codes = new Set(Array.from({ length: 10000 }, (_, i) => base62(i)));
  assert.equal(codes.size, 10000);
  assert.throws(() => base62(-1));
  assert.throws(() => base62(1.5));
  assert.throws(() => base62(Number.MAX_SAFE_INTEGER + 1));
});
test('nearest-rank p99 exposes sample boundary rather than falsely reporting the maximum', () => {
  assert.equal(percentile([...Array(99).fill(50), 1000], 0.99), 50);
  assert.equal(percentile([...Array(98).fill(50), 1000, 1000], 0.99), 1000);
  assert.equal(percentile([9, 1, 4], 1), 9);
  assert.throws(() => percentile([], 0.5));
});
test('LEFT JOIN preserves the unmatched user and illustrates row multiplication', () => {
  const left = leftJoin(true);
  assert.equal(left.length, 4);
  assert.deepEqual(left.at(-1), { user: 'Chi', order: null, total: null });
  assert.equal(left.filter((r) => r.total !== null && r.total > 0).length, 2);
  assert.equal(leftJoin(false).length, 3);
});
test('Round Robin conserves CPU work and changes short-job completion', () => {
  for (const q of [1, 2, 3, 5]) {
    const jobs = schedule(q);
    assert.equal(jobs.at(-1)?.end, 9);
    for (const [i, id] of ['A', 'B', 'C'].entries())
      assert.equal(
        jobs.filter((j) => j.job === id).reduce((n, j) => n + j.end - j.start, 0),
        [5, 3, 1][i],
      );
  }
  assert.equal(schedule(1).find((j) => j.job === 'C')?.end, 3);
  assert.equal(schedule(5).find((j) => j.job === 'C')?.end, 9);
});
test('cache expires at the TTL boundary; source writes alone leave cached data stale', () => {
  const first = cacheRead({}, 'x', 0, 'v1', 5);
  assert.equal(first.hit, false);
  const stale = cacheRead(first.entries, 'x', 4, 'v2', 5);
  assert.equal(stale.value, 'v1');
  assert.equal(stale.hit, true);
  const expired = cacheRead(first.entries, 'x', 5, 'v2', 5);
  assert.equal(expired.value, 'v2');
  assert.equal(expired.hit, false);
  assert.equal(expired.entries.x.expires, 10);
});
test('commit-before-ACK crash causes duplicate effect unless transactionally deduped', () => {
  assert.equal(queueDelivery(false, true).effects, 2);
  assert.equal(queueDelivery(true, true).effects, 1);
  assert.equal(queueDelivery(false, false).effects, 1);
});
test('stock invariant fails under modeled interleaving and holds with conditional atomic update', () => {
  assert.equal(stockRace(false).sold, 2);
  assert.equal(stockRace(true).sold, 1);
  assert.equal(stockRace(false).stock, 0);
});
test('capacity and storage formulas use seconds/day and decimal GB', () => {
  assert.deepEqual(capacity(600, 250, 3), { capacity: 750, load: 80, needed: 3, spare: 150 });
  assert.deepEqual(estimate(86400, 1, 10, 1000, 30), { average: 1, peak: 10, storageGB: 2.592 });
});
test('legacy study export can be imported, rejects malformed lists, and deduplicates IDs', () => {
  const s = validateStudy({
    version: 1,
    bookmarks: ['n/sql/null', 'n/sql/null'],
    known: [],
    review: ['q/sql/null'],
    last: 'sql',
    session: null,
  });
  assert.equal(s.bookmarks.length, 1);
  assert.equal(s.last, 'sql');
  assert.throws(() => validateStudy({ bookmarks: [42], known: [], review: [] }));
  assert.throws(() => validateStudy(null));
});
test('every handbook topic has curated takeaways and a supported interactive lab', () => {
  const topics = fs
    .readdirSync(new URL('../src/content/topics', import.meta.url))
    .filter((f) => f.endsWith('.json'))
    .map((f) =>
      JSON.parse(fs.readFileSync(new URL('../src/content/topics/' + f, import.meta.url), 'utf8')),
    );
  const models = [
    'complexity',
    'box',
    'eventloop',
    'react',
    'sql',
    'race',
    'cache',
    'queue',
    'schedule',
    'capacity',
    'latency',
    'base62',
    'star',
  ];
  assert.equal(topics.length, 31);
  for (const t of topics) {
    const l = learning[t.id];
    assert.ok(l, `Missing ${t.id}`);
    assert.equal(l.takeaways.length, 3);
    assert.equal(l.path.length, 4);
    assert.ok(models.includes(l.lab) || scenarios[l.lab], `Missing lab ${t.id}`);
    if (scenarios[l.lab]) {
      assert.equal(scenarios[l.lab].normal.length, 4);
      assert.equal(scenarios[l.lab].fault.length, 4);
    }
  }
});
test('26 distinct cases have domain-specific data and failure analysis', () => {
  assert.equal(cases.length, 26);
  assert.equal(new Set(cases.map((c) => c.id)).size, 26);
  assert.equal(new Set(cases.map((c) => c.failure)).size, 26);
  for (const c of cases) {
    assert.equal(c.deep.length, 2);
    assert.equal(new Set(c.deep).size, 2, c.id);
    assert.equal(c.flow.length, 5);
    assert.equal(c.drill.length, 2);
    assert.ok(c.source.url.startsWith('https://'));
  }
});
