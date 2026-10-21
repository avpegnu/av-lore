/** One-way import. Existing source files are read only. Rerun deliberately. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { load } from 'cheerio';
import vm from 'node:vm';
import postcss from 'postcss';
if (!process.env.LEGACY_SOURCE_ROOT) {
  throw new Error(
    'Set LEGACY_SOURCE_ROOT to the original IT Basic checkout. Migration overwrites imported content; review changes deliberately.',
  );
}
const root = path.resolve(process.env.LEGACY_SOURCE_ROOT),
  site = path.resolve(import.meta.dirname, '..');
const tracks = [
  ['cli', 'CLI', 'Terminal & Linux', 'Nền tảng'],
  ['dsa', 'DSA', 'Data Structures & Algorithms', 'Nền tảng'],
  ['os', 'OS', 'Operating Systems', 'Nền tảng'],
  ['networking', 'Networking', 'Networking', 'Nền tảng'],
  ['oop', 'OOP', 'OOP & Design Patterns', 'Nền tảng'],
  [
    'javascript',
    'Programming Language/JavaScript',
    'JavaScript & TypeScript',
    'Ngôn ngữ & ứng dụng',
  ],
  ['python', 'Programming Language/Python', 'Python', 'Ngôn ngữ & ứng dụng'],
  ['java', 'Programming Language/Java', 'Java', 'Ngôn ngữ & ứng dụng'],
  ['dart', 'Programming Language/Dart', 'Dart', 'Ngôn ngữ & ứng dụng'],
  ['flutter', 'Programming Language/Flutter', 'Flutter', 'Ngôn ngữ & ứng dụng'],
  ['fullstack', 'Fullstack-ContactCenter', 'Fullstack & Realtime', 'Ngôn ngữ & ứng dụng'],
  ['database', 'Database', 'Database Engineering', 'Hệ thống & vận hành'],
  ['system-design', 'SystemDesign', 'System Design', 'Hệ thống & vận hành'],
  ['devops', 'DevOps', 'DevOps Engineering', 'Hệ thống & vận hành'],
  ['ai', 'AI/Foundations', 'AI Foundations', 'AI Engineering'],
].map(([id, source, title, group]) => ({ id, source, title, group }));
const chapters = [];
for (const t of tracks) {
  const dir = path.join(root, t.source, t.id === 'fullstack' ? '' : 'chuong');
  const list =
    t.id === 'fullstack'
      ? fs
          .readdirSync(dir, { withFileTypes: true })
          .filter((e) => e.isDirectory() && /^[A-I]$/.test(e.name))
          .flatMap((e) =>
            fs
              .readdirSync(path.join(dir, e.name))
              .filter((f) => f.endsWith('.html'))
              .map((f) => path.join(dir, e.name, f)),
          )
      : fs
          .readdirSync(dir)
          .filter((f) => /^chuong\d+\.html$/.test(f))
          .map((f) => path.join(dir, f));
  list.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  list.forEach((file, i) =>
    chapters.push({
      file,
      track: t.id,
      index: i + 1,
      slug:
        t.id === 'fullstack'
          ? path.basename(file, '.html').toLowerCase()
          : `chapter-${String(i + 1).padStart(2, '0')}`,
      trackTitle: t.title,
    }),
  );
}
const routeMap = new Map(
  chapters.map((c) => [path.normalize(c.file), `/learn/${c.track}/${c.slug}/`]),
);
for (const t of tracks) {
  routeMap.set(path.join(root, t.source, 'index.html'), `/learn/${t.id}/`);
  routeMap.set(path.join(root, t.source, 'docs.html'), `/learn/${t.id}/`);
}
routeMap.set(path.join(root, 'index.html'), '/');
routeMap.set(path.join(root, 'Programming Language/index.html'), '/learn/');
routeMap.set(path.join(root, 'AI/index.html'), '/learn/ai/');
routeMap.set(path.join(root, 'NotesInterview/index.html'), '/handbook/');
routeMap.set(path.join(root, 'NotesInterview/read.html'), '/handbook/');
const report = { sourceChapters: chapters.length, chapters: [], unavailableLinks: [], assets: [] };
const out = path.join(site, 'src/content/courses');
fs.mkdirSync(out, { recursive: true });
for (const c of chapters) {
  const raw = fs.readFileSync(c.file, 'utf8'),
    $ = load(raw);
  const title = $('h1').first().text().replace(/\s+/g, ' ').trim() || $('title').text().trim();
  const description =
    $('meta[name="description"]').attr('content') ||
    $('.lead,.subtitle').first().text().replace(/\s+/g, ' ').trim().slice(0, 260);
  let content = $('article').first();
  if (!content.length) content = $('.content').first();
  if (!content.length) content = $('main').first();
  if (!content.length) throw Error(`No content root ${c.file}`);
  const scripts = content.find('script').length;
  content
    .find(
      'script,style,link,iframe,object,embed,nav,aside.chapter-toc,.sidebar,.chapter-sidebar,.chapter-toc,.chapter-nav,.chapter-pagination,.chapter-footer,.lesson-nav,.pager,.breadcrumb,.topbar,.mobile-bar,#markDone,.copy-btn,.copy-button,.progress-widget',
    )
    .remove();
  content.find('.hero,.chapter-head,.chapter-header').remove();
  content.find('h1').remove();
  content.find('*').each((_, el) => {
    for (const attr of Object.keys(el.attribs || {}))
      if (/^on/i.test(attr) || (attr === 'style' && !$(el).closest('.interactive').length))
        $(el).removeAttr(attr);
  });

  // CLI questions were stored in a trusted local data script, not in the HTML.
  if (c.track === 'cli') {
    const original = load(raw),
      code = original('script:not([src])')
        .map((_, e) => original(e).html())
        .get()
        .find((s) => s.includes('window.QUIZ_DATA'));
    if (code) {
      const context = { window: {} };
      vm.runInNewContext(code, context, { timeout: 100 });
      const quiz = context.window.QUIZ_DATA;
      for (const [i, item] of quiz.entries()) {
        const q = $('<div class="quiz-question"></div>').attr('data-quiz-correct', item.correct);
        q.append($('<h3></h3>').text(`Câu ${i + 1}. ${item.q}`));
        const opts = $('<div class="quiz-options" role="group" aria-label="Các lựa chọn"></div>');
        item.options.forEach((o, j) =>
          opts.append($('<button type="button"></button>').attr('data-option', j).text(o)),
        );
        q.append(opts);
        q.append($('<p class="quiz-explain" hidden></p>').text(item.explain));
        content.find('.quiz').append(q);
      }
    }
  }
  // Preserve answers without depending on the old site's scripts.
  content.find('.quiz-question[data-correct]').each((_, el) => {
    const q = $(el),
      correct = Number(q.attr('data-correct')),
      options = q.find('.quiz-options li'),
      exp = q.find('.quiz-explain');
    options.each((i, item) =>
      $(item)
        .attr('data-option', String(i))
        .attr('tabindex', '0')
        .attr('role', 'button')
        .attr('aria-label', `Lựa chọn ${i + 1}: ${$(item).text().trim()}`),
    );
    q.attr('data-quiz-correct', String(correct));
    q.find('.quiz-options').attr('role', 'group').attr('aria-label', 'Các lựa chọn');
    if (exp.length) exp.attr('hidden', '');
  });
  content.find('#quiz .q').each((_, el) => {
    const q = $(el);
    q.attr('data-quiz-group', '');
    q.find('.opt').each((_, o) => $(o).attr('type', 'button'));
    q.find('.explain').attr('hidden', '');
  });
  content.find('input,select,textarea').each((i, el) => {
    const e = $(el),
      id = e.attr('id');
    if (
      !e.attr('aria-label') &&
      !e.attr('aria-labelledby') &&
      !(id && content.find('label').filter((_, l) => $(l).attr('for') === id).length) &&
      !e.closest('label').length
    )
      e.attr(
        'aria-label',
        e.hasClass('terminal-input') ? 'Nhập lệnh mô phỏng' : `Tham số ${id || i + 1}`,
      );
  });
  const used = new Set();
  content.find('[id]').each((_, el) => {
    const old = $(el).attr('id');
    let id = old,
      i = 2;
    while (used.has(id)) id = old + '-' + i++;
    $(el).attr('id', id);
    used.add(id);
  });
  const headings = [];
  content.find('h2,h3').each((i, el) => {
    const e = $(el),
      text = e.text().replace(/\s+/g, ' ').trim();
    if (!text) return;
    let id = e.attr('id');
    if (!id) {
      id = 'section-' + (i + 1);
      while (used.has(id)) id += 'x';
      e.attr('id', id);
      used.add(id);
    }
    headings.push({ id, text, depth: el.tagName === 'h2' ? 2 : 3 });
  });
  content.find('a[href]').each((_, el) => {
    const a = $(el),
      href = a.attr('href');
    if (!href || href.startsWith('#')) return;
    if (/^(https?:|mailto:|tel:)/i.test(href)) {
      if (/^https?:/.test(href)) a.attr('target', '_blank').attr('rel', 'noopener noreferrer');
      return;
    }
    if (/^(javascript:|data:)/i.test(href)) {
      a.replaceWith(`<span>${a.html()}</span>`);
      return;
    }
    const [filePart, hash] = href.split('#');
    const target = path.resolve(path.dirname(c.file), decodeURIComponent(filePart.split('?')[0]));
    const dest = routeMap.get(target);
    if (dest) {
      a.attr('href', dest + (hash ? '#' + hash : ''));
      return;
    }
    if (/\.html$/.test(filePart)) {
      report.unavailableLinks.push({ from: path.relative(root, c.file), href });
      a.replaceWith(`<span class="unavailable-reference">${a.html()}</span>`);
    }
  });
  content.find('img[src],source[src],video[src]').each((_, el) => {
    const attr = $(el).attr('src');
    if (/^(https?:|data:)/.test(attr)) return;
    const file = path.resolve(path.dirname(c.file), attr);
    if (!fs.existsSync(file)) throw Error(`Missing asset ${attr}`);
    const name =
        crypto.createHash('sha256').update(file).digest('hex').slice(0, 12) + path.extname(file),
      dest = path.join(site, 'public/migrated-assets', name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
    $(el).attr('src', '/migrated-assets/' + name);
    report.assets.push(name);
  });
  content.find('table').each((_, el) => {
    if (!$(el).parent().hasClass('table-scroll')) $(el).wrap('<div class="table-scroll"></div>');
  });
  const html = content.html();
  if (!html || html.length < 500) throw Error(`Empty migration ${c.file}`);
  const record = {
    id: `${c.track}--${c.slug}`,
    track: c.track,
    trackTitle: c.trackTitle,
    slug: c.slug,
    order: c.index,
    title,
    description: description || `Chương ${c.index} trong lộ trình ${c.trackTitle}.`,
    html,
    headings,
    source: path.relative(root, c.file),
    sourceHash: crypto.createHash('sha256').update(raw).digest('hex'),
    readingMinutes: Math.max(3, Math.round(content.text().split(/\s+/).length / 230)),
  };
  fs.writeFileSync(path.join(out, record.id + '.json'), JSON.stringify(record, null, 2) + '\n');
  report.chapters.push({
    id: record.id,
    source: record.source,
    sourceHash: record.sourceHash,
    sourceBytes: raw.length,
    migratedBytes: html.length,
    legacyScriptsRemoved: scripts,
    headings: headings.length,
  });
}
const labDir = path.join(site, 'public/course-labs');
fs.mkdirSync(labDir, { recursive: true });
function scopeCSS(css) {
  const ast = postcss.parse(css);
  ast.walkAtRules('import', (r) => r.remove());
  ast.walkRules((rule) => {
    if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    rule.selectors = rule.selectors.map((s) => '.legacy-prose ' + s);
  });
  return ast.toString().trimEnd() + '\n';
}
fs.writeFileSync(
  path.join(labDir, 'ai-base.css'),
  scopeCSS(fs.readFileSync(path.join(root, 'AI/shared/css/base.css'), 'utf8')),
);
for (const c of chapters.filter((c) => c.track === 'ai')) {
  const $ = load(fs.readFileSync(c.file, 'utf8'));
  const scripts = $('script:not([src])')
    .map((_, e) => $(e).html())
    .get()
    .join('\n');
  if (scripts.trim())
    fs.writeFileSync(path.join(labDir, `ai-${c.slug}.js`), scripts.trimEnd() + '\n');
  const css = $('style')
    .map((_, e) => $(e).html())
    .get()
    .join('\n');
  if (css.trim()) fs.writeFileSync(path.join(labDir, `ai-${c.slug}.css`), scopeCSS(css));
}
// Inline terminal simulator only: reuse the local virtual filesystem engine, omit its floating modal.
let terminal = fs.readFileSync(path.join(root, 'CLI/js/terminal.js'), 'utf8');
terminal =
  terminal.slice(0, terminal.indexOf('  // ===== Floating modal =====')) +
  "  document.querySelectorAll('.terminal-sim').forEach(el => initTerminal(el));\n})();\n";
fs.writeFileSync(path.join(labDir, 'terminal.js'), terminal);
const topicsIn = path.join(root, 'NotesInterview/content'),
  topicsOut = path.join(site, 'src/content/topics');
fs.mkdirSync(topicsOut, { recursive: true });
for (const file of fs.readdirSync(topicsIn).filter((f) => f.endsWith('.json'))) {
  const t = JSON.parse(fs.readFileSync(path.join(topicsIn, file), 'utf8'));
  for (const n of t.notes) if (n.download) n.download.url = '/examples/sql-lab.sql';
  fs.writeFileSync(path.join(topicsOut, file), JSON.stringify(t, null, 2) + '\n');
}
fs.mkdirSync(path.join(site, 'public/examples'), { recursive: true });
fs.copyFileSync(
  path.join(root, 'NotesInterview/examples/sql-lab.sql'),
  path.join(site, 'public/examples/sql-lab.sql'),
);
fs.writeFileSync(path.join(site, 'src/lib/tracks.json'), JSON.stringify(tracks, null, 2) + '\n');
fs.writeFileSync(path.join(site, 'migration-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(
  `Migrated ${chapters.length} chapters and 31 handbook topics. Recorded ${report.unavailableLinks.length} unavailable legacy references.`,
);
