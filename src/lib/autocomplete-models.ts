export type Suggestion = { id: string; text: string; score: number; blocked?: boolean };
export const suggestionCorpus: Suggestion[] = [
  { id: 'retired', text: 'cache retired', score: 120, blocked: true },
  { id: 'cache', text: 'cache', score: 110 },
  { id: 'aside', text: 'cache aside', score: 98 },
  { id: 'eviction', text: 'cache eviction', score: 92 },
  { id: 'caching', text: 'caching', score: 87 },
  { id: 'cassandra', text: 'cassandra', score: 80 },
  { id: 'coffee', text: 'cà phê', score: 75 },
  { id: 'study', text: 'cách học', score: 70 },
  { id: 'cat', text: 'catalog', score: 65 },
  { id: 'db', text: 'database', score: 60 },
  { id: 'data', text: 'data modeling', score: 55 },
];
export function normalizeSuggestion(input: string, fold: boolean) {
  const n = input.trim().normalize('NFC').toLocaleLowerCase('vi').normalize('NFC');
  return fold ? n.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').normalize('NFC') : n;
}
type TrieNode = { children: Map<string, TrieNode>; ranked: Suggestion[] };
export function suggestionLookup(
  raw: string,
  k: number,
  fold: boolean,
  mode: 'cached' | 'overfetch' | 'build-filter',
) {
  if (!Number.isInteger(k) || k < 1 || k > 5) throw new RangeError('Invalid suggestion limit');
  const root: TrieNode = { children: new Map(), ranked: [] };
  const entries = suggestionCorpus
    .filter((s) => mode !== 'build-filter' || !s.blocked)
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const entry of entries) {
    let current = root;
    current.ranked.push(entry);
    for (const ch of normalizeSuggestion(entry.text, fold)) {
      let next = current.children.get(ch);
      if (!next) {
        next = { children: new Map(), ranked: [] };
        current.children.set(ch, next);
      }
      current = next;
      current.ranked.push(entry);
    }
  }
  const prefix = normalizeSuggestion(raw, fold),
    path: { prefix: string; matches: number; next: string[] }[] = [
      { prefix: '∅', matches: root.ranked.length, next: [...root.children.keys()] },
    ];
  let node: TrieNode | undefined = root,
    walked = '';
  for (const ch of prefix) {
    walked += ch;
    node = node.children.get(ch);
    path.push({
      prefix: walked,
      matches: node?.ranked.length ?? 0,
      next: node ? [...node.children.keys()] : [],
    });
    if (!node) break;
  }
  const candidateBudget = mode === 'overfetch' ? 2 * k : k,
    candidates = node?.ranked.slice(0, candidateBudget) || [],
    results = candidates.filter((s) => !s.blocked).slice(0, k);
  return { prefix, path, candidates, results, matched: node?.ranked.length ?? 0 };
}
export type SuggestRequest = { id: number; prefix: string; sent: number; complete: number };
export const suggestionRequests: SuggestRequest[] = [
  { id: 1, prefix: 'c', sent: 0, complete: 300 },
  { id: 2, prefix: 'ca', sent: 60, complete: 130 },
  { id: 3, prefix: 'cat', sent: 120, complete: 190 },
];
export function suggestionRace(time: number, guard: boolean) {
  if (!Number.isFinite(time) || time < 0) throw new RangeError('Invalid time');
  const sent = suggestionRequests.filter((r) => r.sent <= time),
    latest = sent.at(-1),
    arrived = sent
      .filter((r) => r.complete <= time)
      .sort((a, b) => a.complete - b.complete || a.id - b.id);
  let displayed: SuggestRequest | undefined;
  for (const r of arrived) {
    const currentAtArrival = sent.filter((s) => s.sent <= r.complete).at(-1);
    if (!guard || r.id === currentAtArrival?.id) displayed = r;
  }
  // Clear old suggestions on an input generation change in guarded mode.
  if (guard && displayed?.id !== latest?.id) displayed = undefined;
  return {
    current: latest?.prefix ?? '',
    latestId: latest?.id ?? 0,
    arrived,
    displayed: displayed?.prefix ?? '—',
    stale: !!displayed && displayed.id !== latest?.id,
  };
}
