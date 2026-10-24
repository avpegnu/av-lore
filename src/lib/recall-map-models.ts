import { normalizeGlossary } from './glossary-models';
export type RecallMap = {
  id: string;
  group: string;
  title: string;
  caption: string;
  steps: { title: string; detail: string; icon: string }[];
  takeaways: string[];
  analogy?: string;
  /** Authored alternate-language text, indexed without changing displayed content. */
  searchText?: string;
  href: string;
};
export function selectRecallMaps(maps: RecallMap[], query: string, group = 'all') {
  const words = [...new Set(normalizeGlossary(query).split(' ').filter(Boolean))];
  const matches = maps.filter((m) => {
    const text = normalizeGlossary(
      [
        m.title,
        m.caption,
        m.analogy || '',
        m.searchText || '',
        ...m.takeaways,
        ...m.steps.flatMap((s) => [s.title, s.detail]),
      ].join(' '),
    );
    return words.every((w) => text.includes(w));
  });
  const counts: Record<string, number> = {};
  for (const m of matches) counts[m.group] = (counts[m.group] || 0) + 1;
  return {
    maps: matches.filter((m) => group === 'all' || m.group === group),
    counts,
    total: matches.length,
  };
}
