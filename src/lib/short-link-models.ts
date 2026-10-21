const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function encodeBase62(value: bigint): string {
  if (value < 0n) throw new RangeError('ID must be non-negative');
  if (value === 0n) return '0';
  let code = '';
  while (value > 0n) {
    code = alphabet[Number(value % 62n)] + code;
    value /= 62n;
  }
  return code;
}
export function decodeBase62(code: string): bigint {
  if (!code || !/^[0-9a-zA-Z]+$/.test(code)) throw new RangeError('Invalid base62 code');
  return [...code].reduce((n, c) => n * 62n + BigInt(alphabet.indexOf(c)), 0n);
}
export function base62Steps(value: bigint) {
  if (value < 0n) throw new RangeError('ID must be non-negative');
  const steps: { input: string; quotient: string; remainder: number; digit: string }[] = [];
  do {
    const q = value / 62n,
      r = Number(value % 62n);
    steps.push({ input: String(value), quotient: String(q), remainder: r, digit: alphabet[r] });
    value = q;
  } while (value > 0n);
  return steps;
}
export function codeSpace(length: number, occupied: number) {
  if (
    !Number.isInteger(length) ||
    length < 1 ||
    length > 20 ||
    !Number.isFinite(occupied) ||
    occupied < 0
  )
    throw new RangeError('Invalid namespace');
  const space = 62n ** BigInt(length),
    size = Number(space),
    fraction = Math.min(1, occupied / size);
  // Birthday approximation assumes uniform independent draws with replacement.
  const anyCollision = -Math.expm1(-(occupied * (occupied - 1)) / (2 * size));
  return {
    space,
    occupiedFraction: fraction,
    nextCollision: fraction,
    anyCollision: Math.max(0, anyCollision),
    expectedAttempts: fraction < 1 ? 1 / (1 - fraction) : Infinity,
  };
}
export type RedirectPolicy = 'no-store' | 'no-cache' | 'fresh';
export function redirectReplay(policy: RedirectPolicy, ttl: number, updateAt: number) {
  if (!Number.isFinite(ttl) || ttl < 0 || !Number.isFinite(updateAt) || updateAt < 0)
    throw new RangeError('Invalid timeline');
  let cached: 'A' | 'B' | null = null,
    freshUntil = -1;
  const events = Array.from({ length: 10 }, (_, i) => {
    const at = i * 10,
      current = at >= updateAt ? 'B' : 'A';
    const origin = policy !== 'fresh' || cached === null || at >= freshUntil;
    if (origin) {
      cached = current;
      freshUntil = at + ttl;
    }
    const target = policy === 'no-store' ? current : cached!;
    return { at, origin, target, stale: target !== current };
  });
  return {
    events,
    originRequests: events.filter((e) => e.origin).length,
    cachedRequests: events.filter((e) => !e.origin).length,
    staleRequests: events.filter((e) => e.stale).length,
  };
}
