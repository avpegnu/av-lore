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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/payments/');
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
    const retry = labs.first(),
      stage = retry.locator('input[type=range]'),
      toggles = retry.locator('input[type=checkbox]'),
      policy = retry.locator('button');
    assert.equal(await retry.locator('.payment-facts strong').last().textContent(), 'UNKNOWN');
    assert.deepEqual(await retry.locator('dd').allTextContents(), ['1', '0', '0', '0']);
    await stage.focus();
    await page.keyboard.press('End');
    assert.deepEqual(await retry.locator('dd').allTextContents(), ['1', '0', '1', '0']);
    assert.equal(await retry.locator('.payment-facts strong').last().textContent(), 'CONFIRMED');
    await toggles.first().uncheck();
    assert.equal(await retry.locator('.payment-facts strong').last().textContent(), 'UNKNOWN');
    assert.equal(await retry.locator('dd').nth(2).textContent(), '0');
    await policy.nth(1).click();
    assert.equal(await retry.locator('dd').first().textContent(), '1');
    await toggles.last().uncheck();
    assert.deepEqual(await retry.locator('dd').allTextContents(), ['2', '1', '0', '1']);
    assert.equal(await retry.locator('.payment-facts strong').last().textContent(), 'UNKNOWN');
    await toggles.last().check();
    await policy.last().click();
    assert.equal(await retry.locator('dd').last().textContent(), '1');
    await stage.focus();
    await page.keyboard.press('Home');
    assert.deepEqual(await retry.locator('dd').allTextContents(), ['0', '0', '0', '0']);
    await page.keyboard.press('End');
    const ledger = labs.last(),
      ranges = ledger.locator('input[type=range]'),
      guard = ledger.locator('input[type=checkbox]');
    assert.deepEqual(await ledger.locator('dd').allTextContents(), [
      '16000',
      '16000',
      '4000',
      '4000',
      '3',
      '0',
    ]);
    await guard.uncheck();
    assert.deepEqual(await ledger.locator('dd').allTextContents(), [
      '39000',
      '39000',
      '21000',
      '4000',
      '0',
      '17000',
    ]);
    await guard.check();
    await ranges.last().focus();
    await page.keyboard.press('End');
    assert.equal(await ledger.locator('dd').nth(2).textContent(), '0');
    assert.equal(await ledger.locator('dd').last().textContent(), '0');
    await ledger.locator('summary').click();
    assert.equal(await ledger.locator('details section').count(), 3);
    assert.equal(await ledger.locator('tbody tr').count(), 6);
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
        await page.screenshot({ path: `artifacts/payments-${locale}-${i}-${width}.png` });
      }
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
    'artifacts/payments-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Payments: unknown outcomes, scoped retries, cross-provider duplicates, balanced posting errors, financial-operation dedup, both locales, mobile and nine theme accessibility passed.',
);
