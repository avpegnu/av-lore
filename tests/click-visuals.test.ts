import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clickWindowShapes,
  clickPartitionProgress,
  clickTopN,
} from '../src/lib/click-visual-models';
test('hopping duplicates contributions by membership, not input identity; a bridge merges sessions without losing events', () => {
  for (const bridge of [false, true])
    for (const gap of [10, 20, 30])
      for (const shape of ['tumbling', 'hopping', 'session'] as const) {
        const r = clickWindowShapes(shape, gap, bridge);
        assert.equal(r.contributions, r.events.length * (shape === 'hopping' ? 2 : 1));
        for (const e of r.events)
          for (const w of r.windows.filter((w) => w.ids.includes(e.id)))
            assert.ok(w.start <= e.time && e.time < w.end);
      }
  assert.equal(clickWindowShapes('session', 20, false).windows.length, 3);
  const bridged = clickWindowShapes('session', 20, true);
  assert.equal(bridged.windows.length, 2);
  assert.deepEqual(bridged.windows[0].ids, ['e1', 'e2', 'e3', 'bridge', 'e4', 'e5', 'e6']);
  assert.throws(() => clickWindowShapes('session', 0, false));
});
test('active-input minimum stalls on quiet input; idleness advances but returning data cannot rewind the operator', () => {
  const blocked = clickPartitionProgress(3, 10, 30, false),
    advanced = clickPartitionProgress(3, 10, 30, true);
  assert.equal(blocked.progress, 40);
  assert.equal(blocked.returned, 'accepted');
  assert.equal(blocked.count, 2);
  assert.equal(advanced.progress, 130);
  assert.equal(advanced.p1, 40);
  assert.equal(advanced.returned, 'side-output');
  assert.equal(advanced.count, 1);
  assert.equal(clickPartitionProgress(3, 10, 120, true).returned, 'accepted-late');
  for (let lag = 0; lag <= 30; lag += 10)
    for (let late = 0; late <= 120; late += 30)
      for (const idle of [false, true]) {
        const r = clickPartitionProgress(3, lag, late, idle);
        assert.ok(r.frames.every((f, i) => !i || f.progress >= r.frames[i - 1].progress));
        assert.equal(r.frames[1].progress, 40 - lag);
        assert.equal(r.frames[2].idle, idle);
      }
  assert.throws(() => clickPartitionProgress(4, 10, 30, true));
});
test('local candidate pruning before per-ad sum can omit the global winner; missing shards stay partial', () => {
  const unsafe = clickTopN(1, 1, false);
  assert.deepEqual(unsafe.pruned, [{ ad: 'X', count: 100 }]);
  assert.deepEqual(unsafe.truth, [{ ad: 'A', count: 120 }]);
  assert.deepEqual(unsafe.summed, unsafe.truth);
  assert.equal(unsafe.prunedMatchesFull, false);
  for (const n of [1, 2])
    assert.deepEqual(clickTopN(2, n, false).pruned, clickTopN(2, n, false).truth);
  const partial = clickTopN(2, 1, true);
  assert.equal(partial.partial, true);
  assert.deepEqual(partial.summed, [{ ad: 'X', count: 100 }]);
  assert.notDeepEqual(partial.summed, partial.truth);
  assert.throws(() => clickTopN(3, 1, false));
});
