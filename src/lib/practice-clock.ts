export type PracticeClock = { elapsedMs: number; anchor: number | null };
export function practiceElapsed(clock: PracticeClock, now: number, budgetMs: number, rate = 1) {
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !Number.isFinite(budgetMs) ||
    budgetMs <= 0 ||
    !Number.isFinite(clock.elapsedMs) ||
    clock.elapsedMs < 0 ||
    (clock.anchor !== null && !Number.isFinite(clock.anchor))
  )
    throw Error('INVALID_CLOCK');
  return Math.min(
    budgetMs,
    clock.elapsedMs + (clock.anchor === null ? 0 : Math.max(0, now - clock.anchor) * rate),
  );
}
export function pausePractice(
  clock: PracticeClock,
  now: number,
  budgetMs: number,
  rate = 1,
): PracticeClock {
  return { elapsedMs: practiceElapsed(clock, now, budgetMs, rate), anchor: null };
}
export function resumePractice(
  clock: PracticeClock,
  now: number,
  budgetMs: number,
  rate = 1,
): PracticeClock {
  const elapsedMs = practiceElapsed(clock, now, budgetMs, rate);
  if (elapsedMs >= budgetMs) return { elapsedMs: budgetMs, anchor: null };
  return clock.anchor === null ? { elapsedMs, anchor: now } : clock;
}
/** Settle progress under the old rate before a caller changes playback speed. */
export function rebasePractice(
  clock: PracticeClock,
  now: number,
  budgetMs: number,
  rate = 1,
): PracticeClock {
  const elapsedMs = practiceElapsed(clock, now, budgetMs, rate);
  return { elapsedMs, anchor: clock.anchor === null || elapsedMs >= budgetMs ? null : now };
}
