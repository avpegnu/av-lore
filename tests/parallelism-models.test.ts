import test from 'node:test';
import assert from 'node:assert/strict';
import { parallelLayout, pipelineSchedule, expertDispatch } from '../src/lib/parallelism-models';
test('replicas packed into one node are not independent failure domains', () => {
  const packed = parallelLayout(4, 1, 2, 1, 100, 5, false),
    spread = parallelLayout(4, 1, 2, 1, 100, 5, true);
  assert.equal(packed.gpuCount, 8);
  assert.equal(packed.nodeIds.length, 1);
  assert.equal(packed.worstSurvivors, 0);
  assert.equal(spread.nodeIds.length, 2);
  assert.equal(spread.worstSurvivors, 1);
  assert.equal(parallelLayout(8, 1, 2, 1, 100, 5, false).worstSurvivors, 1);
  assert.ok(!parallelLayout(1, 1, 1, 1, 100, 5, false).memoryFits);
  assert.equal(parallelLayout(1, 1, 1, 1, 100, 5, false).stageCommMs, 0);
  assert.equal(packed.payloadBytes, 16384);
  assert.equal(packed.bytesPerCollective, 24576);
  assert.ok(Math.abs(packed.stageCommMs - 4.8393216) < 1e-8);
  assert.equal(parallelLayout(4, 2, 2, 1, 100, 5, false).boundaryBytes, 16384);
});
test('collective analytical cost responds separately to payload, latency and pipeline depth', () => {
  const small = parallelLayout(4, 1, 1, 1, 100, 5, false),
    large = parallelLayout(4, 1, 1, 1024, 100, 5, false);
  assert.ok(large.stageCommMs > small.stageCommMs);
  assert.equal(parallelLayout(4, 2, 1, 1, 100, 5, false).stageCommMs, small.stageCommMs / 2);
  assert.ok(parallelLayout(4, 1, 1, 1, 100, 10, false).stageCommMs > small.stageCommMs);
  assert.throws(() => parallelLayout(3, 1, 1, 1, 100, 5, false));
});
test('forward pipeline recurrence preserves both stage exclusivity and dependencies', () => {
  const single = pipelineSchedule(4, 1, 1, 1),
    many = pipelineSchedule(4, 8, 1, 1),
    slow = pipelineSchedule(4, 8, 1, 2);
  assert.equal(single.makespan, 40);
  assert.equal(single.utilization, 0.25);
  assert.equal(many.makespan, 110);
  assert.equal(many.utilization, 8 / 11);
  assert.equal(slow.makespan, 190);
  assert.equal(slow.firstComplete, 50);
  for (const x of slow.tasks) {
    if (x.stage)
      assert.ok(
        x.start >= slow.tasks.find((y) => y.stage === x.stage - 1 && y.batch === x.batch)!.end,
      );
    if (x.batch)
      assert.ok(
        x.start >= slow.tasks.find((y) => y.stage === x.stage && y.batch === x.batch - 1)!.end,
      );
  }
});
test('expert copies reduce skew without changing logical selected experts', () => {
  const balanced = expertDispatch(false, false, 1, false),
    hot = expertDispatch(true, false, 1, false),
    copies = expertDispatch(true, true, 1, false);
  assert.deepEqual(balanced.logicalLoads, [4, 4, 4, 4]);
  assert.equal(balanced.remote, 8);
  assert.equal(balanced.transferBytes, 131072);
  assert.deepEqual(hot.logicalLoads, [8, 3, 3, 2]);
  assert.equal(hot.queued, 4);
  assert.equal(hot.waves, 2);
  assert.equal(hot.remote, 14);
  assert.deepEqual(
    copies.assignments.map((a) => a.expert),
    hot.assignments.map((a) => a.expert),
  );
  assert.equal(copies.physicalGiB, 14);
  assert.equal(copies.queued, 0);
  assert.equal(copies.waves, 1);
  assert.ok(Math.max(...copies.gpuLoads) < Math.max(...hot.gpuLoads));
  assert.equal(copies.assignments.length, 16);
  assert.equal(copies.dropped, 0);
  const dropped = expertDispatch(true, false, 1, true);
  assert.equal(dropped.dropped, 4);
  assert.equal(
    dropped.gpuLoads.reduce((a, b) => a + b),
    12,
  );
  assert.equal(expertDispatch(true, false, 2, false).queued, 0);
});
