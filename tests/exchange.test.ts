import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialBook,
  applyBookEvent,
  replayBook,
  exchangeEvents,
  sharedRiskReplay,
  exchangeRecovery,
} from '../src/lib/exchange-models';
test('continuous toy matching uses maker prices and FIFO, while reducing preserves and replacing renews priority', () => {
  const t1 = replayBook(5);
  assert.deepEqual(
    t1.fills.map((f) => [f.maker, f.qty, f.price]),
    [
      ['MA:A', 5, 100],
      ['MB:B', 2, 100],
    ],
  );
  const reduce = replayBook(6);
  assert.equal(reduce.orders.find((o) => o.id === 'MB:B')?.priority, 2);
  const replaced = replayBook(10);
  assert.equal(replaced.orders.find((o) => o.id === 'MC:C3')?.priority, 10);
  const next = replayBook(11);
  assert.deepEqual(
    next.fills.filter((f) => f.seq === 11).map((f) => [f.maker, f.qty, f.price]),
    [
      ['ME:E', 3, 101],
      ['MC:C3', 1, 101],
    ],
  );
  const market = replayBook(13);
  assert.equal(market.lastResult.filled, 3);
  assert.equal(market.lastResult.expired, 7);
  assert.equal(
    market.orders.some((o) => o.id === 'BT:T4'),
    false,
  );
});
test('a caught-up replica still cannot publish without external fencing; uncommitted assignments are excluded', () => {
  assert.equal(exchangeRecovery(12, true).canPublish, false);
  assert.equal(exchangeRecovery(13, false).status, 'BLOCKED_AUTHORITY');
  const promoted = exchangeRecovery(13, true);
  assert.equal(promoted.canPublish, true);
  assert.equal(promoted.identical, true);
  assert.equal(promoted.state.lastSeq, 13);
  assert.equal(promoted.state.fills.some(f => f.seq === 14), false);
  assert.throws(() => exchangeRecovery(14, true));
});
test('each accepted incoming quantity is filled, rested or expired; business retries do not duplicate executions', () => {
  let s = initialBook();
  for (const e of exchangeEvents) {
    const before = s;
    s = applyBookEvent(s, e);
    assert.equal(before.lastSeq, e.seq - 1);
    assert.ok(s.orders.every((o) => o.qty > 0 && Number.isSafeInteger(o.price)));
    if (s.lastResult.status === 'ACCEPTED' && 'qty' in e)
      assert.equal(s.lastResult.filled + s.lastResult.rested + s.lastResult.expired, e.qty);
    if (e.seq === 12) {
      assert.equal(s.lastResult.status, 'DUPLICATE');
      assert.equal(s.fills.length, before.fills.length);
    }
  }
  assert.equal(
    s.fills.reduce((sum, f) => sum + f.qty, 0),
    25,
  );
  assert.equal(new Set(s.fills.map((f) => f.id)).size, s.fills.length);
  const conflict = applyBookEvent(replayBook(5), {
    ...exchangeEvents[4],
    seq: 6,
    qty: 8,
  } as (typeof exchangeEvents)[number]);
  assert.equal(conflict.lastResult.status, 'ID_CONFLICT');
  assert.equal(conflict.fills.length, replayBook(5).fills.length);
});
test('snapshot replay preserves book, dedup, controls and stable fill IDs; committed gaps are rejected', () => {
  const expected = replayBook(exchangeEvents.length);
  for (let cut = 0; cut <= exchangeEvents.length; cut++)
    assert.deepEqual(replayBook(exchangeEvents.length, replayBook(cut)), expected);
  assert.equal(replayBook(15).mode, 'HALTED');
  assert.equal(replayBook(16).lastResult.status, 'HALTED_REJECT');
  assert.equal(replayBook(17).mode, 'CONTINUOUS');
  assert.throws(() => applyBookEvent(initialBook(), exchangeEvents[1]));
});
test('hard shared limits require atomic reservations and idempotent releases across symbols', () => {
  const safe = sharedRiskReplay(6, true),
    unsafe = sharedRiskReplay(6, false);
  assert.equal(safe.accepted, 1);
  assert.equal(safe.available, 1000);
  assert.equal(safe.invariantError, 0);
  assert.equal(unsafe.accepted, 2);
  assert.equal(sharedRiskReplay(4, false).available, -300);
  assert.equal(unsafe.overReserved, 300);
  assert.equal(unsafe.invariantError, 700);
  for (let step = 0; step <= 6; step++) {
    const s = sharedRiskReplay(step, true);
    assert.ok(s.available >= 0);
    assert.equal(s.invariantError, 0);
  }
});
test('ownership, reductions, admin authority and integer bounds do not silently mutate resting orders', () => {
  const base = replayBook(4);
  const foreign = applyBookEvent(base, {seq:5,owner:'OTHER',id:'X',kind:'cancel',target:'MA:A'});
  assert.equal(foreign.lastResult.status, 'NOT_FOUND');
  assert.deepEqual(foreign.orders, base.orders);
  const increase = applyBookEvent(base, {seq:5,owner:'MA',id:'INC',kind:'reduce',target:'MA:A',qty:6});
  assert.equal(increase.lastResult.status, 'INVALID_REDUCTION');
  assert.deepEqual(increase.orders, base.orders);
  const removed = applyBookEvent(base, {seq:5,owner:'MA',id:'ZERO',kind:'reduce',target:'MA:A',qty:0});
  assert.equal(removed.orders.some(o=>o.id==='MA:A'), false);
  const denied = applyBookEvent(base, {seq:5,owner:'OTHER',id:'H',kind:'halt'});
  assert.equal(denied.lastResult.status, 'DENIED_CONTROL');
  assert.equal(denied.mode, 'CONTINUOUS');
  for (const patch of [{price:1.5},{price:0},{qty:1001},{qty:-1}])
    assert.throws(()=>applyBookEvent(base,{seq:5,owner:'BUY',id:'BAD',kind:'limit',side:'buy',price:100,qty:1,...patch}));
  assert.equal(base.lastSeq, 4);
  assert.equal(base.orders.find(o=>o.id==='MA:A')?.qty, 5);
});
