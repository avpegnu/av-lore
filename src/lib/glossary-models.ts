import type { GlossaryEntry } from './glossary-schema';
export function normalizeGlossary(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
export function glossaryLetter(term: string) {
  const first = normalizeGlossary(term).charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : '#';
}
export const glossaryAnchor = (id: string) => 'term-' + id;
export function indexGlossary(entries: GlossaryEntry[]) {
  const ids = new Set<string>();
  return entries.map((entry) => {
    if (ids.has(entry.id)) throw Error('Duplicate glossary ID ' + entry.id);
    ids.add(entry.id);
    return {
      entry,
      term: normalizeGlossary(entry.term),
      aliases: entry.aliases.map(normalizeGlossary),
      text: normalizeGlossary(
        [
          entry.term,
          ...entry.aliases,
          entry.definition.vi,
          entry.definition.en,
          entry.example.vi,
          entry.example.en,
          entry.pitfall.vi,
          entry.pitfall.en,
          entry.category.label.vi,
          entry.category.label.en,
        ].join(' '),
      ),
      letter: glossaryLetter(entry.term),
    };
  });
}
export type GlossaryIndex = ReturnType<typeof indexGlossary>;
export function searchGlossary(index: GlossaryIndex, query: string, category = 'all') {
  const q = normalizeGlossary(query),
    words = [...new Set(q.split(' ').filter(Boolean))];
  const all = index
    .filter((r) => words.every((w) => r.text.includes(w)))
    .map((row) => ({
      row,
      score: !q
        ? 0
        : row.term === q
          ? 1000
          : row.aliases.includes(q)
            ? 900
            : row.term.startsWith(q)
              ? 500
              : row.aliases.some((a) => a.startsWith(q))
                ? 400
                : row.term.includes(q)
                  ? 300
                  : 100,
    }));
  const counts: Record<string, number> = {};
  for (const { row } of all)
    counts[row.entry.category.id] = (counts[row.entry.category.id] || 0) + 1;
  const matched = all
    .filter(({ row }) => category === 'all' || row.entry.category.id === category)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.row.entry.term.localeCompare(b.row.entry.term, 'en', {
          sensitivity: 'base',
          numeric: true,
        }),
    );
  return {
    entries: matched.map((r) => r.row.entry),
    counts,
    totalMatches: all.length,
    letters: [...new Set(matched.map((r) => r.row.letter))].sort((a, b) =>
      a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b),
    ),
  };
}
export function groupGlossary(entries: GlossaryEntry[]) {
  const groups = new Map<string, GlossaryEntry[]>();
  for (const entry of entries) {
    const letter = glossaryLetter(entry.term);
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(entry);
  }
  return [...groups]
    .sort(([a], [b]) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b)))
    .map(([letter, rows]) => ({
      letter,
      entries: [...rows].sort((a, b) =>
        a.term.localeCompare(b.term, 'en', { sensitivity: 'base', numeric: true }),
      ),
    }));
}
export function findGlossary(index: GlossaryIndex, key: string) {
  const q = normalizeGlossary(key.replace(/^term-/, ''));
  return (
    index.find((r) => r.entry.id === q) ||
    index.find((r) => r.term === q) ||
    index.find((r) => r.aliases.includes(q))
  );
}
