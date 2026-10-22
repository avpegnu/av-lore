import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutInventory, cartMerge, checkoutIsolation } from '../src/lib/checkout-models';
test('checkout reservation: atomic admission, terminal expiry and late authorization are independent guards', () => {
  assert.equal(checkoutInventory(1, 'naive', 5, true, true).claims.length, 6);
  assert.equal(checkoutInventory(1, 'naive', 5, true, true).conservationDelta, 5);
  for (let stage = 0; stage <= 6; stage++)
    assert.equal(checkoutInventory(stage, 'hold', 5, true, true).conservationDelta, 0);
  const final = checkoutInventory(6, 'hold', 5, true, true);
  assert.equal(final.sold, 3);
  assert.equal(final.voids, 1);
  assert.equal(final.available, 0);
  assert.equal(checkoutInventory(6, 'hold', 5, true, false).oversold, 1);
  assert.equal(checkoutInventory(6, 'hold', 5, false, true).available, 2);
  assert.equal(checkoutInventory(6, 'decrement', 5, true, true).held, 1);
});
test('cart membership: observed remove preserves concurrent adds but tombstone loss can resurrect', () => {
  assert.equal(cartMerge('union', false, false, false).resurrected, true);
  assert.equal(cartMerge('observed', false, false, false).resurrected, false);
  assert.equal(cartMerge('observed', true, false, false).book, true);
  assert.equal(cartMerge('observed', false, true, false).resurrected, true);
  assert.equal(cartMerge('lww', false, false, true).mugLost, true);
});
test('shuffle-shard probability needs explicit retry policy and independent dependencies', () => {
  const full = checkoutIsolation(2, 2, 2, false);
  assert.equal(full.subsets, 28);
  assert.equal(full.fullyUnavailable, 1);
  assert.equal(full.partialOverlap, 12);
  assert.ok(Math.abs(full.expectedFailedPercent - 100 / 28) < 1e-10);
  assert.equal(checkoutIsolation(2, 2, 1, false).expectedFailedPercent, 25);
  assert.equal(checkoutIsolation(2, 2, 2, true).expectedFailedPercent, 100);
});
