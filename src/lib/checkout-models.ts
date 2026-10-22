/** Small deterministic commerce histories. They do not authorize payments or hold real inventory. */
export function checkoutInventory(
  stage: number,
  strategy: 'naive' | 'decrement' | 'hold',
  ttl: number,
  terminalGuard: boolean,
  lateGuard: boolean,
) {
  type Claim = { id: string; state: 'HELD' | 'COMMITTED' | 'EXPIRED'; generation: number };
  const claims: Claim[] = [],
    history: string[] = [];
  let available = 3,
    sold = 0,
    voids = 0;
  if (stage >= 1) {
    for (let i = 0; i < 6; i++) {
      if (strategy === 'naive' || available > 0) {
        claims.push({ id: 'h' + i, state: 'HELD', generation: 1 });
        if (strategy !== 'naive') available--;
      }
    }
    if (strategy === 'naive') available = 2;
    history.push('RESERVE_BURST');
  }
  if (stage >= 2) {
    const h = claims[0];
    if (h) {
      h.state = 'COMMITTED';
      sold++;
    }
    history.push('h0_COMMIT');
  }
  const expired = claims.filter((c) => c.state === 'HELD');
  if (stage >= 3 && strategy === 'hold') {
    for (const c of expired) {
      c.state = 'EXPIRED';
      available++;
    }
    history.push('EXPIRE_AT_' + ttl);
  }
  if (stage >= 4) {
    let take = Math.min(2, available);
    available -= take;
    sold += take;
    history.push('NEW_ORDERS_COMMIT_' + take);
  }
  if (stage >= 5) {
    const h = claims.find((c) => c.id === 'h1');
    if (h) {
      if (lateGuard && h.state !== 'HELD') voids++;
      else {
        h.state = 'COMMITTED';
        sold++;
      }
    }
    history.push(voids ? 'LATE_AUTH_VOID_PENDING' : 'LATE_AUTH_CONVERTED');
  }
  if (stage >= 6 && strategy === 'hold') {
    if (!terminalGuard) available += expired.length;
    history.push(terminalGuard ? 'EXPIRY_REPLAY_NOOP' : 'EXPIRY_REPLAY_RELEASED_AGAIN');
  }
  const held = claims.filter((c) => c.state === 'HELD').length;
  return {
    available,
    sold,
    held,
    claims,
    voids,
    history,
    oversold: Math.max(0, sold - 3),
    conservationDelta: available + held + sold - 3,
    at: [0, 0, 2, ttl, ttl + 1, 8, 9][stage],
  };
}
export function cartMerge(
  policy: 'union' | 'lww' | 'observed',
  concurrentAdd: boolean,
  pruned: boolean,
  clockSkew: boolean,
) {
  // Initial tags b1=book, p1=pen. A removes b1 and adds mug; B is offline and may add b2.
  const a = ['p1', 'mA'],
    b = ['b1', 'p1', ...(concurrentAdd ? ['b2'] : [])],
    removed = pruned ? [] : ['b1'];
  let tags: string[];
  if (policy === 'lww') tags = clockSkew ? b : a;
  else
    tags = [...new Set([...a, ...b])].filter(
      (tag) => policy !== 'observed' || !removed.includes(tag),
    );
  const names: Record<string, string> = { b1: 'book', b2: 'book', p1: 'pen', mA: 'mug' };
  const items = [...new Set(tags.map((t) => names[t]))].sort();
  return {
    tags,
    items,
    book: items.includes('book'),
    mugLost: !items.includes('mug'),
    resurrected: !concurrentAdd && items.includes('book'),
    removed: policy === 'observed' ? removed : [],
    a,
    b,
  };
}
function combinations(n: number, k: number) {
  const result: number[][] = [];
  function visit(start: number, path: number[]) {
    if (path.length === k) {
      result.push(path);
      return;
    }
    for (let i = start; i < n; i++) visit(i + 1, [...path, i]);
  }
  visit(0, []);
  return result;
}
export function checkoutIsolation(
  size: number,
  poisoned: number,
  attempts: number,
  sharedDependency: boolean,
) {
  const subsets = combinations(8, size),
    effective = Math.min(attempts, size);
  const rows = subsets.map((workers) => {
    const bad = workers.filter((w) => w < poisoned).length;
    let failure = 1;
    for (let i = 0; i < effective; i++) failure *= Math.max(0, bad - i) / (size - i);
    return { workers, bad, failure: sharedDependency ? 1 : failure };
  });
  return {
    rows,
    effective,
    subsets: rows.length,
    fullyUnavailable: rows.filter((r) => r.failure === 1).length,
    expectedFailedPercent: (rows.reduce((s, r) => s + r.failure, 0) / rows.length) * 100,
    partialOverlap: rows.filter((r) => r.bad > 0 && r.bad < size).length,
    attemptsUpperBound: effective,
    poisoned: Array.from({ length: poisoned }, (_, i) => i),
  };
}
