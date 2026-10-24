import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore',
  report = [],
  errors = [];
fs.mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
try {
  const context = await browser.newContext({
      viewport: { width: 1500, height: 1100 },
      reducedMotion: 'reduce',
    }),
    page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  async function ready(el) {
    await el.scrollIntoViewIfNeeded();
    await el.locator('xpath=ancestor::astro-island[1]').evaluate(async (i) => {
      if (i.dataset.uiReady === 'true') return;
      await new Promise((r) => i.addEventListener('av-lore:island-ready', r, { once: true }));
    });
  }
  async function range(el, n) {
    await el.focus();
    await page.keyboard.press('Home');
    const min = +(await el.getAttribute('min')),
      step = +((await el.getAttribute('step')) || 1);
    assert.ok(Number.isFinite(step) && step > 0);
    for (let i = 0; i < Math.round((n - min) / step); i++) await page.keyboard.press('ArrowRight');
    assert.equal(+(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-rag/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.rag-learning-playground');
    assert.equal(await labs.count(), 3);
    for (const el of await labs.all()) await ready(el);
    const ranks = labs.nth(0),
      ivf = labs.nth(1),
      publication = labs.nth(2);
    assert.deepEqual(await ranks.locator('dd').allTextContents(), ['100%', '100%', '100%', '2']);
    await ranks.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await ranks.locator('dd').nth(1).textContent(), '50%');
    await ranks.locator('input[type=checkbox]').nth(1).check();
    await ranks.getByRole('button', { name: 'lexical', exact: true }).click();
    assert.equal(await ranks.locator('dd').first().textContent(), '50%');
    assert.equal(await ranks.locator('dd').nth(1).textContent(), '50%');
    await ranks.getByRole('button', { name: 'hybrid', exact: true }).click();
    await range(ranks.locator('input[type=range]').first(), 1);
    await ranks.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await ranks.locator('dd').last().textContent(), '0');
    await ranks.locator('input[type=checkbox]').first().check();
    assert.equal(await ranks.locator('dd').last().textContent(), '2');
    await range(ranks.locator('input[type=range]').first(), 3);
    const neighbor = ivf.locator('.worksheet-results').first(),
      memory = ivf.locator('.worksheet-results').nth(1);
    assert.deepEqual(await neighbor.locator('dd').allTextContents(), ['50%', '8 / 48', '14', '48']);
    assert.deepEqual(await memory.locator('dd').allTextContents(), [
      '2.868 GiB',
      '0.098 GiB',
      '0.750 MiB',
    ]);
    await range(ivf.locator('input[type=range]').first(), 6);
    assert.deepEqual(await neighbor.locator('dd').allTextContents(), [
      '100%',
      '48 / 48',
      '54',
      '48',
    ]);
    await ivf.locator('input[type=checkbox]').check();
    assert.ok(parseFloat(await memory.locator('dd').nth(1).textContent()) > 2.868);
    await ivf.getByRole('button', { name: 'd=384', exact: true }).click();
    assert.equal(await memory.locator('dd').first().textContent(), '1.438 GiB');
    assert.equal(await memory.locator('dd').last().textContent(), '0.375 MiB');
    await ivf.getByRole('button', { name: 'd=768', exact: true }).click();
    await ivf.locator('input[type=checkbox]').uncheck();
    await range(ivf.locator('input[type=range]').first(), 1);
    assert.deepEqual(await publication.locator('dd').allTextContents(), ['NONE', 'NO', 'NO', 'NO']);
    await publication.locator('input[type=checkbox]').nth(1).uncheck();
    assert.deepEqual(await publication.locator('dd').allTextContents(), ['4', 'NO', 'NO', 'NO']);
    await publication.locator('input[type=checkbox]').nth(2).uncheck();
    assert.deepEqual(await publication.locator('dd').allTextContents(), ['4', 'YES', 'YES', 'YES']);
    await publication.locator('input[type=checkbox]').first().uncheck();
    assert.deepEqual(await publication.locator('dd').allTextContents(), ['4', 'YES', 'YES', 'NO']);
    await publication.locator('input[type=checkbox]').nth(1).check();
    assert.deepEqual(await publication.locator('dd').allTextContents(), ['5', 'YES', 'NO', 'NO']);
    await publication.locator('input[type=checkbox]').nth(3).check();
    assert.equal(await publication.locator('dd').last().textContent(), 'YES');
    await publication.locator('input[type=checkbox]').nth(2).check();
    assert.equal(await publication.locator('dd').nth(1).textContent(), 'NO');
    await publication.locator('input[type=checkbox]').nth(3).uncheck();
    await publication.locator('input[type=checkbox]').first().check();
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.rag-learning-playground')].some((el) =>
            /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText),
          ),
      );
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      assert.deepEqual(
        await page
          .locator(
            '.rag-learning-playground .worksheet-results>div,.rag-ranked-lists article,.rag-publish-events li',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/rag-learning-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').first().scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/rag-learning-${locale}-${i}-results-${width}.png`,
        });
      }
      await ivf.locator('.rag-ivf-scroll').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `artifacts/rag-learning-${locale}-ivf-map-${width}.png` });
      await ivf.locator('.rag-ivf-scroll').focus();
      await page.keyboard.press('ArrowRight');
    }
    for (const theme of JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'))) {
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
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1100 });
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/rag-learning-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'RAG: fixed-list fusion/candidate ceilings/eligibility, actual IVF/exact recall/memory and guarded publication/delete/ACL exposure; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
