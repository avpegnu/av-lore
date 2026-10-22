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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/leaderboard/');
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
    const replay = labs.first(),
      stage = replay.locator('input[type=range]'),
      guard = replay.locator('input[type=checkbox]'),
      policies = replay.locator('.worksheet-choices').first().locator('button');
    assert.deepEqual(await replay.locator('dd').allTextContents(), ['130', '130', '1', '3']);
    await guard.uncheck();
    assert.equal(await replay.locator('dd').first().textContent(), '150');
    await stage.focus();
    await page.keyboard.press('End');
    assert.equal(await replay.locator('dd').first().textContent(), '190');
    assert.equal(await replay.locator('dd').nth(1).textContent(), '150');
    await guard.check();
    assert.equal(await replay.locator('dd').first().textContent(), '150');
    assert.equal(await replay.locator('dd').nth(2).textContent(), '3');
    await stage.focus();
    await page.keyboard.press('Home');
    await policies.nth(1).click();
    assert.deepEqual(await replay.locator('.board-rows li > span:first-child').allTextContents(), [
      '#1',
      '#2',
      '#2',
      '#4',
      '#5',
      '#6',
    ]);
    await policies.last().click();
    assert.deepEqual(await replay.locator('.board-rows li > span:first-child').allTextContents(), [
      '#1',
      '#2',
      '#2',
      '#3',
      '#4',
      '#5',
    ]);
    await replay.locator('.worksheet-choices').last().locator('button').last().click();
    assert.equal(await replay.locator('dd').last().textContent(), '5');
    await replay.locator('summary').click();
    const sharding = labs.last(),
      ranges = sharding.locator('input[type=range]');
    assert.equal(
      await sharding.locator('dd').nth(1).textContent(),
      await sharding.locator('dd').nth(2).textContent(),
    );
    await ranges.first().focus();
    await page.keyboard.press('End');
    assert.equal(await sharding.locator('.board-shards section').count(), 5);
    await ranges.last().focus();
    await page.keyboard.press('End');
    await sharding.locator('input[type=checkbox]').check();
    assert.ok(
      Number(await sharding.locator('dd').nth(1).textContent()) <=
        Number(await sharding.locator('dd').nth(2).textContent()),
    );
    assert.equal(
      await sharding.locator('.board-shards section').first().locator('ol li').textContent(),
      '—',
    );
    await sharding.locator('input[type=checkbox]').uncheck();
    await sharding.locator('button').last().click();
    const actual = Number(await sharding.locator('dd').nth(2).textContent()),
      interval = (await sharding.locator('dd').last().textContent()).split('–').map(Number);
    assert.ok(interval[0] <= actual && actual <= interval[1]);
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
        await page.screenshot({ path: `artifacts/leaderboard-${locale}-${i}-${width}.png` });
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
    'artifacts/leaderboard-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Leaderboard: versioned score replay, ordinal/competition/dense ties, coherent shard merges, partial ranks, histogram intervals, both locales, mobile and nine theme accessibility passed.',
);
