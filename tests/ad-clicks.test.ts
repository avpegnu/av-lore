import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clickWindows,
  aggregateReplay,
  applyAggregate,
  aggregateMessages,
} from '../src/lib/ad-click-models';
test('event-time replay conserves unique clicks between accepted windows and late side output while retaining duplicate identity', () => {
  for (let step = 0; step <= 9; step++)
    for (const lag of [0, 10, 30, 60])
      for (const late of [0, 30, 60, 120]) {
        const r = clickWindows(step, lag, late);
        assert.equal(r.unique, r.accepted + r.side);
        assert.equal(r.rows.length, r.unique + r.duplicates);
        assert.ok(r.rows.every((row, i) => i === 0 || row.watermark >= r.rows[i - 1].watermark));
        for (const w of r.windows) assert.ok(w.count <= w.sourceCount);
      }
  const r = clickWindows(9, 10, 30);
  assert.equal(r.unique, 8);
  assert.equal(r.duplicates, 1);
  assert.equal(r.side, 1);
  assert.equal(r.lateAccepted, 2);
  assert.deepEqual(
    r.windows.map((w) => w.count),
    [3, 2, 2],
  );
  assert.deepEqual(
    r.windows.map((w) => w.sourceCount),
    [4, 2, 2],
  );
  assert.equal(clickWindows(9, 10, 120).side, 0);
  assert.throws(() => clickWindows(10, 0, 0));
});
test('absolute aggregate fencing rejects stale generations and duplicate revisions; blind upserts regress and additive replay overcounts', () => {
  for (let step = 0; step <= 6; step++) {
    const r = aggregateReplay(step, 'fenced');
    assert.equal(r.value, r.expected);
  }
  assert.equal(aggregateReplay(5, 'upsert').value, 3);
  assert.equal(aggregateReplay(5, 'fenced').value, 4);
  assert.equal(aggregateReplay(6, 'add').value, 18);
  assert.equal(aggregateReplay(6, 'fenced').duplicates, 1);
  const initial = aggregateMessages[3];
  assert.equal(applyAggregate(initial, aggregateMessages[4]).value, initial);
  assert.throws(() => applyAggregate(initial, { ...initial, count: 5 }), /Conflicting/);
  assert.throws(() => applyAggregate(undefined, { generation: 0, revision: 1, count: 1 }));
});
