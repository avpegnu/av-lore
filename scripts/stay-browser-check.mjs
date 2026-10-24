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
    await el.locator('xpath=ancestor::astro-island[1]').evaluate(async (island) => {
      if (island.dataset.uiReady === 'true') return;
      await new Promise((r) => island.addEventListener('av-lore:island-ready', r, { once: true }));
    });
  }
  async function rangeTo(el, n) {
    await el.focus();
    await page.keyboard.press('Home');
    const min = Number((await el.getAttribute('min')) || 0),
      step = Number((await el.getAttribute('step')) || 1);
    for (let i = 0; i < Math.round((n - min) / step); i++) await page.keyboard.press('ArrowRight');
    assert.equal(Number(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/episodes/ep-airbnb/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const timeline = page.locator('.build-timeline');
    await ready(timeline);
    const stages = timeline.locator(':scope>ol>li>button');
    assert.equal(await stages.count(), 11);
    for (let i = 0; i < 11; i++) {
      await stages.nth(i).click();
      assert.equal(await stages.nth(i).getAttribute('aria-current'), 'step');
      assert.equal(await timeline.locator('.build-decisions>section').count(), 4);
      await timeline.locator('.architecture-controls button').nth(1).click();
    }
    await stages.last().focus();
    await page.keyboard.press('Home');
    assert.equal(await stages.first().getAttribute('aria-current'), 'step');
    await page.keyboard.press('ArrowRight');
    assert.equal(await stages.nth(1).getAttribute('aria-current'), 'step');
    const labs = page.locator('.stay-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) await ready(lab);
    const calendar = labs.nth(0),
      quote = labs.nth(1),
      cdc = labs.nth(2);
    assert.equal(await calendar.locator('dd').nth(2).textContent(), '3');
    assert.equal(await calendar.locator('dd').nth(3).textContent(), '1');
    await calendar.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await calendar.locator('dd').nth(3).textContent(), '3');
    await calendar.locator('input[type=checkbox]').first().check();
    await rangeTo(calendar.locator('input[type=range]').first(), 12);
    await rangeTo(calendar.locator('input[type=range]').nth(1), 5);
    assert.equal(await calendar.locator('dd').nth(1).textContent(), 'YES');
    assert.equal(await calendar.locator('dd').nth(3).textContent(), '0');
    assert.equal(await calendar.locator('tbody th').filter({ hasText: 'UNKNOWN' }).count(), 4);
    await calendar.locator('input[type=checkbox]').nth(1).check();
    assert.ok(Number(await calendar.locator('dd').nth(4).textContent()) > 0);
    await rangeTo(calendar.locator('input[type=range]').first(), 14);
    assert.equal(await calendar.locator('dd').nth(4).textContent(), '4');
    await calendar.locator('input[type=checkbox]').nth(1).uncheck();
    await rangeTo(calendar.locator('input[type=range]').first(), 4);
    await rangeTo(calendar.locator('input[type=range]').nth(1), 3);
    assert.equal(await quote.locator('dd').nth(3).textContent(), '$352.00');
    await rangeTo(quote.locator('input[type=range]'), 10);
    assert.equal(await quote.locator('dd').nth(2).textContent(), 'REQUOTE');
    assert.equal(await quote.locator('dd').nth(3).textContent(), '$0.00');
    await quote.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await quote.locator('dd').nth(3).textContent(), '$418.00');
    await quote.locator('input[type=checkbox]').nth(1).uncheck();
    await rangeTo(quote.locator('input[type=range]'), 9);
    await quote.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await quote.locator('dd').nth(2).textContent(), 'REQUOTE');
    await quote.locator('input[type=checkbox]').first().check();
    assert.equal(await cdc.locator('dd').first().textContent(), '4');
    assert.equal(await cdc.locator('dd').nth(2).textContent(), 'BLOCKED');
    await cdc.locator('input[type=checkbox]').nth(2).uncheck();
    await cdc.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await cdc.locator('dd').nth(3).textContent(), 'YES');
    await cdc.locator('input[type=checkbox]').first().check();
    await cdc.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await cdc.locator('dd').first().textContent(), '3');
    assert.equal(await cdc.locator('dd').nth(3).textContent(), 'YES');
    await cdc.locator('input[type=checkbox]').nth(2).check();
    assert.equal(await cdc.locator('dd').nth(2).textContent(), 'UNKNOWN');
    assert.equal(await cdc.locator('dd').nth(4).textContent(), '1');
    await cdc.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await cdc.locator('dd').nth(2).textContent(), 'BLOCKED');
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.stay-playground,.build-stage')].some((el) =>
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
            '.stay-playground .worksheet-results>div,.stay-quote-cards>article,.checkout-claims p,.build-decisions>section',
          )
          .evaluateAll((els) =>
            els
              .filter((el) => el.scrollWidth > el.clientWidth + 1)
              .map((el) => el.textContent.slice(0, 80)),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/stay-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/stay-${locale}-${i}-results-${width}.png` });
      }
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
    'artifacts/stay-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Booking Marketplace: 11 stages, local-night coverage/rules, quote expiry/consent and CDC regressions/gaps; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
