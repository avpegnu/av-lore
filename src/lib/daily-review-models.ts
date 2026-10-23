/** Transparent teaching schedule, not SM-2/FSRS or a calibrated forgetting predictor. */
export const reviewIntervals = [
  10 * 60_000,
  86_400_000,
  3 * 86_400_000,
  7 * 86_400_000,
  14 * 86_400_000,
  30 * 86_400_000,
  60 * 86_400_000,
  120 * 86_400_000,
  180 * 86_400_000,
] as const;
export const reviewSessionLimit = 50;
export type RecallGrade = 'again' | 'hard' | 'good' | 'easy';
export type RecallRecord = {
  revision: string;
  level: number;
  due: number;
  last: number;
  reviews: number;
  lapses: number;
};
type DayCount = { newCards: number; reviews: number };
type RecallUndo = {
  id: string;
  day: string;
  previous: RecallRecord | null;
  previousDay: DayCount | null;
};
export type RecallStore = {
  version: 1;
  cards: Record<string, RecallRecord>;
  days: Record<string, DayCount>;
  undo: RecallUndo[];
};
export type ReviewIdentity = { id: string; revision: string; source: string };
const grades: RecallGrade[] = ['again', 'hard', 'good', 'easy'];
const number = (x: unknown, min = 0, max = 8e15) =>
  typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const integer = (x: unknown, min = 0, max = 1e9) => number(x, min, max) && Number.isInteger(x);
const cardId = (x: unknown) =>
  typeof x === 'string' && /^(topic|handbook|flow|term):[a-zA-Z0-9/_:.-]{1,180}$/.test(x);
const revision = (x: unknown) => typeof x === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(x);
export const emptyRecall = (): RecallStore => ({ version: 1, cards: {}, days: {}, undo: [] });
function record(raw: unknown): RecallRecord {
  if (!raw || typeof raw !== 'object') throw Error('INVALID_CARD');
  const r = raw as RecallRecord;
  if (
    !revision(r.revision) ||
    !integer(r.level, 0, reviewIntervals.length - 1) ||
    !number(r.due) ||
    !number(r.last) ||
    !integer(r.reviews) ||
    !integer(r.lapses)
  )
    throw Error('INVALID_CARD_FIELDS');
  return {
    revision: r.revision,
    level: r.level,
    due: r.due,
    last: r.last,
    reviews: r.reviews,
    lapses: r.lapses,
  };
}
function count(raw: unknown): DayCount {
  if (!raw || typeof raw !== 'object') throw Error('INVALID_DAY');
  const r = raw as DayCount;
  if (!integer(r.newCards) || !integer(r.reviews)) throw Error('INVALID_DAY_FIELDS');
  return { newCards: r.newCards, reviews: r.reviews };
}
export function validateRecall(raw: unknown): RecallStore {
  if (!raw || typeof raw !== 'object') throw Error('INVALID_STORE');
  const s = raw as RecallStore;
  if (
    s.version !== 1 ||
    !s.cards ||
    typeof s.cards !== 'object' ||
    Array.isArray(s.cards) ||
    !s.days ||
    typeof s.days !== 'object' ||
    Array.isArray(s.days) ||
    !Array.isArray(s.undo) ||
    s.undo.length > 50 ||
    Object.keys(s.cards).length > 10000 ||
    Object.keys(s.days).length > 10000
  )
    throw Error('INVALID_STORE_SHAPE');
  const cards: RecallStore['cards'] = {},
    days: RecallStore['days'] = {};
  for (const [id, r] of Object.entries(s.cards)) {
    if (!cardId(id)) throw Error('INVALID_CARD_ID');
    cards[id] = record(r);
  }
  for (const [day, v] of Object.entries(s.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw Error('INVALID_DAY_ID');
    days[day] = count(v);
  }
  const undo = s.undo.map((u) => {
    if (!u || !cardId(u.id) || !/^\d{4}-\d{2}-\d{2}$/.test(u.day)) throw Error('INVALID_UNDO');
    return {
      id: u.id,
      day: u.day,
      previous: u.previous === null ? null : record(u.previous),
      previousDay: u.previousDay === null ? null : count(u.previousDay),
    };
  });
  return { version: 1, cards, days, undo };
}
export function recallDay(now: number) {
  if (!number(now, 0, Date.UTC(9999, 0, 1))) throw Error('INVALID_CLOCK');
  const d = new Date(now);
  return `${d.getFullYear().toString().padStart(4, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}
export function nextRecall(
  previous: RecallRecord | undefined,
  rev: string,
  grade: RecallGrade,
  now: number,
): RecallRecord {
  recallDay(now);
  if (!revision(rev) || !grades.includes(grade)) throw Error('INVALID_GRADE_OR_REVISION');
  const same = previous?.revision === rev,
    base = same ? previous! : undefined,
    current = base?.level || 0;
  const level =
    grade === 'again'
      ? 0
      : grade === 'hard'
        ? current
        : Math.min(reviewIntervals.length - 1, current + (grade === 'easy' ? 2 : 1));
  const interval =
    grade === 'hard'
      ? Math.max(reviewIntervals[0], Math.floor(reviewIntervals[level] / 2))
      : reviewIntervals[level];
  return {
    revision: rev,
    level,
    due: now + interval,
    last: now,
    reviews: (base?.reviews || 0) + 1,
    lapses: (base?.lapses || 0) + (grade === 'again' ? 1 : 0),
  };
}
export function gradeRecall(
  store: RecallStore,
  id: string,
  rev: string,
  grade: RecallGrade,
  now: number,
): RecallStore {
  if (!cardId(id)) throw Error('INVALID_CARD_ID');
  const day = recallDay(now),
    previous = store.cards[id] || null,
    previousDay = store.days[day] || null,
    isNew = !previous || previous.revision !== rev;
  return {
    ...store,
    cards: { ...store.cards, [id]: nextRecall(previous || undefined, rev, grade, now) },
    days: {
      ...store.days,
      [day]: {
        newCards: (previousDay?.newCards || 0) + (isNew ? 1 : 0),
        reviews: (previousDay?.reviews || 0) + 1,
      },
    },
    undo: [...store.undo, { id, day, previous, previousDay }].slice(-50),
  };
}
export function undoRecall(store: RecallStore): RecallStore {
  const last = store.undo.at(-1);
  if (!last) return store;
  const cards = { ...store.cards },
    days = { ...store.days };
  if (last.previous) cards[last.id] = last.previous;
  else delete cards[last.id];
  if (last.previousDay) days[last.day] = last.previousDay;
  else delete days[last.day];
  return { ...store, cards, days, undo: store.undo.slice(0, -1) };
}
export function recallPool(
  store: RecallStore,
  deck: ReviewIdentity[],
  now: number,
  newLimit: number,
) {
  if (!integer(newLimit, 0, 50)) throw Error('INVALID_NEW_LIMIT');
  const today = store.days[recallDay(now)] || { newCards: 0, reviews: 0 };
  const seen = (c: ReviewIdentity) => store.cards[c.id]?.revision === c.revision;
  const due = deck
    .filter((c) => seen(c) && store.cards[c.id].due <= now)
    .sort((a, b) => store.cards[a.id].due - store.cards[b.id].due || a.id.localeCompare(b.id));
  const fresh = deck.filter((c) => !seen(c)),
    future = deck
      .filter((c) => seen(c) && store.cards[c.id].due > now)
      .sort((a, b) => store.cards[a.id].due - store.cards[b.id].due);
  // Round-robin new cards across actual sources; due cards remain oldest-first.
  const sources = [...new Set(fresh.map((c) => c.source))].sort(),
    bins = sources.map((s) => fresh.filter((c) => c.source === s));
  const interleaved: ReviewIdentity[] = [];
  for (let i = 0; interleaved.length < fresh.length; i++)
    for (const bin of bins) if (bin[i]) interleaved.push(bin[i]);
  return {
    due,
    future,
    fresh: interleaved,
    newAvailable: Math.min(fresh.length, Math.max(0, newLimit - today.newCards)),
    newTodayGlobal: today.newCards,
    reviewsTodayGlobal: today.reviews,
  };
}
export function recallQueue(
  store: RecallStore,
  deck: ReviewIdentity[],
  now: number,
  newLimit: number,
  maxSession: number,
) {
  if (!integer(maxSession, 1, reviewSessionLimit)) throw Error('INVALID_SESSION_LIMIT');
  const pool = recallPool(store, deck, now, newLimit);
  return [...pool.due, ...pool.fresh.slice(0, pool.newAvailable)]
    .slice(0, maxSession)
    .map((c) => c.id);
}
export function recallForecast(store: RecallStore, deck: ReviewIdentity[], now: number) {
  const bins = Array(7).fill(0) as number[];
  for (const c of deck) {
    const r = store.cards[c.id];
    if (!r || r.revision !== c.revision) continue;
    const bin = Math.max(0, Math.floor((r.due - now) / 86_400_000));
    if (bin < 7) bins[bin]++;
  }
  return bins;
}
