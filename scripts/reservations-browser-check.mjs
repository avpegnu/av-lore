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
  for (const locale of ['vi', 'en']) {
    await page.goto(
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/reservations/',
    );
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.handbook-experiment');
    assert.equal(await labs.count(), 2);
    for (const lab of await labs.all()) {
      await lab.scrollIntoViewIfNeeded();
      await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
        if (el.dataset.uiReady === 'true') return;
        await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    const nights = labs.first(),
      atomic = nights.locator('input[type=checkbox]');
    assert.deepEqual(await nights.locator('dd').allTextContents(), ['1', '1', '0', '0']);
    await atomic.uncheck();
    assert.deepEqual(await nights.locator('dd').allTextContents(), ['2', '0', '1', '0']);
    await nights.locator('button').last().click();
    assert.deepEqual(await nights.locator('dd').allTextContents(), ['0', '1', '0', '1']);
    await atomic.check();
    assert.deepEqual(await nights.locator('dd').allTextContents(), ['0', '1', '0', '0']);
    assert.deepEqual(await nights.locator('.booking-nights strong').allTextContents(), ['1', '0']);
    const expiry = labs.last(),
      clock = expiry.locator('input[type=range]'),
      toggles = expiry.locator('input[type=checkbox]');
    assert.deepEqual(await expiry.locator('dd').allTextContents(), ['0', '1', '0', '1', '0']);
    await toggles.last().uncheck();
    assert.deepEqual(await expiry.locator('dd').allTextContents(), ['0', '2', '1', '0', '-1']);
    await toggles.last().check();
    await toggles.first().check();
    assert.deepEqual(await expiry.locator('dd').allTextContents(), ['0', '1', '0', '0', '0']);
    assert.equal(
      await expiry.locator('.payment-facts section').last().locator('strong').textContent(),
      'SOLD_OUT',
    );
    await toggles.first().uncheck();
    await clock.focus();
    await page.keyboard.press('Home');
    assert.equal(
      await expiry.locator('.payment-facts section').first().locator('strong').textContent(),
      'HELD',
    );
    assert.equal(await expiry.locator('.booking-timeline [aria-current=step]').count(), 1);
    await clock.focus();
    await page.keyboard.press('End');
    assert.equal(
      await expiry.locator('.payment-facts section').first().locator('strong').textContent(),
      'EXPIRED',
    );
    assert.equal(await expiry.locator('dd').nth(3).textContent(), '1');
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.handbook-experiment')].some((el) =>
            /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText),
          ),
      );
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      for (let i = 0; i < 2; i++) {
        await labs.nth(i).evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollBy(0, -96));
        await page.screenshot({ path: `artifacts/reservations-${locale}-${i}-${width}.png` });
      }
      await expiry
        .locator('.booking-timeline')
        .evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => window.scrollBy(0, -100));
      await page.screenshot({ path: `artifacts/reservations-${locale}-timeline-${width}.png` });
    }
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1100 });
  }
  for (const theme of JSON.parse(fs.readFileSync('src/lib/themes.json'))) {
    await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
    const result = await new AxeBuilder({ page })
      .include('.rich-handbook')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    report.push({
      theme: theme.id,
      violations: result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    });
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/reservations-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Reservations: whole-stay atomicity, stale-check oversell, partial-night rollback, expired-hold reallocation and late-payment recovery, both locales, mobile and nine theme accessibility passed.',
);
