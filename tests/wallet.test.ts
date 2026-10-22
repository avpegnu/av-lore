import test from 'node:test';
import assert from 'node:assert/strict';
import {
  walletSnapshotScenario,
  initialWalletTransfer,
  walletTransferAction,
  walletHolds,
  emptyWallet,
  walletCommand,
  foldWallet,
  type TransferAction,
} from '../src/lib/wallet-models';
test('wallet recovery includes accepted results and dedup state at a coherent cut; conservation alone misses duplicate payments', () => {
  for (let cut = 0; cut <= 3; cut++) {
    const safe = walletSnapshotScenario(cut, false, false);
    assert.equal(safe.result, 'REPLAY_COMPLETED');
    assert.deepEqual(safe.after.balances, { A: 50, B: 30, C: 20 });
    assert.equal(safe.additionalEffects, 0);
    assert.equal(safe.conserved, true);
    assert.equal(walletSnapshotScenario(cut, false, true).result, 'IDEMPOTENCY_CONFLICT');
  }
  const unsafe = walletSnapshotScenario(2, true, false);
  assert.equal(unsafe.result, 'COMPLETED');
  assert.deepEqual(unsafe.after.balances, { A: 20, B: 60, C: 20 });
  assert.equal(unsafe.additionalEffects, 1);
  assert.equal(unsafe.conserved, true);
  assert.equal(walletSnapshotScenario(0, true, false).additionalEffects, 0); // full tail reconstructs identities
});
test('rejected wallet command results remain stable across retry and replay; invalid amount and gaps are rejected', () => {
  const c = { id: 'reject', to: 'B' as const, amount: 120 },
    r = walletCommand(emptyWallet(), c);
  assert.equal(r.result, 'INSUFFICIENT_FUNDS');
  assert.equal(walletCommand(r.state, c).result, 'REPLAY_INSUFFICIENT_FUNDS');
  assert.throws(() => walletCommand(emptyWallet(), { ...c, amount: NaN }));
  assert.throws(() =>
    foldWallet(emptyWallet(), { seq: 2, command: c, result: 'INSUFFICIENT_FUNDS' }),
  );
});
test('cross-owner transfer decisions are mutually exclusive, timeouts do not refund, step retries and old coordinators cannot create effects', () => {
  for (const final of ['commit', 'cancel'] as const) {
    let s = initialWalletTransfer();
    for (const a of ['reserve', 'depart', final] as TransferAction[])
      s = walletTransferAction(s, a, true, 5);
    const pending = walletTransferAction(s, 'timeout', true, 5);
    assert.equal(pending.transit, 60);
    assert.equal(pending.a, 40);
    const conflict = walletTransferAction(s, final === 'commit' ? 'cancel' : 'commit', true, 5);
    assert.equal(conflict.status, 'DECISION_CONFLICT');
    assert.equal(conflict.decision, s.decision);
    const old = walletTransferAction(s, final === 'commit' ? 'credit' : 'refund', true, 4);
    assert.deepEqual(old.effects, s.effects);
    if (final === 'commit') {
      const down = walletTransferAction(s, 'credit', false, 5);
      assert.equal(down.transit, 60);
      assert.equal(down.status, 'DESTINATION_PENDING');
    }
    const action = final === 'commit' ? 'credit' : 'refund';
    s = walletTransferAction(s, action, true, 5);
    const retry = walletTransferAction(s, action, true, 5);
    assert.deepEqual(s.effects, retry.effects);
    assert.equal(s.a + s.b + s.transit, 100);
    assert.equal(s.transit, 0);
  }
});
test('atomic reservation prevents overspend; pending and posted balances differ and partial posting releases the unused reservation', () => {
  const safe = walletHolds(false, 'pending'),
    bad = walletHolds(true, 'pending');
  assert.equal(safe.available, 40);
  assert.equal(bad.available, -20);
  assert.equal(bad.total, 100);
  const posted = walletHolds(false, 'post40');
  assert.equal(posted.posted, 60);
  assert.equal(posted.recipient, 40);
  assert.equal(posted.held, 0);
  assert.equal(posted.available, 60);
  assert.equal(posted.released, 20);
  assert.equal(posted.total, 100);
  assert.equal(walletHolds(false, 'void').available, 100);
});
