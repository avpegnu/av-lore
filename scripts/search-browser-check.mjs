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
  async function rangeTo(el, n) {
    await el.focus();
    await page.keyboard.press('Home');
    const min = Number((await el.getAttribute('min')) || 0),
      step = Number((await el.getAttribute('step')) || 1),
      steps = Math.round((n - min) / step);
    for (let i = 0; i < steps; i++) await page.keyboard.press('ArrowRight');
    assert.equal(Number(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/search-engine/',
    );
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.search-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) {
      await lab.scrollIntoViewIfNeeded();
      await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
        if (el.dataset.uiReady === 'true') return;
        await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    const index = labs.nth(0),
      fresh = labs.nth(1),
      fan = labs.nth(2),
      ids = () => index.locator('.worksheet-results dd').last().textContent();
    assert.equal(await ids(), 'd5, d1');
    await index.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await ids(), 'd5');
    await index.locator('input[type=checkbox]').nth(1).check();
    await rangeTo(index.locator('input[type=range]'), 0);
    assert.ok((await ids()).startsWith('d1'));
    await rangeTo(index.locator('input[type=range]'), 0.75);
    await index.locator('input[type=text]').fill('missing');
    assert.equal(await index.locator('.search-results article').count(), 0);
    await index.locator('input[type=text]').fill('cache queue');
    assert.equal(await index.locator('.search-results article').count(), 0);
    await index.locator('input[type=checkbox]').first().uncheck();
    assert.ok((await ids()).includes('d3'));
    await index.locator('input[type=checkbox]').first().check();
    await index.locator('input[type=text]').fill('cache redis');
    await index.locator('.search-results summary').first().click();
    assert.ok(
      (await index.locator('.search-results details').first().getAttribute('open')) !== null,
    );
    assert.equal(await fresh.locator('dd').nth(1).textContent(), '2 / NO');
    await fresh.locator('input[type=checkbox]').uncheck();
    assert.equal(await fresh.locator('dd').nth(1).textContent(), '1 / YES');
    await rangeTo(fresh.locator('input[type=range]'), 5);
    assert.equal(await fresh.locator('dd').nth(3).textContent(), '1');
    await fresh.locator('input[type=checkbox]').check();
    assert.equal(await fresh.locator('dd').nth(3).textContent(), '0');
    assert.equal(await fresh.locator('dd').last().textContent(), '2');
    await rangeTo(fresh.locator('input[type=range]'), 1);
    assert.equal(await fresh.locator('dd').nth(1).textContent(), '1 / YES');
    await rangeTo(fresh.locator('input[type=range]'), 2);
    assert.equal(await fresh.locator('dd').nth(1).textContent(), '2 / NO');
    assert.equal(await fresh.locator('dd').nth(3).textContent(), '1');
    await rangeTo(fresh.locator('input[type=range]'), 4);
    await fresh.locator('input[type=checkbox]').uncheck();
    assert.deepEqual((await fan.locator('dd').allTextContents()).slice(1), [
      'FAILED',
      '0 / 4',
      '80',
      '0',
    ]);
    await fan.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await fan.locator('dd').nth(1).textContent(), 'PARTIAL');
    assert.equal(await fan.locator('dd').nth(2).textContent(), '3 / 4');
    await fan.locator('input[type=checkbox]').first().check();
    assert.deepEqual((await fan.locator('dd').allTextContents()).slice(1), [
      'COMPLETE',
      '4 / 4',
      '75',
      '3',
    ]);
    await rangeTo(fan.locator('input[type=range]').nth(2), 100);
    assert.equal(await fan.locator('dd').last().textContent(), '0');
    assert.equal(await fan.locator('dd').nth(1).textContent(), 'PARTIAL');
    await rangeTo(fan.locator('input[type=range]').nth(2), 30);
    await rangeTo(fan.locator('input[type=range]').first(), 100);
    assert.equal(await fan.locator('dd').first().textContent(), '63.40%');
    await rangeTo(fan.locator('input[type=range]').nth(1), 0);
    assert.equal(await fan.locator('dd').first().textContent(), '0.00%');
    await rangeTo(fan.locator('input[type=range]').nth(1), 1);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.search-playground')].some((el) =>
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
            '.search-postings>section,.search-results>article,.search-playground .worksheet-results>div',
          )
          .evaluateAll((els) =>
            els
              .filter((el) => el.scrollWidth > el.clientWidth + 1)
              .map((el) => el.textContent.slice(0, 90)),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/search-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/search-${locale}-${i}-results-${width}.png` });
      }
    }
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1100 });
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
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/search-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Search: postings/BM25/authorized recall, refresh/delete/version guards, fanout/deadlines/hedge cost; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
