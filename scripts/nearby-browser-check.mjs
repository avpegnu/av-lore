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
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/nearby-friends/',
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
    const fanout = labs.nth(0),
      fRanges = fanout.locator('input[type=range]');
    assert.deepEqual((await fanout.locator('dd').allTextContents()).slice(1, 4), ['40', '8', '40']);
    await fRanges.nth(1).focus();
    await page.keyboard.press('End');
    assert.deepEqual((await fanout.locator('dd').allTextContents()).slice(1, 4), [
      '120',
      '8',
      '120',
    ]);
    assert.equal(await fanout.locator('.nearby-gateways section').count(), 8);
    await fRanges.nth(2).focus();
    await page.keyboard.press('End');
    assert.equal(await fanout.locator('.nearby-gateways section').count(), 40);
    const viewer = labs.nth(1),
      x = viewer.locator('input[type=range]').first(),
      recompute = viewer.locator('input[type=checkbox]');
    assert.deepEqual(await viewer.locator('dd').allTextContents(), ['5', '1', '1', '0', '0']);
    await x.focus();
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    assert.deepEqual(await viewer.locator('dd').allTextContents(), ['5', '1', '1', '0', '0']);
    await recompute.uncheck();
    assert.deepEqual(await viewer.locator('dd').allTextContents(), ['5', '1', '1', '1', '1']);
    assert.equal(await viewer.locator('.nearby-person[data-shown=true]').count(), 1);
    await recompute.check();
    assert.deepEqual(await viewer.locator('dd').allTextContents(), ['5', '1', '1', '0', '0']);
    await viewer.locator('summary').click();
    assert.equal(await viewer.locator('li').count(), 5);
    const recovery = labs.nth(2),
      rClock = recovery.locator('input[type=range]'),
      toggles = recovery.locator('input[type=checkbox]');
    assert.deepEqual(await recovery.locator('dd').allTextContents(), ['1', '0', '0']);
    assert.deepEqual(await recovery.locator('.nearby-state strong').allTextContents(), [
      'DISABLED',
      'VISIBLE',
    ]);
    await toggles.first().uncheck();
    assert.deepEqual(await recovery.locator('dd').allTextContents(), ['0', '1', '0']);
    await rClock.focus();
    await page.keyboard.press('End');
    assert.deepEqual(await recovery.locator('dd').allTextContents(), ['0', '2', '1']);
    assert.equal(await recovery.locator('.nearby-state strong').last().textContent(), 'HIDDEN');
    await toggles.last().uncheck();
    assert.equal(await recovery.locator('.nearby-state strong').last().textContent(), 'VISIBLE');
    await toggles.first().check();
    assert.deepEqual(await recovery.locator('dd').allTextContents(), ['3', '0', '0']);
    await toggles.last().check();
    assert.equal(await recovery.locator('.nearby-state strong').last().textContent(), 'HIDDEN');
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
        await page.screenshot({ path: `artifacts/nearby-${locale}-${i}-${width}.png` });
      }
      await viewer.locator('.nearby-map').evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => window.scrollBy(0, -100));
      await page.screenshot({ path: `artifacts/nearby-${locale}-map-${width}.png` });
      await recovery
        .locator('.nearby-state')
        .evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => window.scrollBy(0, -100));
      await page.screenshot({ path: `artifacts/nearby-${locale}-state-${width}.png` });
    }
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1100 });
    for (const theme of JSON.parse(fs.readFileSync('src/lib/themes.json'))) {
      await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
      const result = await new AxeBuilder({ page })
        .include('.rich-handbook')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      report.push({
        locale,
        theme: theme.id,
        violations: result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      });
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/nearby-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Nearby: exact gateway fanout, authorized audience filtering, viewer movement entries/exits, lost-revoke/epoch guards and independent client expiry, VI/EN/mobile/keyboard and eighteen theme/locale accessibility passed.',
);
