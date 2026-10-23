import test from 'node:test';
import assert from 'node:assert/strict';
import {
  routingPolicies,
  adapterAdmission,
  servingEconomics,
} from '../src/lib/serving-stack-models';
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
test('cascade uses joint outcomes, including false escalations that turn correct into wrong', () => {
  const x = routingPolicies(0.7, 0.8, 0.8, 0.1),
    c = x.policies[3];
  close(
    x.joint.reduce((a, b) => a + b),
    1,
  );
  close(x.policies[0].quality, 0.765);
  close(x.policies[1].quality, 0.891);
  close(c.quality, 0.9113);
  close(c.cost, 3.316);
  close(c.meanSec, 1.129);
  assert.equal(c.p95Sec, 2.6);
  const bad = routingPolicies(0.7, 0.8, 0, 1);
  close(bad.policies[3].quality, 0.7);
  assert.ok(bad.policies[3].quality < bad.policies[0].quality);
  const perfect = routingPolicies(0.7, 0.8, 1, 0);
  close(perfect.policies[3].quality, 1 - perfect.joint[3]);
  assert.equal(routingPolicies(1, 1, 0, 0).policies[3].p95Sec, 0.6);
});
test('model routing pays only chosen path, whereas cascade pays initial, verifier and escalation', () => {
  const x = routingPolicies(1, 1, 1, 1);
  close(x.policies[2].cost, 1.05);
  close(x.policies[2].quality, 0.9);
  close(x.policies[3].cost, 9.2);
  for (const e of [0, 0.5, 1])
    for (const r of [0, 0.5, 1])
      for (const f of [0, 0.5, 1])
        for (const p of routingPolicies(e, 0.8, r, f).policies)
          assert.ok(p.quality >= 0 && p.quality <= 1 && p.largeShare >= 0 && p.largeShare <= 1);
});
test('adapter admission enforces tenant/base before residency and plans without evicting pinned work', () => {
  const a = adapterAdmission('C', 6, 'alpha', true, false);
  assert.equal(a.status, 'LOAD');
  assert.deepEqual(a.resident, ['A', 'C']);
  assert.deepEqual(a.evicted, ['B']);
  assert.equal(a.usedGiB, 5);
  assert.equal(a.loadGiB, 3);
  const waiting = adapterAdmission('C', 6, 'alpha', true, true);
  assert.equal(waiting.status, 'WAIT');
  assert.deepEqual(waiting.resident, ['A', 'B']);
  assert.deepEqual(waiting.evicted, []);
  assert.equal(adapterAdmission('B', 6, 'alpha', true, false).status, 'DENIED');
  assert.equal(adapterAdmission('B', 6, 'beta', true, false).status, 'HIT');
  assert.equal(adapterAdmission('D', 6, 'alpha', false, false).status, 'INCOMPATIBLE');
  assert.deepEqual(adapterAdmission('C', 4, 'alpha', false, false).resident, ['C']);
  assert.equal(adapterAdmission('C', 4, 'alpha', true, false).status, 'WAIT');
});
test('cost units use3600 and window rates do not apply busy duty twice', () => {
  const x = servingEconomics(8, 3, 10000, 0.4, false, 0, 0.8);
  close(x.hourly, 24);
  close(x.observedTps, 4000);
  close(x.millionCost!, 5 / 3);
  close(x.sloMillionCost!, 25 / 12);
  const window = servingEconomics(8, 3, 4000, 0.4, true, 0, 0.8);
  close(window.millionCost!, x.millionCost!);
  assert.equal(servingEconomics(8, 3, 10000, 0, false, 0, 1).millionCost, null);
  assert.equal(servingEconomics(8, 3, 10000, 1, false, 0, 0).sloMillionCost, null);
  close(servingEconomics(8, 3, 10000, 1, false, 0, 1).millionCost!, 2 / 3);
});
