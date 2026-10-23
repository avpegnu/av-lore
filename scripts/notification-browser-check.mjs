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
      viewport: { width: 1500, height: 1000 },
      reducedMotion: 'reduce',
    }),
    page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const locale of ['vi', 'en']) {
    await page.goto(
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/notifications/',
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
    const crash = labs.first(),
      modes = crash.locator('button'),
      boundary = crash.locator('input[type=range]');
    assert.equal(await crash.locator('dd').nth(1).textContent(), '2');
    assert.equal(await crash.locator('dd').nth(2).textContent(), '1');
    await modes.last().click();
    assert.equal(await crash.locator('dd').nth(1).textContent(), '1');
    assert.equal(await crash.locator('dd').first().textContent(), '2');
    await modes.nth(1).click();
    await boundary.focus();
    await page.keyboard.press('Home');
    assert.equal(await crash.locator('dd').last().textContent(), '1');
    await modes.first().click();
    assert.equal(await crash.locator('dd').last().textContent(), '0');
    await boundary.focus();
    await page.keyboard.press('End');
    assert.equal(await crash.locator('dd').first().textContent(), '1');
    const acceptances = [
      [1, 0, 1],
      [2, 1, 1],
      [1, 1, 1],
    ];
    for (let cut = 0; cut <= 2; cut++) {
      await boundary.focus();
      await page.keyboard.press('Home');
      for (let i = 0; i < cut; i++) await page.keyboard.press('ArrowRight');
      for (let mode = 0; mode < 3; mode++) {
        await modes.nth(mode).click();
        assert.equal(
          await crash.locator('dd').nth(1).textContent(),
          String(acceptances[cut][mode]),
        );
        assert.equal(
          await crash.locator('dd').last().textContent(),
          cut === 0 && mode === 1 ? '1' : '0',
        );
      }
    }
    const pipeline = labs.last(),
      metric = pipeline.locator('dd'),
      ranges = pipeline.locator('input[type=range]');
    assert.deepEqual(await metric.allTextContents(), ['2', '6', '8', '8', '4', '0']);
    await ranges.nth(1).focus();
    await page.keyboard.press('End');
    assert.equal(await metric.nth(4).textContent(), '0');
    assert.equal(await metric.last().textContent(), '4');
    await ranges.last().focus();
    await page.keyboard.press('End');
    assert.equal(await metric.nth(4).textContent(), '4');
    assert.equal(await metric.nth(3).textContent(), '16');
    await pipeline.locator('input[type=checkbox]').uncheck();
    assert.equal(await metric.nth(2).textContent(), '0');
    assert.equal(await metric.nth(4).textContent(), '12');
    await pipeline.locator('button').nth(1).click();
    assert.equal(await metric.nth(1).textContent(), '0');
    assert.equal(await metric.nth(4).textContent(), '18');
    for (const choice of await pipeline.locator('button').all())
      await choice.click();
    assert.deepEqual(await metric.allTextContents(), ['2', '18', '0', '0', '0', '0']);
    await pipeline.locator('button').first().click();
    await pipeline.locator('input[type=checkbox]').check();
    await ranges.first().focus();
    await page.keyboard.press('Home');
    await ranges.last().focus();
    await page.keyboard.press('Home');
    assert.deepEqual(await metric.allTextContents(), ['2', '12', '5', '1', '0', '1']);
    await ranges.last().focus();
    await page.keyboard.press('End');
    assert.deepEqual(await metric.allTextContents(), ['2', '12', '5', '4', '1', '0']);
    await ranges.first().focus();
    await page.keyboard.press('End');
    assert.deepEqual(await metric.allTextContents(), ['2', '12', '0', '24', '6', '0']);
    const explorer = page.locator('.architecture-explorer');
    await explorer.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelector('.architecture-explorer')?.closest('astro-island')?.dataset
          .uiReady === 'true',
    );
    assert.equal(await explorer.locator('.architecture-node').count(), 10);
    assert.equal(
      await explorer
        .locator('.architecture-canvas')
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      false,
    );
    assert.equal(await explorer.locator('[role=tab]').count(), 5);
    for (const tab of await explorer.locator('[role=tab]').all()) {
      await tab.click();
      for (const step of await explorer.locator('.architecture-steps button').all()) {
        await step.click();
        assert.equal(await explorer.locator('.architecture-steps [aria-current=step]').count(), 1);
      }
    }
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.handbook-experiment')].some((el) =>
            /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText),
          ),
      );
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      for (let i = 0; i < 2; i++) {
        await labs.nth(i).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/notifications-${locale}-${i}-${width}.png` });
      }
      await page.addStyleTag({ content: '* {scroll-behavior:auto!important}' });
      for (const [name, target] of [
        ['map', explorer],
        ['contracts', page.locator('#reliability')],
        ['evidence', page.locator('#data-model')],
      ]) {
        await target.evaluate((el) =>
          scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' }),
        );
        await page.evaluate(() => document.activeElement?.blur());
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `artifacts/notification-review-${locale}-${name}-${width}.png`,
        });
      }
    }
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
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1000 });
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/notification-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Notifications: all crash-policy boundaries, conditional provider dedup, channel/cap/retry extremes, DLQ, ten-node/five-trace desktop-fit map, VI/EN/mobile/keyboard and18theme accessibility passed.',
);
