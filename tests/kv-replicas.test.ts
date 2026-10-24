import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplicaState, replicaAction } from '../src/lib/kv-replicas';
const start = (w = 2, sloppy = false) =>
  replicaAction(createReplicaState(), { type: 'write', w, sloppy });
const deliver = (s: ReturnType<typeof start>, id: string) =>
  replicaAction(s, { type: 'deliver', id });
const toggle = (s: ReturnType<typeof start>, id: string) =>
  replicaAction(s, { type: 'online', id });
test('partial writes remain readable after timeout; late ACKs never rewrite an unknown client outcome', () => {
  const initial = start();
  let s = deliver(initial, 'op-1:A');
  assert.equal(initial.nodes[0].record, null);
  assert.equal(s.writes[0].acknowledgements.length, 1);
  assert.throws(() => replicaAction(s, { type: 'finish', lost: false }));
  s = replicaAction(s, { type: 'finish', lost: true });
  let read = replicaAction(s, { type: 'read', r: 2, homes: ['B', 'C'], repair: false });
  assert.equal(read.read?.record, null);
  read = replicaAction(s, { type: 'read', r: 2, homes: ['A', 'B'], repair: false });
  assert.equal(read.read?.record?.revision, 1);
  s = deliver(s, 'op-1:B');
  assert.equal(s.writes[0].acknowledgements.length, 2);
  assert.equal(s.writes[0].outcome, 'unknown');
});
test('lost responses after sufficient durable ACKs remain unknown; delayed older deliveries cannot replace a newer value or tombstone', () => {
  let s = deliver(deliver(start(), 'op-1:A'), 'op-1:B');
  s = replicaAction(s, { type: 'finish', lost: true });
  assert.equal(s.writes[0].outcome, 'unknown');
  s = replicaAction(s, { type: 'write', w: 1, sloppy: false, deleted: true });
  s = deliver(s, 'op-2:C');
  s = replicaAction(s, { type: 'finish', lost: false });
  s = deliver(s, 'op-1:C');
  assert.equal(s.nodes[2].record?.revision, 2);
  assert.equal(s.nodes[2].record?.deleted, true);
  assert.equal(s.writes[1].outcome, 'success');
});
test('fallback acknowledgements do not prove home read overlap; offline hint holders cannot hand off and expiry cannot be repaired without surviving data', () => {
  let s = createReplicaState();
  for (const id of ['A', 'B', 'C']) s = toggle(s, id);
  s = replicaAction(s, { type: 'write', w: 2, sloppy: true });
  s = deliver(deliver(deliver(s, 'op-1:A'), 'op-1:B'), 'op-1:C');
  s = replicaAction(s, { type: 'finish', lost: false });
  for (const id of ['A', 'B', 'C']) s = toggle(s, id);
  const read = replicaAction(s, { type: 'read', r: 2, homes: ['B', 'C'], repair: true });
  assert.equal(read.read?.record, null);
  s = toggle(s, 'D');
  s = replicaAction(s, { type: 'handoff' });
  assert.equal(s.nodes[0].record, null);
  assert.equal(s.nodes[1].record?.revision, 1);
  assert.equal(s.nodes[3].hints.length, 1);
  s = toggle(s, 'D');
  assert.equal(s.nodes[0].record, null);
  s = replicaAction(s, { type: 'handoff' });
  assert.equal(s.nodes[0].record?.revision, 1);
  assert.equal(s.nodes[3].hints.length, 0);
  let lost = createReplicaState();
  for (const id of ['A', 'B', 'C']) lost = toggle(lost, id);
  lost = replicaAction(lost, { type: 'write', w: 1, sloppy: true });
  lost = deliver(lost, 'op-1:A');
  lost = replicaAction(lost, { type: 'finish', lost: false });
  lost = replicaAction(lost, { type: 'expire-hints' });
  for (const id of ['A', 'B', 'C']) lost = toggle(lost, id);
  lost = replicaAction(lost, { type: 'repair' });
  assert.ok(lost.nodes.every((n) => n.record === null));
});
test('read repair touches only participating live homes while range repair reaches other live homes; mutation and quorum bounds are explicit', () => {
  let s = deliver(start(1), 'op-1:A');
  s = replicaAction(s, { type: 'finish', lost: false });
  s = replicaAction(s, { type: 'read', r: 2, homes: ['A', 'B'], repair: true });
  assert.deepEqual(s.read?.repaired, ['B']);
  assert.equal(s.nodes[2].record, null);
  s = toggle(s, 'C');
  s = replicaAction(s, { type: 'repair' });
  assert.equal(s.nodes[2].record, null);
  s = toggle(s, 'C');
  s = replicaAction(s, { type: 'repair' });
  assert.equal(s.nodes[2].record?.revision, 1);
  s = toggle(s, 'C');
  assert.equal(
    replicaAction(s, { type: 'read', r: 2, homes: ['B', 'C'], repair: false }).read?.status,
    'unavailable',
  );
  assert.throws(() => replicaAction(s, { type: 'write', w: 4, sloppy: false }), RangeError);
  let capped = createReplicaState();
  for (let i = 0; i < 12; i++) {
    capped = replicaAction(capped, { type: 'write', w: 1, sloppy: false });
    capped = replicaAction(capped, { type: 'finish', lost: true });
  }
  assert.throws(() => replicaAction(capped, { type: 'write', w: 1, sloppy: false }), RangeError);
});
