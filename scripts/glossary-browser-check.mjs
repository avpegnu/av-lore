import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const entries = fs
  .readdirSync('src/content/glossary')
  .flatMap((f) => JSON.parse(fs.readFileSync('src/content/glossary/' + f, 'utf8')));
const themes = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'));
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const errors = [],
  report = [];
fs.mkdirSync('artifacts', { recursive: true });
try {
  for (const locale of ['vi', 'en']) {
    const context = await browser.newContext({
        viewport: { width: 1500, height: 1100 },
        reducedMotion: 'reduce',
      }),
      page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', (e) => errors.push(String(e)));
    const href = base + (locale === 'en' ? '/en' : '') + '/system-design/glossary/';
    await page.goto(href);
    const tool = page.locator('.glossary-explorer');
    async function ready() {
      await tool.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document.querySelector('.glossary-explorer')?.closest('astro-island')?.dataset.uiReady ===
          'true',
      );
      if (locale === 'en')
        await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    }
    await ready();
    const searchHits = await page.evaluate(
      async ({ prefix, english }) => {
        const pagefind = await import(prefix + (english ? '/en' : '') + '/pagefind/pagefind.js');
        const results = await pagefind.search('PersistentVolumeClaim');
        return await Promise.all(results.results.map(async (hit) => (await hit.data()).url));
      },
      { prefix: new URL(base).pathname.replace(/\/$/, ''), english: locale === 'en' },
    );
    assert.ok(
      searchHits.some((href) => href.includes('/system-design/glossary/')),
      'Global search indexes terms beyond the first visible batch',
    );
    const query = tool.locator('input[type=search]'),
      category = tool.locator('select'),
      rows = tool.locator('.glossary-entry');
    assert.equal(await rows.count(), 40);
    assert.ok(
      (await tool.locator('.glossary-count').textContent()).includes(String(entries.length)),
    );
    assert.equal(
      await page.locator('.glossary-transcript dt').count(),
      entries.length,
      'Full static fallback and search-index coverage',
    );
    await tool.locator('.glossary-more').click();
    assert.equal(await rows.count(), 80);
    await query.fill('time to live');
    assert.equal(await rows.first().getAttribute('id'), 'term-ttl');
    await query.fill('TTL');
    assert.equal(await rows.first().getAttribute('id'), 'term-ttl');
    await rows.first().locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.ok(
      await rows
        .first()
        .locator('details')
        .evaluate((e) => e.open),
    );
    const ttl = entries.find((e) => e.id === 'ttl');
    await page.waitForFunction(
      ({ text }) => document.querySelector('.glossary-entry')?.innerText.includes(text),
      { text: ttl.example[locale] },
    );
    await rows.first().locator('.glossary-permalink').click();
    assert.equal(new URL(page.url()).hash, '#term-ttl');
    await query.fill('khong');
    assert.ok((await rows.count()) > 0, 'Accent-insensitive Vietnamese search in both locales');
    await query.fill('authorization');
    await category.selectOption('cache');
    assert.ok((await rows.count()) > 0);
    assert.ok(
      (await rows.evaluateAll((es) => es.map((e) => e.id))).every(
        (id) => entries.find((e) => 'term-' + e.id === id).category.id === 'cache',
      ),
    );
    await query.fill('<script>');
    assert.equal(await rows.count(), 0);
    assert.equal(await tool.locator('.glossary-empty').count(), 1);
    assert.equal(await tool.locator('script').count(), 0);
    await tool.locator('.glossary-empty button').click();
    assert.equal(await rows.count(), 40);
    const alphabet = tool.locator('.glossary-alphabet');
    await alphabet.getByRole('button', { name: 'T', exact: true }).focus();
    await page.keyboard.press('Space');
    assert.ok(
      (await rows.locator('h5').allTextContents()).every((t) => t.toUpperCase().startsWith('T')),
    );
    await alphabet.getByRole('button', { name: 'A–Z', exact: true }).click();
    await category.selectOption('frontend');
    await query.fill('hydration');
    assert.equal(await rows.first().getAttribute('id'), 'term-frontend-hydration');
    await page.goto(href + '#term-wal');
    await ready();
    const wal = page.locator('#term-wal');
    await wal.waitFor();
    assert.equal(await wal.locator('details').evaluate((e) => e.open), true);
    assert.equal(await category.inputValue(), 'all');
    assert.equal(await query.inputValue(), '');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'term-wal');
    await query.fill('WAL');
    await wal.locator('.glossary-permalink').click();
    assert.equal(
      await wal.locator('details').evaluate((e) => e.open),
      true,
      'Same-hash permalink reopens a filtered entry',
    );
    assert.ok(
      (await wal.locator('.glossary-links a').first().getAttribute('href')).includes(
        locale === 'en' ? '/en/' : '/system-design/',
      ),
    );
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          !/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(
            document.querySelector('.glossary-explorer').innerText,
          ),
      );
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      await tool.scrollIntoViewIfNeeded();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
        'Page overflow ' + locale + '/' + width,
      );
      const overflow = await tool
        .locator('input,select,.glossary-entry,.glossary-controls')
        .evaluateAll((es) =>
          es.filter((e) => e.scrollWidth > e.clientWidth + 2).map((e) => e.className),
        );
      assert.deepEqual(overflow, []);
      await page.screenshot({ path: `artifacts/glossary-${locale}-${width}.png` });
    }
    await page.setViewportSize({ width: 1500, height: 1100 });
    for (const theme of themes) {
      await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
      const a = await new AxeBuilder({ page })
        .include('.rich-handbook')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      report.push({
        locale,
        theme: theme.id,
        violations: a.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      });
    }
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/system-design/review/');
    const review = page.locator('.daily-review');
    await review.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelector('.daily-review')?.closest('astro-island')?.dataset.uiReady ===
        'true',
    );
    await review.locator('.recall-settings select').first().selectOption('term');
    assert.equal(
      Number(await review.locator('dd').first().textContent()),
      entries.length,
      'Review reuses every canonical term',
    );
    await review.locator('.recall-actions button').first().click();
    await review.locator('.recall-card h4').focus();
    await page.keyboard.press('Space');
    const name = await review.locator('.recall-card h4').textContent(),
      entry = entries.find((e) => e.term === name);
    assert.ok(entry);
    await page.waitForFunction(
      ({ example }) => document.querySelector('.recall-answer')?.innerText.includes(example),
      { example: entry.example[locale] },
    );
    assert.ok(
      (await review.locator('.recall-card a').getAttribute('href')).endsWith('#term-' + entry.id),
    );
    await context.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/glossary-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  'Glossary: bilingual search/aliases/ranking/categories/A–Z, pagination, permalink focus/deep links, static completeness, term recall integration, keyboard/mobile and nine themes passed.',
);
