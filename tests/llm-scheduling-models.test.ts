import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  prefillInterference,
  speculativeMass,
  speculativeCost,
  splitServing,
} from '../src/lib/llm-scheduling-models';
test('chunking trades prompt completion overhead for smaller decode gaps; decode-only can starve prefill', () => {
  const a = prefillInterference(8192, 1024, 2, 'chunked'),
    b = prefillInterference(8192, 1024, 2, 'monolithic');
  assert.equal(a.maxDecodeGap, 12);
  assert.equal(a.firstTokenMs, 96);
  assert.equal(b.maxDecodeGap, 68);
  assert.equal(b.firstTokenMs, 68);
  assert.equal(
    a.iterations.reduce((s, i) => s + i.prefill, 0),
    8192,
  );
  assert.equal(prefillInterference(8192, 1024, 2, 'decode-only').firstTokenMs, null);
  assert.equal(prefillInterference(8192, 256, 2, 'chunked').firstTokenMs, 192);
});
test('modified rejection sampling preserves target mass; resampling directly from target after rejection biases it', () => {
  const p = [0.6, 0.3, 0.1],
    good = speculativeMass(p, [1, 1, 8], true)!,
    bad = speculativeMass(p, [1, 1, 8], false)!;
  assert.ok(good.totalVariation < 1e-12);
  assert.ok(Math.abs(good.acceptance - 0.3) < 1e-12);
  assert.ok(Math.abs(bad.totalVariation - 0.08) < 1e-12);
  assert.deepEqual(
    bad.output.map((n) => +n.toFixed(2)),
    [0.52, 0.31, 0.17],
  );
  for (const q of [
    [6, 3, 1],
    [0, 0, 1],
    [1, 0, 0],
    [0, 1, 0],
  ]) {
    const s = speculativeMass(p, q, true)!;
    assert.ok(s.totalVariation < 1e-12);
    assert.ok(Math.abs(s.output.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  }
  assert.equal(speculativeMass(p, [0, 0, 0], true), null);
});
test('speculation cost handles alpha endpoints, zero-draft fallback, verification cost and memory reduction', () => {
  assert.equal(speculativeCost(1, 4, 1, 1, 4).expectedTokens, 5);
  assert.equal(speculativeCost(0, 4, 1, 1, 4).expectedTokens, 1);
  const a = speculativeCost(0.8, 4, 1, 1, 4);
  assert.ok(Math.abs(a.expectedTokens - 3.3616) < 1e-12);
  assert.ok(Math.abs(a.speedup - 2.241066666666667) < 1e-12);
  assert.equal(a.slots, 4);
  assert.equal(speculativeCost(0.8, 0, 1, 1, 4).slots, 8);
  assert.equal(speculativeCost(0.8, 4, 5, 12, 4).best.gamma, 0);
  assert.equal(speculativeCost(0.8, 0, 5, 12, 4).speedup, 1);
  const noMemory = speculativeCost(0.8, 4, 1, 1, 8);
  assert.equal(noMemory.canAdmit, false);
  assert.equal(noMemory.best.gamma, 0);
});
test('disaggregation counts KV handoff and both queues before first decode; raw TTFT alone is insufficient', () => {
  const slow = splitServing(4, 32, 20, 5, 150),
    fast = splitServing(4, 128, 20, 5, 150);
  assert.equal(slow.monolithicTtft, 110);
  assert.ok(slow.splitTtft > 150);
  assert.equal(slow.splitMeetsBoth, false);
  assert.ok(fast.splitTtft < 110);
  assert.equal(fast.splitMeetsBoth, true);
  assert.equal(fast.monolithicMeetsBoth, false);
  assert.equal(splitServing(4, 128, 20, 50, 150).splitMeetsBoth, false);
});
