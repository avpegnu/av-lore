/** Deterministic photo-platform fixtures, not a production ID allocator or storage service. */
export function photoIds(
  count: number,
  guarded: boolean,
  duplicateOwner: boolean,
  rollback: boolean,
  shard: number,
) {
  const base = 2 ** 35 + 1,
    ids: bigint[] = [],
    rows: { id: string; time: number; sequence: number; owner: string }[] = [];
  let lastTime = -1,
    sequence = -1,
    deferred = 0;
  for (let i = 0; i < count; i++) {
    const wall = base - (rollback && i >= Math.floor(count / 2) ? 1 : 0);
    let time = wall;
    if (guarded) {
      time = Math.max(wall, lastTime);
      sequence = time === lastTime ? sequence + 1 : 0;
      if (sequence === 1024) {
        time++;
        sequence = 0;
      }
      if (time > wall) deferred++;
      lastTime = time;
    } else sequence = i % 1024;
    // Guarded logical time is a reservation in this fixture: real issuance must wait for the wall clock.
    const id = (BigInt(time) << 23n) | (BigInt(shard) << 10n) | BigInt(sequence);
    ids.push(id);
    rows.push({ id: id.toString(), time, sequence, owner: 'A' });
    if (duplicateOwner) {
      ids.push(id);
      rows.push({ id: id.toString(), time, sequence, owner: 'B' });
    }
  }
  const latest = ids.at(-1)!,
    bits = latest.toString(2).padStart(64, '0');
  return {
    rows,
    duplicates: ids.length - new Set(ids).size,
    issued: ids.length,
    deferred,
    time: Number(latest >> 23n),
    shard: Number((latest >> 10n) & 8191n),
    sequence: Number(latest & 1023n),
    bits: [bits.slice(0, 41), bits.slice(41, 54), bits.slice(54)],
    latest: latest.toString(),
    numberLoss: BigInt(Number(latest)) !== latest,
    signedPositive: latest <= (1n << 63n) - 1n,
    backwards: ids.some((id, i) => i > 0 && id < ids[i - 1]),
  };
}
export function photoPublication(
  stage: number,
  early: boolean,
  outbox: boolean,
  generationGuard: boolean,
) {
  let state = 'ABSENT',
    visible = false,
    generation = 0,
    ready = false,
    intent = false;
  const history: string[] = [];
  if (stage >= 1) history.push('BLOB_UPLOADED');
  if (stage >= 2) history.push('VALIDATED');
  if (stage >= 3) {
    state = 'PROCESSING';
    generation = 1;
    intent = outbox;
    visible = early;
    history.push(outbox ? 'COMMIT_WITH_INTENT' : 'COMMIT_INTENT_GAP');
  }
  if (stage >= 4 && intent) {
    state = 'READY';
    ready = true;
    visible = true;
    history.push('RENDITION_READY_V1');
  }
  if (stage >= 5) {
    state = 'DELETED';
    generation = 2;
    visible = false;
    ready = false;
    history.push('DELETE_V2');
  }
  if (stage >= 6 && intent) {
    if (generationGuard) history.push('STALE_WORKER_REJECTED');
    else {
      state = 'READY';
      generation = 1;
      visible = true;
      ready = true;
      history.push('STALE_WORKER_APPLIED');
    }
  }
  return {
    state,
    visible,
    generation,
    intent,
    history,
    brokenReference: visible && !ready,
    resurrected: stage >= 6 && visible,
    orphanBlob: stage >= 1 && stage < 3,
    stuckProcessing: stage >= 4 && state === 'PROCESSING',
  };
}
export function storyEligibility(
  hour: number,
  cleanupDelay: number,
  guardExpiry: boolean,
  watermark: boolean,
  archive: boolean,
) {
  const stories = [100, 101, 102, 103].map((id) => ({
    id,
    expires: 24,
    deleted: id === 103,
    viewed: id === 100 || id === 102,
  }));
  const cached = stories.filter((s) => hour < 24 + cleanupDelay && !s.deleted);
  const returned = cached.filter((s) => !guardExpiry || hour < s.expires);
  return {
    cached: cached.length,
    returned: returned.map((s) => ({ ...s, seen: watermark ? s.id <= 102 : s.viewed })),
    expiredReturned: returned.filter((s) => hour >= s.expires).length,
    falselySeen: returned.filter((s) => watermark && s.id <= 102 && !s.viewed).length,
    archiveRetained: archive ? stories.filter((s) => !s.deleted).length : 0,
    eligible: stories.filter((s) => hour < s.expires && !s.deleted).length,
  };
}
