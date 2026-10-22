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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/ad-clicks/');
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
    const windows = labs.first(),
      ranges = windows.locator('input[type=range]');
    assert.deepEqual(await windows.locator('dd').allTextContents(), [
      '120',
      '1',
      '2',
      '1',
      '7 / 8',
    ]);
    assert.deepEqual(await windows.locator('.click-windows strong').allTextContents(), [
      '3',
      '2',
      '2',
    ]);
    await ranges.nth(1).focus();
    await page.keyboard.press('End');
    assert.equal(await windows.locator('dd').nth(3).textContent(), '0');
    await ranges.nth(1).focus();
    await page.keyboard.press('Home');
    await ranges.last().focus();
    await page.keyboard.press('Home');
    assert.equal(await windows.locator('dd').nth(3).textContent(), '3');
    await ranges.last().focus();
    await page.keyboard.press('End');
    assert.equal(await windows.locator('dd').last().textContent(), '8 / 8');
    await ranges.first().focus();
    await page.keyboard.press('Home');
    assert.equal(await windows.locator('dd').first().textContent(), '—');
    assert.equal(await windows.locator('.click-windows section').count(), 0);
    await ranges.first().focus();
    await page.keyboard.press('End');
    await ranges.nth(1).focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await ranges.last().focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await windows.locator('summary').click();
    assert.equal(await windows.locator('svg .click-event').count(), 9);
    const sink = labs.last(),
      count = sink.locator('input[type=range]'),
      policies = sink.locator('button');
    assert.deepEqual(await sink.locator('dd').allTextContents(), ['4', '4', '2 / 1', '2', '0']);
    await policies.nth(1).click();
    assert.equal(await sink.locator('dd').first().textContent(), '3');
    await policies.first().click();
    assert.equal(await sink.locator('dd').first().textContent(), '14');
    await count.focus();
    await page.keyboard.press('End');
    assert.equal(await sink.locator('dd').first().textContent(), '18');
    await policies.last().click();
    assert.deepEqual(await sink.locator('dd').allTextContents(), ['4', '4', '2 / 1', '2', '1']);
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
        await page.screenshot({ path: `artifacts/ad-clicks-${locale}-${i}-${width}.png` });
      }
      await windows.locator('.click-timeline').evaluate((el) => {
        el.scrollLeft = 0;
        el.scrollIntoView({ block: 'start' });
      });
      await page.evaluate(() => window.scrollBy(0, -100));
      await page.screenshot({ path: `artifacts/ad-clicks-${locale}-timeline-${width}.png` });
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
    'artifacts/ad-clicks-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Ad Clicks: event-time windows, watermark lag, lateness/side output, stable dedup, absolute sink revisions/authority, both locales, mobile and nine theme accessibility passed.',
);
