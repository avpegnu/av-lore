import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GIB,
  kvRankBudget,
  kvPagePool,
  kvPrefixReuse,
  kvFork,
  kvTransfer,
} from '../src/lib/kv-cache-models';
test('KV budgets use KV heads and per-rank replication instead of pooled device memory', () => {
  const gqa = kvRankBudget(2, 8, 16, 16, 8192, 4, 8);
  assert.equal(gqa.kvBytesPerToken, 327680);
  assert.equal(gqa.kvPerRank, 5 * GIB);
  assert.equal(gqa.maxSequences, 5);
  assert.equal(gqa.fits, true);
  assert.equal(kvRankBudget(2, 64, 16, 16, 8192, 4, 8).fits, false);
  const eight = kvRankBudget(8, 8, 16, 16, 8192, 4, 8),
    sixteen = kvRankBudget(16, 8, 16, 16, 8192, 4, 8);
  assert.equal(eight.kvBytesPerTokenRank, sixteen.kvBytesPerTokenRank);
  assert.equal(sixteen.replicationFactor, 2);
  assert.equal(sixteen.physicalKvTotal, 2 * sixteen.logicalKvTotal);
  const low = kvRankBudget(2, 8, 4, 8, 8192, 4, 8);
  assert.equal(low.weightMetadata, 1093750000);
  assert.equal(low.kvPerRank, gqa.kvPerRank / 2);
  assert.ok(low.weightPerRank > (70e9 * 0.5) / 2);
});
test('paging conserves physical capacity, exposes future growth and only shares complete prefix blocks', () => {
  const current = kvPagePool(8, 8, false, true),
    reserved = kvPagePool(8, 8, true, true);
  assert.equal(current.admitted.length, 4);
  assert.equal(current.sharedTokensSaved, 24);
  assert.equal(current.futureRequired, 104);
  assert.equal(current.growthFits, false);
  assert.equal(reserved.admitted.length, 3);
  assert.equal(reserved.growthFits, true);
  assert.equal(kvPagePool(16, 8, false, true).sharedTokensSaved, 0);
  for (const block of [4, 8, 16])
    for (const growth of [0, 8, 16])
      for (const reserve of [false, true])
        for (const share of [false, true]) {
          const r = kvPagePool(block, growth, reserve, share);
          assert.equal(
            r.physicalLive + r.reservedGrowth + r.roundingSlack + r.freeTokens,
            r.capacity,
          );
          assert.ok(r.freeTokens >= 0);
          for (const p of r.pages) assert.ok(p.live <= p.planned && p.planned <= block);
          if (reserve) assert.equal(r.growthFits, true);
        }
});
test('prefix identity includes preceding tokens, resident placement and trusted execution/security context', () => {
  assert.equal(kvPrefixReuse(0, false, false, true, true).reusedTokens, 12);
  assert.equal(kvPrefixReuse(5, false, false, true, true).reusedTokens, 4);
  assert.equal(kvPrefixReuse(1, false, false, true, true).reusedTokens, 0);
  assert.equal(kvPrefixReuse(0, true, false, true, true).reusedTokens, 0);
  assert.equal(kvPrefixReuse(0, false, true, true, true).reusedTokens, 0);
  assert.equal(kvPrefixReuse(0, false, false, false, true).reusedTokens, 0);
  assert.equal(kvPrefixReuse(0, true, false, true, false).unsafeReuse, true);
});
test('a sampling fork copies shared mutable tails rather than overwriting another branch', () => {
  const safe = kvFork(true),
    unsafe = kvFork(false);
  assert.deepEqual(safe.a, [5, 6, 91]);
  assert.deepEqual(safe.b, [5, 6, 92]);
  assert.equal(safe.physicalPages, 3);
  assert.equal(unsafe.branchALost, true);
  assert.deepEqual(unsafe.a, unsafe.b);
});
test('offload uses decimal link GB/s against binary payload GiB, and charges both transfer directions', () => {
  const r = kvTransfer(32768, 16, 80000, 0, 500, false);
  assert.equal(r.bytes, 4 * GIB);
  assert.ok(Math.abs(r.transferMs - 540.870912) < 1e-9);
  assert.equal(r.recomputeMs, 409.6);
  assert.equal(r.transferWithin, false);
  assert.equal(r.recomputeWithin, true);
  const load = kvTransfer(32768, 16, 80000, 0, 500, true);
  assert.equal(load.transferMs, r.transferMs / 2);
  assert.equal(kvTransfer(32768, 16, 80000, 500, 500, false).recomputeWithin, false);
});
