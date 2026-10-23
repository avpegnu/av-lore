export type LimitAlgorithm = 'token' | 'leaky' | 'fixed' | 'log' | 'counter';
export const rateStreams = {
  boundary: [900, 901, 902, 903, 904, 905, 1000, 1001, 1002, 1003, 1004, 1005],
  steady: Array.from({ length: 24 }, (_, i) => i * 150),
  burst: Array.from({ length: 18 }, (_, i) => Math.floor(i / 6) * 900 + (i % 6)),
};
export function rateReplay(
  algorithm: LimitAlgorithm,
  times: readonly number[],
  limit: number,
  capacity = limit,
  windowMs = 1000,
) {
  if (
    !Number.isFinite(windowMs) ||
    windowMs <= 0 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    times.some((t, i) => t < 0 || !Number.isFinite(t) || (i > 0 && t < times[i - 1]))
  )
    throw new RangeError('Invalid rate stream');
  let tokens = capacity,
    last = times[0] || 0,
    window = -1,
    current = 0,
    previous = 0;
  let acceptedLog: number[] = [],
    departures: number[] = [];
  const events = times.map((at) => {
    let accepted = false,
      releaseAt = at;
    if (algorithm === 'token') {
      tokens = Math.min(capacity, tokens + ((at - last) * limit) / windowMs);
      last = at;
      accepted = tokens >= 1 - 1e-9;
      if (accepted) tokens -= 1;
    } else if (algorithm === 'leaky') {
      departures = departures.filter((t) => t > at);
      accepted = departures.length < capacity;
      if (accepted) {
        releaseAt = Math.max(at, departures.at(-1) || 0) + windowMs / limit;
        departures.push(releaseAt);
      }
    } else if (algorithm === 'log') {
      acceptedLog = acceptedLog.filter((t) => t > at - windowMs);
      accepted = acceptedLog.length < limit;
      if (accepted) acceptedLog.push(at);
    } else {
      const next = Math.floor(at / windowMs);
      if (next !== window) {
        previous = next === window + 1 ? current : 0;
        current = 0;
        window = next;
      }
      const used =
        algorithm === 'fixed' ? current : current + previous * (1 - (at % windowMs) / windowMs);
      accepted = used + 1 <= limit + 1e-9;
      if (accepted) current++;
    }
    return { at, accepted, releaseAt };
  });
  const accepted = events.filter((e) => e.accepted);
  const peakWindow = Math.max(
    0,
    ...accepted.map((e) => accepted.filter((x) => x.at > e.at - windowMs && x.at <= e.at).length),
  );
  return {
    events,
    allowed: accepted.length,
    rejected: events.length - accepted.length,
    peakWindow,
    maxDelay: Math.max(0, ...accepted.map((e) => e.releaseAt - e.at)),
  };
}
export function counterRace(contenders: number, atomic: boolean) {
  if (!Number.isInteger(contenders) || contenders < 1)
    throw new RangeError('Positive contender count required');
  return { remaining: 1, allowed: atomic ? 1 : contenders, storedCount: 5 };
}
