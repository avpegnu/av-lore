import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { load } from 'cheerio';
import {
  site,
  walk,
  normalize,
  hasVietnamese,
  skip,
  readCache,
  collectStrings,
} from './localization.mjs';
const dist = path.join(site, 'dist'),
  base = (process.env.PUBLIC_BASE_PATH || '/av-lore').replace(/\/$/, ''),
  origin = process.env.PUBLIC_SITE_URL || 'https://avpegnu.github.io';
const cache = readCache(),
  missing = new Set();
const t = (value) => {
  const key = normalize(value);
  if (!key || !hasVietnamese(key)) return value;
  const result = cache[key];
  if (!result) {
    missing.add(key);
    return value;
  }
  return value.replace(/\S[\s\S]*\S|\S/, () => result);
};
const toEnglish = (href) => {
  if (!href.startsWith(base + '/') || href.startsWith(base + '/en/')) return href;
  const relative = href.slice(base.length);
  if (/\.[a-z0-9]+(?:[?#]|$)/i.test(relative) && !relative.startsWith('/examples/sql-lab.sql'))
    return href;
  return base + '/en' + relative;
};
const htmlFiles = walk(dist).filter((f) => f.endsWith('.html') && !f.includes('/en/'));
const runtime = new Set(collectStrings().runtime);
for (const file of htmlFiles) {
  const relative = path.relative(dist, file),
    route = '/' + relative.replace(/index\.html$/, '');
  const $ = load(fs.readFileSync(file, 'utf8'));
  $('html').attr('lang', 'en').attr('data-locale', 'en');
  $('body,title')
    .find('*')
    .addBack()
    .contents()
    .each((_, e) => {
      if (e.type === 'text' && !$(e).parent().closest(skip).length) {
        if ($(e).parent().closest('astro-island').length) {
          const key = normalize(e.data);
          if (hasVietnamese(key)) runtime.add(key);
        } else e.data = t(e.data);
      }
    });
  $('[aria-label],[title],[placeholder],[alt],meta[name="description"]').each((_, e) => {
    if ($(e).closest('astro-island').length) return;
    for (const attr of [
      'aria-label',
      'title',
      'placeholder',
      'alt',
      ...(e.tagName === 'meta' ? ['content'] : []),
    ]) {
      const value = $(e).attr(attr);
      if (value) $(e).attr(attr, t(value));
    }
  });
  // Asset URLs and stable content IDs are shared by both editions.
  $('a[href]').each((_, e) => {
    if ($(e).attr('data-language')) return;
    $(e).attr('href', toEnglish($(e).attr('href')));
  });
  $('[data-lang-code]').text('EN');
  $('[data-language]').each((_, e) => {
    const lang = $(e).attr('data-language');
    $(e).attr('href', base + (lang === 'en' ? '/en' : '') + route);
    if (lang === 'en') $(e).attr('aria-current', 'true');
    else $(e).removeAttr('aria-current');
    $(e)
      .find('[data-language-check]')
      .text(lang === 'en' ? '✓' : '');
  });
  $('astro-island').attr('data-pagefind-ignore', '');
  $('head link[rel=canonical],head link[rel=alternate][hreflang]').remove();
  $('head').append(
    `<link rel="alternate" hreflang="vi" href="${origin + base + route}"><link rel="alternate" hreflang="en" href="${origin + base + '/en' + route}"><link rel="canonical" href="${origin + base + '/en' + route}">`,
  );
  const out = path.join(dist, 'en', relative);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, $.html());
  const vi = load(fs.readFileSync(file, 'utf8'));
  vi('head link[rel=canonical],head link[rel=alternate][hreflang]').remove();
  vi('head').append(
    `<link rel="alternate" hreflang="vi" href="${origin + base + route}"><link rel="alternate" hreflang="en" href="${origin + base + '/en' + route}"><link rel="canonical" href="${origin + base + route}">`,
  );
  fs.writeFileSync(file, vi.html());
  // Ensure heading/anchor identities and code survive localization exactly.
  assert.deepEqual(
    $('main [id]')
      .map((_, e) => $(e).attr('id'))
      .get(),
    vi('main [id]')
      .map((_, e) => vi(e).attr('id'))
      .get(),
    `IDs changed: ${relative}`,
  );
  assert.deepEqual(
    $('pre')
      .map((_, e) => $(e).text())
      .get(),
    vi('pre')
      .map((_, e) => vi(e).text())
      .get(),
    `Code changed: ${relative}`,
  );
}
const dictionary = {};
for (const key of runtime) {
  if (cache[key]) dictionary[key] = cache[key];
  else missing.add(key);
}
// Direct DOM updates (bookmark labels, quiz feedback and canvas controls) share this local cache.
for (const [key, value] of Object.entries(
  JSON.parse(fs.readFileSync(path.join(site, 'src/i18n/en-overrides.json'), 'utf8')),
))
  dictionary[key] = value;
fs.mkdirSync(path.join(dist, 'locales'), { recursive: true });
fs.writeFileSync(path.join(dist, 'locales/en-runtime.json'), JSON.stringify(dictionary));
const sql = fs
  .readFileSync(path.join(site, 'public/examples/sql-lab.sql'), 'utf8')
  .replace(/^(\s*--\s*)(.*)$/gm, (_, prefix, comment) => prefix + t(comment));
fs.mkdirSync(path.join(dist, 'en/examples'), { recursive: true });
fs.writeFileSync(path.join(dist, 'en/examples/sql-lab.sql'), sql);
const version = crypto
  .createHash('sha256')
  .update(JSON.stringify(dictionary))
  .digest('hex')
  .slice(0, 12);
for (const file of htmlFiles) {
  const output = path.join(dist, 'en', path.relative(dist, file));
  const $ = load(fs.readFileSync(output, 'utf8'));
  $('html').attr('data-language-version', version);
  fs.writeFileSync(output, $.html());
}
const report = {
  pagesPerLanguage: htmlFiles.length,
  totalPages: htmlFiles.length * 2,
  sourceStrings: Object.keys(cache).length,
  runtimeStrings: Object.keys(dictionary).length,
  missing: [...missing],
};
fs.writeFileSync(
  path.join(site, 'localization-report.json'),
  JSON.stringify(report, null, 2) + '\n',
);
if (missing.size) {
  console.error([...missing].slice(0, 15));
  throw Error(
    `${missing.size} English translations missing. Run npm run translate:en, review the dictionary, then rebuild.`,
  );
}
console.log(
  `Localized ${htmlFiles.length} pages into English; ${Object.keys(dictionary).length} interactive strings. Code and anchor IDs preserved.`,
);
