import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore',
  key = 'av-lore-daily-review-v1',
  legacyKey = 'it-basic-notes-interview-v1',
  sql = JSON.parse(fs.readFileSync('src/content/topics/sql.json', 'utf8')),
  errors = [],
  report = [];
fs.mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
try {
  for (const locale of ['vi', 'en']) {
    const context = await browser.newContext({
        viewport: { width: 1500, height: 1100 },
        reducedMotion: 'reduce',
      }),
      page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', (e) => errors.push(String(e)));
    const href = base + (locale === 'en' ? '/en' : '') + '/system-design/review/',
      legacy = JSON.stringify({
        bookmarks: ['n/sql/joins'],
        known: ['q/programming/sentinel'],
        review: [`q/sql/${sql.questions[0].id}`],
        last: null,
        session: null,
      });
    await page.goto(base + '/');
    await page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: legacyKey, v: legacy });
    async function ready() {
      const r = page.locator('.daily-review');
      await r.scrollIntoViewIfNeeded();
      await r.locator('xpath=ancestor::astro-island[1]').evaluate(async (i) => {
        if (i.dataset.uiReady === 'true') return;
        await new Promise((r) => i.addEventListener('av-lore:island-ready', r, { once: true }));
      });
      if (locale === 'en')
        await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
      await page.waitForFunction((k) => !!localStorage.getItem(k), key);
      return r;
    }
    await page.goto(href);
    let review = await ready();
    const saved = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key),
      filters = () => review.locator('.recall-settings select'),
      limits = () => review.locator('.recall-settings input'),
      actions = () => review.locator('.recall-actions button');
    const waitCards = (n) =>
      page.waitForFunction(
        ({ k, n }) => Object.keys(JSON.parse(localStorage.getItem(k)).state.cards).length === n,
        { k: key, n },
      );
    await filters().first().selectOption('topic');
    await filters().last().selectOption('sql');
    await limits().first().fill('2');
    await limits().last().fill('2');
    assert.equal(+(await review.locator('dd').first().textContent()), sql.questions.length);
    assert.equal(await review.locator('dd').nth(2).textContent(), '2');
    await actions().first().click();
    const heading = () => review.locator('.recall-card h4');
    await heading().focus();
    await page.keyboard.press('1');
    assert.equal(await review.locator('.recall-answer').count(), 0);
    await page.keyboard.press('Space');
    assert.equal(await review.locator('.recall-grades button').count(), 4);
    await page.keyboard.press('1');
    await waitCards(1);
    let state = (await saved()).state;
    const firstId = Object.keys(state.cards)[0];
    assert.equal(state.cards[firstId].due - state.cards[firstId].last, 600000);
    await page.keyboard.press('u');
    await waitCards(0);
    assert.equal(await review.locator('.recall-answer').count(), 1);
    await page.keyboard.press('3');
    await waitCards(1);
    state = (await saved()).state;
    assert.equal(state.cards[firstId].due - state.cards[firstId].last, 86400000);
    await page.keyboard.press('Space');
    await page.keyboard.press('2');
    await waitCards(2);
    assert.equal(await review.locator('.recall-summary').count(), 1);
    await review.locator('.recall-summary button').click();
    assert.deepEqual((await review.locator('dd').allTextContents()).slice(1), [
      '0',
      '0',
      '2',
      '2',
      '2',
    ]);
    const beforePreview = JSON.stringify((await saved()).state);
    await actions().nth(1).click();
    await heading().focus();
    await page.keyboard.press('Space');
    assert.equal(await review.locator('.recall-grades').count(), 0);
    await review.locator('.recall-session-bar button').last().click();
    assert.equal(JSON.stringify((await saved()).state), beforePreview);
    await review.locator('.worksheet-toggle input').check();
    assert.equal(await review.locator('dd').first().textContent(), '1');
    await review.locator('.worksheet-toggle input').uncheck();
    await filters().first().selectOption('visual');
    await filters().last().selectOption('all');
    await actions().nth(1).click();
    await heading().focus();
    await page.keyboard.press('Space');
    assert.ok((await review.locator('.recall-flow li').count()) >= 2);
    if (locale === 'en')
      assert.ok((await review.locator('.recall-answer>a').getAttribute('href')).includes('/en/'));
    await review.locator('.recall-session-bar button').last().click();
    await filters().first().selectOption('topic');
    await filters().last().selectOption('sql');
    const downloading = page.waitForEvent('download');
    await actions().last().click();
    const download = await downloading;
    await download.saveAs(`artifacts/review-${locale}-backup.json`);
    const exported = JSON.parse(fs.readFileSync(`artifacts/review-${locale}-backup.json`, 'utf8'));
    assert.equal(Object.keys(exported.state.cards).length, 2);
    const file = review.locator('input[type=file]');
    await file.setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{broken'),
    });
    assert.equal(Object.keys((await saved()).state.cards).length, 2);
    const incoming = structuredClone(exported);
    incoming.settings.newLimit = 0;
    incoming.state.undo = [];
    for (const r of Object.values(incoming.state.cards)) {
      r.last = Date.now() - 3 * 86400000;
      r.due = Date.now() - 1000;
    }
    await file.setInputFiles({
      name: 'due.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(incoming)),
    });
    await review.locator('.recall-import-preview').waitFor({ state: 'visible' });
    assert.equal(await review.locator('.recall-import-preview').count(), 1);
    assert.equal(await review.locator('dd').nth(1).textContent(), '0');
    await review.locator('.recall-import-preview button').first().click();
    assert.equal(await review.locator('dd').nth(1).textContent(), '2');
    await page.reload();
    review = await ready();
    assert.equal(await review.locator('dd').nth(1).textContent(), '2');
    assert.equal(await limits().first().inputValue(), '0');
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), legacyKey), legacy);
    // Grading/undo after importing must remain scoped and leave unrelated saved study data intact.
    await actions().first().click();
    await heading().focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('4');
    await page.keyboard.press('u');
    await review.locator('.recall-session-bar button').last().click();
    assert.equal(await review.locator('dd').nth(1).textContent(), '2');
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      await review.scrollIntoViewIfNeeded();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      await page.screenshot({ path: `artifacts/review-${locale}-dashboard-${width}.png` });
      await actions().first().click();
      await heading().focus();
      await page.keyboard.press('Space');
      await page.screenshot({ path: `artifacts/review-${locale}-answer-${width}.png` });
      await review.locator('.recall-session-bar button').last().click();
    }
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          !/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(document.querySelector('.daily-review').innerText),
      );
    await page.setViewportSize({ width: 1500, height: 1100 });
    for (const theme of JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'))) {
      await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
      for (const screen of ['dashboard', 'answer']) {
        if (screen === 'answer') {
          await actions().first().click();
          await heading().focus();
          await page.keyboard.press('Space');
        }
        const a = await new AxeBuilder({ page })
          .include('.rich-handbook')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        report.push({
          locale,
          theme: theme.id,
          screen,
          violations: a.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        });
        if (screen === 'answer') await review.locator('.recall-session-bar button').last().click();
      }
    }
    const other = await context.newPage();
    await other.goto(href);
    await other.locator('.daily-review').scrollIntoViewIfNeeded();
    await other.waitForFunction(
      () =>
        document.querySelector('.daily-review')?.closest('astro-island')?.dataset.uiReady ===
        'true',
    );
    const external = structuredClone(incoming);
    external.settings.newLimit = 7;
    const replacement = JSON.stringify(external);
    await other.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: key, v: replacement });
    await page.waitForFunction(() =>
      document.querySelector('.recall-status').textContent.includes('tab'),
    );
    await limits().first().fill('1');
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), key), replacement);
    await other.close();
    await context.close();
    report.push({ locale, scenarios: 'passed' });
  }
  const context = await browser.newContext(),
    page = await context.newPage();
  await page.goto(base + '/system-design/review/');
  await page.evaluate((k) => localStorage.setItem(k, '{broken'), key);
  await page.reload();
  await page.locator('.daily-review').scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    document.querySelector('.recall-status')?.textContent.includes('JSON'),
  );
  assert.equal(await page.evaluate((k) => localStorage.getItem(k), key), '{broken');
  await context.close();
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/daily-review-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Daily Review: source/topic filters, keyboard reveal/grade/undo, elapsed intervals, no-grade preview, global allowance, scoped due/forecast, reload/import/export, legacy-data preservation, cross-tab/corrupt storage, VI/EN, mobile and nine themes passed.',
);
