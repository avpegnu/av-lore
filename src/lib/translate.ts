export type Dictionary = Record<string, string>;
export const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();
const escapePattern = (value: string) =>
  [...value].map((ch) => ('\\^$.*+?()[]{}|'.includes(ch) ? '\\' + ch : ch)).join('');
/** Exact strings plus numbered interpolation slots. User-entered values are never submitted anywhere. */
export function createTranslator(dictionary: Dictionary) {
  const patterns = Object.entries(dictionary)
    .filter(([key]) => key.includes('__ITB_VAR_'))
    .map(([key, value]) => ({
      regex: new RegExp(
        '^' +
          key
            .split(/__ITB_VAR_\d+__/)
            .map(escapePattern)
            .join('(.*?)') +
          '$',
      ),
      value,
    }));
  return (value: string) => {
    const key = normalizeText(value);
    if (!key) return value;
    let translated = dictionary[key];
    if (!translated)
      for (const pattern of patterns) {
        const match = key.match(pattern.regex);
        if (match) {
          translated = pattern.value.replace(
            /__ITB_VAR_(\d+)__/g,
            (_, i) => dictionary[normalizeText(match[Number(i) + 1])] || match[Number(i) + 1],
          );
          break;
        }
      }
    return translated ? value.replace(/\S[\s\S]*\S|\S/, () => translated) : value;
  };
}
