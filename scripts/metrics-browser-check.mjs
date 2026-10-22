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
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/metrics-alerts/',
    );
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.handbook-experiment');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) {
      await lab.scrollIntoViewIfNeeded();
      await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
        if (el.dataset.uiReady === 'true') return;
        await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    const cardinality = labs.nth(0),
      sliders = cardinality.locator('input[type=range]');
    assert.equal(await cardinality.locator('dd').first().textContent(), '2,880');
    assert.equal(await sliders.last().isDisabled(), true);
    await cardinality.locator('input[type=checkbox]').check();
    assert.equal(await cardinality.locator('dd').first().textContent(), '28,800,000');
    await sliders.last().focus();
    await page.keyboard.press('End');
    assert.equal(await cardinality.locator('dd').first().textContent(), '2,880,000,000');
    await sliders.first().focus();
    await page.keyboard.press('Home');
    assert.equal(await cardinality.locator('dd').nth(1).textContent(), '0');
    await sliders.first().focus();
    await page.keyboard.press('End');
    const rollup = labs.nth(1);
    assert.deepEqual(await rollup.locator('dd').allTextContents(), [
      '23',
      '19.13',
      '26.33',
      '50.00',
      '100',
    ]);
    await rollup.locator('input[type=checkbox]').uncheck();
    assert.equal(await rollup.locator('.metrics-extrema').count(), 0);
    assert.equal(await rollup.locator('dd').last().textContent(), '—');
    await rollup.locator('input[type=checkbox]').check();
    await rollup.locator('input[type=range]').focus();
    await page.keyboard.press('Home');
    assert.deepEqual(await rollup.locator('dd').allTextContents(), [
      '23',
      '19.13',
      '19.13',
      '100.00',
      '100',
    ]);
    await rollup.locator('input[type=range]').focus();
    await page.keyboard.press('End');
    await rollup.locator('summary').click();
    assert.equal(await rollup.locator('tbody tr').count(), 3);
    const alert = labs.nth(2),
      controls = alert.locator('input[type=range]');
    assert.deepEqual(await alert.locator('dd').allTextContents(), ['FIRING', '10', '5', '0']);
    await alert.locator('input[type=checkbox]').check();
    assert.deepEqual(await alert.locator('dd').allTextContents(), ['FIRING', '14', '1', '1']);
    await controls.last().focus();
    await page.keyboard.press('End');
    assert.deepEqual(await alert.locator('dd').allTextContents(), ['PENDING', '—', '0', '1']);
    await controls.first().focus();
    await page.keyboard.press('End');
    assert.deepEqual(await alert.locator('dd').allTextContents(), ['INACTIVE', '—', '0', '1']);
    await controls.last().focus();
    await page.keyboard.press('Home');
    assert.equal(await alert.locator('dd').nth(1).textContent(), '2');
    await alert.locator('summary').click();
    assert.equal(await alert.locator('li').count(), 20);
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
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollBy(0, -96));
        await page.screenshot({ path: `artifacts/metrics-${locale}-${i}-${width}.png` });
      }
      for (let i = 1; i < 3; i++) {
        await labs
          .nth(i)
          .locator('.metrics-chart')
          .evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/metrics-${locale}-chart${i}-${width}.png` });
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
    'artifacts/metrics-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Metrics: cardinality/coverage bounds, uneven gauge rollups, extrema retention and elapsed alert duration/no-data replay, both locales, keyboard/mobile and nine theme accessibility passed.',
);
