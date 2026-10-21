import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { load } from 'cheerio';
const site = path.resolve(import.meta.dirname, '..'),
  dist = path.join(site, 'dist'),
  root = process.env.LEGACY_SOURCE_ROOT ? path.resolve(process.env.LEGACY_SOURCE_ROOT) : null;
const base = (process.env.PUBLIC_BASE_PATH || '/av-lore').replace(/\/$/, '');
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const htmlFiles = walk(dist).filter((f) => f.endsWith('.html')),
  pages = new Map(),
  errors = [];
for (const file of htmlFiles) {
  const $ = load(fs.readFileSync(file, 'utf8'));
  const ids = new Set();
  $('[id]').each((_, e) => {
    const id = $(e).attr('id');
    if (ids.has(id)) errors.push(`Duplicate id ${id}: ${path.relative(dist, file)}`);
    ids.add(id);
  });
  pages.set(file, { $, ids });
  assert.equal($('h1').length, 1, `One h1: ${file}`);
  assert.equal($('html').attr('lang'), path.relative(dist, file).startsWith('en/') ? 'en' : 'vi');
}
let checked = 0;
for (const [file, { $ }] of pages) {
  $('a[href],link[href],script[src],img[src]').each((_, el) => {
    const raw = $(el).attr('href') || $(el).attr('src');
    if (!raw || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(raw) || raw.startsWith('//'))
      return;
    const u = new URL(raw, 'https://local.invalid' + base + '/' + path.relative(dist, file));
    if (!u.pathname.startsWith(base + '/') && u.pathname !== base) {
      errors.push(`Missing base path ${raw} in ${path.relative(dist, file)}`);
      return;
    }
    let target = path.join(dist, decodeURIComponent(u.pathname.slice(base.length)));
    if (fs.existsSync(target) && fs.statSync(target).isDirectory())
      target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) {
      errors.push(`Missing ${raw} in ${path.relative(dist, file)}`);
      return;
    }
    checked++;
    if (u.hash && target.endsWith('.html')) {
      const fragment = decodeURIComponent(u.hash.slice(1));
      if (!pages.get(target)?.ids.has(fragment))
        errors.push(`Missing anchor ${raw} in ${path.relative(dist, file)}`);
    }
  });
}
const courses = walk(path.join(site, 'src/content/courses'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const topics = walk(path.join(site, 'src/content/topics'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
assert.equal(courses.length, 198);
assert.equal(topics.length, 31);
for (const c of courses) {
  // The standalone repository builds from committed content. Legacy source
  // comparison is optional and explicit; CI never requires a sibling checkout.
  if (root) {
    assert.equal(
      crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(root, c.source)))
        .digest('hex'),
      c.sourceHash,
      `Legacy source changed; deliberately update migration: ${c.id}`,
    );
  }
  const file = path.join(dist, 'learn', c.track, c.slug, 'index.html');
  assert.ok(pages.has(file));
  const $ = load(c.html);
  assert.equal($('script,iframe,object,embed').length, 0);
  $('*').each((_, e) =>
    assert.ok(!Object.keys(e.attribs || {}).some((a) => /^on/i.test(a)), `Inline event: ${c.id}`),
  );
}
for (const t of topics) {
  const $ = pages.get(path.join(dist, 'handbook', t.id, 'index.html')).$;
  assert.equal($('[data-lab]').length, 1);
  assert.equal($('.note-section').length, t.notes.length);
  assert.equal($('.question').length, t.questions.length);
  for (const q of t.questions)
    assert.ok(
      t.notes.some((n) => n.id === q.note),
      `Bad note pointer ${t.id}/${q.id}`,
    );
  for (const p of t.prerequisites) assert.ok(topics.some((x) => x.id === p));
}
assert.equal(
  htmlFiles.filter(
    (f) =>
      !path.relative(dist, f).startsWith('en/') &&
      f.includes('/handbook/system-design/') &&
      !f.endsWith('/system-design/index.html'),
  ).length,
  26,
);
assert.ok(
  fs.existsSync(path.join(dist, 'pagefind/pagefind.js')),
  'Vietnamese search index missing',
);
assert.ok(
  fs.existsSync(path.join(dist, 'en/pagefind/pagefind.js')),
  'English search index missing',
);
assert.ok(pages.has(path.join(dist, 'case-studies/index.html')), 'Case Studies index missing');
assert.equal(htmlFiles.length, 558, 'Both languages must contain all 279 pages');
assert.equal(htmlFiles.filter((f) => path.relative(dist, f).startsWith('en/')).length, 279);
for (const [file, { $ }] of pages) {
  if (!path.relative(dist, file).startsWith('en/')) continue;
  const original = pages.get(path.join(dist, path.relative(path.join(dist, 'en'), file)));
  assert.ok(original);
  assert.deepEqual(
    $('main pre')
      .map((_, e) => $(e).text())
      .get(),
    original
      .$('main pre')
      .map((_, e) => original.$(e).text())
      .get(),
    'Code must survive translation',
  );
}
assert.ok(!walk(dist).some((f) => f.includes('FDown.vn')), 'Raw images must not deploy');
if (errors.length) {
  console.error(errors.slice(0, 100).join('\n'));
  throw Error(`${errors.length} link/anchor errors`);
}
console.log(
  `Verified ${htmlFiles.length} pages, ${checked} links/assets, 198 migrated chapters, 31 topics and 26 cases.`,
);
