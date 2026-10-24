import { chromium, expect } from '@playwright/test';
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
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) {
      await lab.scrollIntoViewIfNeeded();
      await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
        if (el.dataset.uiReady === 'true') return;
        await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    const replay = labs.first(),
      stage = replay.locator('input[type=range]'),
      guard = replay.locator('input[type=checkbox]').first(),
      correction = replay.locator('input[type=checkbox]').last(),
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
    await correction.check();
    await stage.focus();
    await page.keyboard.press('End');
    await expect(replay.locator('dd').first()).toHaveText('100');
    await expect(replay.locator('dd').nth(1)).toHaveText('100');
    await guard.uncheck();
    await expect(replay.locator('dd').first()).toHaveText('140');
    await correction.uncheck();
    await expect(stage).toHaveValue('6');
    await expect(replay.locator('dd').first()).toHaveText('190');
    await guard.check();
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
    const sharding = labs.nth(1),
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
    const cut = labs.last(),
      fields = cut.locator('fieldset'),
      cutModes = fields.nth(2).locator('button');
    await expect(cut.locator('dd')).toHaveText(['3', '5', 'No', 'No / No']);
    assert.deepEqual(await cut.locator('.board-cut-window strong').allTextContents(), [
      'F',
      'A',
      'C',
    ]);
    await cutModes.nth(1).click();
    await expect(cut.locator('dd')).toHaveText(['3', '5', 'No', 'No / No']);
    await cutModes.nth(2).click();
    await expect(cut.locator('dd')).toHaveText(['3', '5', 'Yes', 'Yes / No']);
    await cutModes.nth(3).click();
    await expect(cut.locator('dd')).toHaveText(['5', '5', 'Yes', 'No / Yes']);
    assert.deepEqual(await cut.locator('.board-cut-window strong').allTextContents(), [
      'C',
      'B',
      'D',
    ]);
    await fields.nth(1).locator('button').last().click();
    await cutModes.first().click();
    await expect(cut.locator('dd')).toHaveText(['3', '3', 'Yes', 'Yes / Yes']);
    await fields.nth(1).locator('button').nth(1).click();
    await expect(cut.locator('dd')).toHaveText(['3', '1', 'No', 'No / No']);
    await cutModes.last().click();
    const radius = cut.locator('input[type=range]');
    await radius.focus();
    await page.keyboard.press('Home');
    assert.deepEqual(await cut.locator('.board-cut-window strong').allTextContents(), ['B']);
    await radius.focus();
    await page.keyboard.press('End');
    assert.equal(await cut.locator('.board-cut-window li').count(), 3);
    await fields.first().locator('button').last().click();
    await expect(cut.locator('dd').nth(2)).toHaveText('Yes');
    await fields.first().locator('button').nth(1).click();
    await fields.nth(1).locator('button').first().click();
    await cutModes.first().click();
    await radius.focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await expect(cut.locator('dd')).toHaveText(['3', '5', 'No', 'No / No']);
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
        await page.screenshot({ path: `artifacts/leaderboard-${locale}-${i}-${width}.png` });
      }
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
  'Leaderboard: versioned score/correction replay, tie policies, shard merges/partial ranks, mixed/atomic read views, both locales, mobile and eighteen theme/locale accessibility passed.',
);
