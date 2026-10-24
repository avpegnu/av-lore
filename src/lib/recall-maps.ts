import { topics } from './content';
import { learning } from './learning';
import { handbookLessons, handbookPath } from './handbook';
import type { RecallMap } from './recall-map-models';
import cache from '../i18n/en.json';
import overrides from '../i18n/en-overrides.json';
import { createTranslator } from './translate';
const english = createTranslator({ ...cache, ...overrides });
/** Reuse authored teaching maps. Never derive a fake model from arbitrary paragraphs. */
export const recallMaps: RecallMap[] = [
  ...topics.map((t) => {
    const m = learning[t.id];
    if (!m || m.path.length < 2) throw Error('Missing topic learning map ' + t.id);
    return {
      id: 'topic:' + t.id,
      group: 'notes',
      title: t.title,
      caption: t.description,
      steps: m.path.map((title) => ({ title, detail: '', icon: 'route' })),
      takeaways: m.takeaways,
      analogy: m.analogy,
      searchText: [t.title, t.description, ...m.path, ...m.takeaways, m.analogy]
        .map(english)
        .join(' '),
      href: `/handbook/${t.id}/#quick`,
    };
  }),
  ...handbookLessons
    .filter((l) => l.id !== 'cheat-sheet' && l.overview)
    .map((l) => ({
      id: 'handbook:' + l.id,
      group: l.group,
      title: l.title.vi,
      caption: l.overview!.caption.vi,
      steps: l.overview!.steps.map((s) => ({
        title: s.title.vi,
        detail: s.detail.vi,
        icon: s.icon,
      })),
      takeaways: l.takeaways.map((t) => t.vi),
      searchText: [
        l.title.en,
        l.overview!.caption.en,
        ...l.overview!.steps.flatMap((s) => [s.title.en, s.detail.en]),
        ...l.takeaways.map((t) => t.en),
      ].join(' '),
      href: handbookPath(l),
    })),
];
if (new Set(recallMaps.map((m) => m.id)).size !== recallMaps.length)
  throw Error('Duplicate visual recall identity');
