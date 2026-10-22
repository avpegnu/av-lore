import test from 'node:test';
import assert from 'node:assert/strict';
import { crawlSchedule, crawlJobs, bloomSizing } from '../src/lib/crawler-models';
test('frontier enforces host spacing and one in-flight fetch per host without losing work', () => {
  for (let concurrency = 1; concurrency <= 4; concurrency++)
    for (let delay = 0; delay <= 5; delay++) {
      const result = crawlSchedule(concurrency, delay, true);
      assert.equal(result.rows.length, crawlJobs.length);
      assert.equal(new Set(result.rows.map((r) => r.job.id)).size, crawlJobs.length);
      assert.equal(result.violations, 0);
      assert.equal(result.work, 13);
      for (let time = 0; time <= result.makespan; time += 0.5)
        assert.ok(result.rows.filter((r) => r.start <= time && r.end > time).length <= concurrency);
    }
  assert.equal(crawlSchedule(3, 2, true).makespan, 7);
  assert.equal(crawlSchedule(4, 2, true).makespan, 7);
  assert.ok(crawlSchedule(3, 2, false).violations > 0);
  assert.throws(() => crawlSchedule(0, 2, true));
});
test('Bloom sizing distinguishes design memory, rounded hash count and overcapacity false-positive growth', () => {
  const normal = bloomSizing(10, 1),
    over = bloomSizing(10, 2),
    moreBits = bloomSizing(20, 1);
  assert.equal(normal.memoryGB, 12.5);
  assert.equal(normal.hashes, 7);
  assert.ok(normal.falsePositive > 0.008 && normal.falsePositive < 0.009);
  assert.ok(over.falsePositive > normal.falsePositive);
  assert.ok(moreBits.falsePositive < normal.falsePositive);
  assert.equal(bloomSizing(10, 0).falsePositive, 0);
  assert.equal(normal.expectedSkippedNovel, normal.falsePositive * 1e6);
  assert.throws(() => bloomSizing(0, 1));
});
