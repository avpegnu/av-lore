import { glossaryEntrySchema } from './glossary-schema';
import { indexGlossary } from './glossary-models';
export const glossaryEntries = Object.values(
  import.meta.glob('../content/glossary/*.json', { eager: true, import: 'default' }),
)
  .flatMap((raw) => glossaryEntrySchema.array().parse(raw))
  .sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base', numeric: true }));
export const glossaryIndex = indexGlossary(glossaryEntries);
export const glossaryCategories = [
  ...new Map(glossaryEntries.map((e) => [e.category.id, e.category])).values(),
];
