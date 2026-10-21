export function base62(n: number) {
  if (!Number.isSafeInteger(n) || n < 0) throw Error('ID phải là số nguyên an toàn không âm.');
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  do {
    result = alphabet[n % 62] + result;
    n = Math.floor(n / 62);
  } while (n > 0);
  return result;
}
export function percentile(values: number[], p: number) {
  if (!values.length || p <= 0 || p > 1) throw Error('Dữ liệu hoặc percentile không hợp lệ.');
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(p * sorted.length) - 1];
}
export function leftJoin(includeEmpty: boolean) {
  const users = [
      { id: 1, name: 'An' },
      { id: 2, name: 'Bình' },
      { id: 3, name: 'Chi' },
    ],
    orders = [
      { id: 101, user: 1, total: 120 },
      { id: 102, user: 1, total: 80 },
      { id: 103, user: 2, total: 0 },
    ];
  return users.flatMap<{ user: string; order: number | null; total: number | null }>((u) => {
    const hits = orders.filter((o) => o.user === u.id);
    return hits.length
      ? hits.map((o) => ({ user: u.name, order: o.id, total: o.total }))
      : includeEmpty
        ? [{ user: u.name, order: null, total: null }]
        : [];
  });
}
export function schedule(quantum: number) {
  const remaining = [5, 3, 1],
    jobs: { job: string; start: number; end: number }[] = [];
  let t = 0;
  while (remaining.some((n) => n > 0))
    for (let i = 0; i < remaining.length; i++)
      if (remaining[i] > 0) {
        const length = Math.min(remaining[i], quantum);
        jobs.push({ job: ['A', 'B', 'C'][i], start: t, end: t + length });
        remaining[i] -= length;
        t += length;
      }
  return jobs;
}
export function capacity(rps: number, perPod: number, replicas: number) {
  const capacity = perPod * replicas;
  return {
    capacity,
    load: Math.round((rps / capacity) * 100),
    needed: Math.max(1, Math.ceil(rps / perPod)),
    spare: Math.max(0, capacity - rps),
  };
}
export function cacheRead(
  entries: Record<string, { value: string; expires: number }>,
  key: string,
  now: number,
  dbValue: string,
  ttl: number,
) {
  const found = entries[key];
  if (found && found.expires > now) return { hit: true, value: found.value, entries };
  return {
    hit: false,
    value: dbValue,
    entries: { ...entries, [key]: { value: dbValue, expires: now + ttl } },
  };
}
export function queueDelivery(dedup: boolean, crash: boolean) {
  const seen = new Set<string>();
  let effects = 0;
  const trace: string[] = [];
  for (let delivery = 0; delivery < (crash ? 2 : 1); delivery++) {
    if (dedup && seen.has('event-01'))
      trace.push('Redelivery event-01: bỏ qua vì event_id đã có trong transaction.');
    else {
      effects++;
      seen.add('event-01');
      trace.push(`Áp dụng side effect lần ${effects}.`);
    }
    if (crash && delivery === 0) trace.push('Worker chết sau commit, trước ACK → broker giao lại.');
    else trace.push('ACK → broker đánh dấu đã nhận.');
  }
  return { effects, trace };
}
export function stockRace(atomic: boolean) {
  return atomic
    ? {
        sold: 1,
        stock: 0,
        trace: [
          'A: UPDATE ... WHERE stock > 0 → affected 1',
          'B: UPDATE ... WHERE stock > 0 → affected 0',
          'A COMMIT; B báo hết hàng.',
        ],
      }
    : {
        sold: 2,
        stock: 0,
        trace: [
          'A đọc stock=1; B cũng đọc stock=1',
          'A bán, ghi stock=0; B bán, cũng ghi stock=0',
          'Đã bán 2 vé từ 1 vé; stock=0 che giấu oversell.',
        ],
      };
}
export function estimate(dau: number, requests: number, peak: number, bytes: number, days: number) {
  const daily = dau * requests;
  return {
    average: daily / 86400,
    peak: (daily / 86400) * peak,
    storageGB: (daily * bytes * days) / 1e9,
  };
}
