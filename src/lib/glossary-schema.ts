import { z } from 'zod';
const pair = z.object({ vi: z.string().min(1), en: z.string().min(1) }),
  slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
export const glossaryEntrySchema = z.object({
  id: slug,
  term: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  category: z.object({ id: slug, label: pair }),
  definition: pair,
  example: pair,
  pitfall: pair,
  relatedLessons: z.array(slug),
  relatedTopics: z.array(slug).default([]),
});
export type GlossaryEntry = z.infer<typeof glossaryEntrySchema>;
