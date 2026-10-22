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
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/maps-routing/',
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
    const tiles = labs.nth(0),
      buttons = tiles.locator('button');
    assert.deepEqual((await tiles.locator('dd').allTextContents()).slice(3), [
      '12',
      '12',
      '0',
      '12',
    ]);
    await buttons.nth(1).click();
    assert.deepEqual((await tiles.locator('dd').allTextContents()).slice(3), [
      '12',
      '3',
      '9',
      '15',
    ]);
    await buttons.nth(2).click();
    assert.deepEqual((await tiles.locator('dd').allTextContents()).slice(3), [
      '12',
      '12',
      '0',
      '27',
    ]);
    await buttons.nth(3).click();
    assert.deepEqual((await tiles.locator('dd').allTextContents()).slice(3), [
      '12',
      '0',
      '12',
      '27',
    ]);
    assert.equal(await tiles.locator('svg').getAttribute('data-style'), 'b');
    const zoom = tiles.locator('input[type=range]').first();
    await zoom.focus();
    await page.keyboard.press('Home');
    assert.equal(await tiles.locator('dd').nth(3).textContent(), '1');
    await zoom.focus();
    await page.keyboard.press('End');
    assert.equal(await tiles.locator('dd').nth(1).textContent(), '5,864,062,014,805');
    await tiles.locator('summary').click();
    assert.equal(await tiles.locator('li').count(), 12);
    const routing = labs.nth(1),
      ranges = routing.locator('input[type=range]');
    assert.equal(await routing.locator('dd').first().textContent(), '7.0');
    assert.equal(await routing.locator('dd').last().textContent(), 'YES');
    await routing.locator('button').first().click();
    assert.equal(await routing.locator('button').first().getAttribute('aria-pressed'), 'true');
    await ranges.first().focus();
    await page.keyboard.press('End');
    assert.ok(Number(await routing.locator('dd').first().textContent()) > 7);
    await routing.locator('input[type=checkbox]').check();
    assert.equal(await routing.locator('dd').last().textContent(), 'YES');
    await ranges.last().focus();
    await page.keyboard.press('Home');
    assert.equal(await routing.locator('.maps-node[data-settled=true]').count(), 0);
    assert.equal(await routing.locator('.maps-path').count(), 0);
    await ranges.last().focus();
    await page.keyboard.press('End');
    assert.ok((await routing.locator('.maps-node[data-settled=true]').count()) > 0);
    assert.ok((await routing.locator('.maps-path').count()) > 0);
    await routing.locator('summary').click();
    const eta = labs.nth(2),
      controls = eta.locator('input[type=range]');
    assert.deepEqual(await eta.locator('dd').allTextContents(), ['20.00', '30.00', '15.00']);
    await controls.first().focus();
    await page.keyboard.press('End');
    assert.deepEqual(await eta.locator('dd').allTextContents(), ['40.00', '15.00', '15.00']);
    await controls.first().focus();
    await page.keyboard.press('Home');
    await controls.nth(1).focus();
    await page.keyboard.press('Home');
    assert.deepEqual(await eta.locator('dd').allTextContents(), ['40.00', '15.00', '15.00']);
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
        await page.screenshot({ path: `artifacts/maps-${locale}-${i}-${width}.png` });
      }
      for (let i = 0; i < 2; i++) {
        await labs
          .nth(i)
          .locator('.maps-chart')
          .evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/maps-${locale}-chart${i}-${width}.png` });
      }
    }
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1100 });
  }
  for (const theme of JSON.parse(fs.readFileSync('src/lib/themes.json'))) {
    await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
    const r = await new AxeBuilder({ page })
      .include('.rich-handbook')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    report.push({
      theme: theme.id,
      violations: r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    });
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/maps-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Maps: viewport reuse, version/style cache identity, bounded pyramid arithmetic, Dijkstra/A* cost agreement, closure/replay and ETA fallback, VI/EN/mobile/keyboard and nine theme accessibility passed.',
);
