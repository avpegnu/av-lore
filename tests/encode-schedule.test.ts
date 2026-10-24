import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeSchedule } from '../src/lib/encode-schedule';

test('encode tasks honor dependencies and worker capacity; publication join waits for every required branch', () => {
  for (const segments of [1, 4, 8, 16])
    for (const workers of [1, 4, 8, 32]) {
      const run = encodeSchedule(10, segments, workers, 2);
      assert.equal(run.tasks.length, 3 * segments + 3);
      assert.equal(new Set(run.tasks.map((t) => t.id)).size, run.tasks.length);
      for (const task of run.tasks) {
        assert.ok(task.end > task.start);
        for (const id of task.dependencies)
          assert.ok(run.tasks.find((t) => t.id === id)!.end <= task.start);
        assert.ok(task.worker >= 0 && task.worker < workers);
      }
      for (let worker = 0; worker < workers; worker++) {
        const rows = run.tasks.filter((t) => t.worker === worker).sort((a, b) => a.start - b.start);
        assert.ok(rows.every((r, i) => !i || rows[i - 1].end <= r.start));
      }
      assert.equal(run.tasks.find((t) => t.id === 'package')!.end, run.makespan);
      assert.ok(run.lowerBound <= run.makespan + 1e-8);
    }
});
test('parallelism changes elapsed time, while splitting adds explicitly modeled work instead of promising constant total compute', () => {
  const serial = encodeSchedule(10, 1, 1, 0),
    parallel = encodeSchedule(10, 8, 8, 0),
    extra = encodeSchedule(10, 8, 8, 2);
  assert.equal(serial.makespan, serial.workerSeconds);
  assert.equal(parallel.workerSeconds, serial.workerSeconds);
  assert.ok(parallel.makespan < serial.makespan);
  assert.equal(extra.workerSeconds - parallel.workerSeconds, 3 * 8 * 2);
  assert.equal(encodeSchedule(10, 16, 8, 2).workerSeconds - extra.workerSeconds, 3 * 8 * 2);
  for (const args of [
    [0, 1, 1, 0],
    [1, 0, 1, 0],
    [1, 1, 0, 0],
    [1, 17, 1, 0],
    [1, 1, 33, 0],
    [1, 1, 1, -1],
    [1, 1, 1, NaN],
  ])
    assert.throws(() => encodeSchedule(...(args as [number, number, number, number])), RangeError);
});
