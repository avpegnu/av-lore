import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import ts from 'typescript';
export const site = path.resolve(import.meta.dirname, '..');
export const cachePath = path.join(site, 'src/i18n/en.json');
export const hasVietnamese = (s) => /[À-ỹĐđ]/u.test(s);
export const normalize = (s) => s.replace(/\s+/g, ' ').trim();
export const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
export const skip = 'pre,code,script,style,kbd,samp,textarea,[translate="no"]';
export function collectHTML(html, add) {
  const $ = load(html);
  $('body,title')
    .find('*')
    .addBack()
    .contents()
    .each((_, e) => {
      if (e.type === 'text' && !$(e).parent().closest(skip).length) add(e.data);
    });
  $('[aria-label],[title],[placeholder],[alt],meta[name="description"]').each((_, e) => {
    for (const key of [
      'aria-label',
      'title',
      'placeholder',
      'alt',
      ...(e.tagName === 'meta' ? ['content'] : []),
    ])
      if ($(e).attr(key)) add($(e).attr(key));
  });
}
export function collectStrings() {
  const all = new Set(),
    runtime = new Set();
  const add = (s) => {
    s = normalize(s);
    if (s && hasVietnamese(s)) all.add(s);
  };
  const dynamic = (s) => {
    s = normalize(s);
    if (s && hasVietnamese(s)) {
      all.add(s);
      runtime.add(s);
    }
  };
  for (const f of walk(path.join(site, 'dist')).filter(
    (f) => f.endsWith('.html') && !f.includes('/en/'),
  ))
    collectHTML(fs.readFileSync(f, 'utf8'), add);
  for (const f of [
    ...walk(path.join(site, 'src/components')),
    ...['study.ts', 'scenarios.ts', 'models.ts'].map((name) => path.join(site, 'src/lib', name)),
    ...walk(path.join(site, 'public/course-labs')),
  ].filter((f) => /\.(tsx?|js)$/.test(f))) {
    const source = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isJsxText(node)
      ) {
        dynamic(node.text);
        if (node.text.includes('<')) collectHTML(node.text, dynamic);
      }
      if (ts.isTemplateExpression(node)) {
        let template = node.head.text;
        node.templateSpans.forEach((span, i) => {
          template += `__ITB_VAR_${i}__` + span.literal.text;
        });
        dynamic(template);
        if (template.includes('<')) collectHTML(template, dynamic);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const f of walk(path.join(site, 'src/content/topics')).filter((f) => f.endsWith('.json'))) {
    const t = JSON.parse(fs.readFileSync(f, 'utf8'));
    dynamic(t.title);
    for (const n of t.notes) dynamic(n.title);
    for (const q of t.questions)
      for (const k of ['question', 'answer', 'explanation', 'followUp', 'level']) dynamic(q[k]);
  }
  for (const file of walk(path.join(site, 'src/content/courses')).filter((f) =>
    f.endsWith('.json'),
  )) {
    const c = JSON.parse(fs.readFileSync(file, 'utf8'));
    dynamic(c.title);
    dynamic(c.trackTitle);
  }
  for (const line of fs
    .readFileSync(path.join(site, 'public/examples/sql-lab.sql'), 'utf8')
    .split('\n')) {
    const match = line.match(/^\s*--\s*(.*)/);
    if (match) add(match[1]);
  }
  return { all, runtime };
}
export const readCache = () => ({
  ...(fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {}),
  ...JSON.parse(fs.readFileSync(path.join(site, 'src/i18n/en-overrides.json'), 'utf8')),
});
