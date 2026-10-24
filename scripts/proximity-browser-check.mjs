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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/proximity/');
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
    const cover = labs.first(),
      ranges = cover.locator(':scope > .worksheet-inputs input[type=range]'),
      center = cover.locator('input[type=checkbox]');
    assert.equal(await cover.locator(':scope > .worksheet-results dd').last().textContent(), '0');
    const all = Number(await cover.locator(':scope > .worksheet-results dd').nth(2).textContent());
    await center.check();
    assert.ok(
      Number(await cover.locator(':scope > .worksheet-results dd').last().textContent()) > 0,
    );
    assert.ok(
      Number(await cover.locator(':scope > .worksheet-results dd').nth(2).textContent()) < all,
    );
    await center.uncheck();
    await ranges.nth(2).focus();
    await page.keyboard.press('End');
    assert.equal(await cover.locator(':scope > .worksheet-results dd').last().textContent(), '0');
    await ranges.last().focus();
    await page.keyboard.press('Home');
    assert.equal(await cover.locator(':scope > .worksheet-results dd').last().textContent(), '0');
    assert.ok(
      Number(await cover.locator(':scope > .worksheet-results dd').first().textContent()) > 9,
    );
    await ranges.first().focus();
    await page.keyboard.press('Home');
    assert.equal(await cover.locator(':scope > .worksheet-results dd').last().textContent(), '0');
    const encoding = cover.locator('.geohash-encoding'),
      precision = encoding.locator('input[type=range]'),
      places = encoding.locator('.geohash-places button'),
      code = encoding.locator('[data-geohash-code]'),
      neighbors = encoding.locator('.geohash-neighbors button');
    assert.equal((await code.textContent()).length, 5);
    assert.equal(await neighbors.count(), 9);
    await places.nth(1).click();
    const meridianCode = await code.textContent(),
      eastCode = await neighbors.nth(5).locator('span').textContent();
    assert.notEqual(meridianCode[0], eastCode[0]);
    await neighbors.nth(5).focus();
    await page.keyboard.press('Enter');
    await expect(code).toHaveText(eastCode);
    await precision.focus();
    await page.keyboard.press('End');
    await expect(code).toHaveText(/^.{8}$/);
    await encoding.locator('summary').click();
    assert.equal(await encoding.locator('tbody tr').count(), 40);
    await precision.focus();
    await page.keyboard.press('Home');
    await expect(code).toHaveText(/^.{1}$/);
    assert.equal(await encoding.locator('tbody tr').count(), 5);
    await places.last().click();
    assert.equal(await encoding.locator('.geohash-neighbors button:disabled').count(), 3);
    await precision.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    await places.nth(2).click();
    const datelineEast = await neighbors.nth(5).locator('span').textContent();
    await neighbors.nth(5).click();
    await expect(code).toHaveText(datelineEast);
    assert.ok((await encoding.locator('.geohash-position').textContent()).includes('-179'));
    await places.first().click();
    await encoding.locator('summary').click();
    const tree = labs.last(),
      settings = tree.locator(
        ':scope > .worksheet-inputs:not(.quad-query-controls) input[type=range]',
      );
    assert.equal(await tree.locator(':scope > .worksheet-results dd').first().textContent(), '12');
    await tree.locator('input[type=checkbox]').check();
    assert.equal(await tree.locator(':scope > .worksheet-results dd').first().textContent(), '28');
    await settings.last().focus();
    await page.keyboard.press('Home');
    assert.deepEqual(await tree.locator(':scope > .worksheet-results dd').allTextContents(), [
      '28',
      '1',
      '0',
      '1',
    ]);
    await settings.last().focus();
    await page.keyboard.press('End');
    assert.equal(await tree.locator(':scope > .worksheet-results dd').nth(2).textContent(), '6');
    await tree.locator('summary').click();
    assert.equal(
      await tree.locator('tbody tr').count(),
      Number(await tree.locator(':scope > .worksheet-results dd').nth(1).textContent()),
    );
    const query = tree.locator('.quad-query-controls input[type=range]');
    const setRange = async (control, value) => {
      await control.focus();
      await page.keyboard.press('Home');
      const min = Number(await control.getAttribute('min')),
        step = Number((await control.getAttribute('step')) || 1);
      for (let i = 0; i < Math.round((value - min) / step); i++)
        await page.keyboard.press('ArrowRight');
      await expect(control).toHaveValue(String(value));
    };
    await setRange(query.first(), 2);
    await setRange(query.nth(1), 8);
    await setRange(query.last(), 0.5);
    await expect(tree.locator('[data-quad-found]')).toHaveText('1');
    assert.equal(await tree.locator('.geo-point[data-match=true]').count(), 1);
    assert.ok(
      Number((await tree.locator('[data-quad-checked]').textContent()).split(' / ')[0]) < 28,
    );
    await setRange(query.first(), 0);
    await setRange(query.nth(1), 0);
    await expect(tree.locator('[data-quad-found]')).toHaveText('0');
    await setRange(query.first(), 5);
    await setRange(query.nth(1), 5);
    await setRange(query.last(), 2);
    await expect(tree.locator('[data-quad-found]')).toHaveText('21');
    await tree.locator('summary').click();
    const explorer = page.locator('.architecture-explorer');
    await explorer.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelector('.architecture-explorer')?.closest('astro-island')?.dataset
          .uiReady === 'true',
    );
    assert.equal(await explorer.locator('.architecture-node').count(), 9);
    assert.equal(
      await explorer
        .locator('.architecture-canvas')
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      false,
    );
    assert.equal(await explorer.locator('[role=tab]').count(), 4);
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
    await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      assert.equal(
        await encoding.locator('[data-geohash-width]').evaluate((el) => {
          const r = document.createRange();
          r.selectNodeContents(el);
          return r.getClientRects().length;
        }),
        1,
        'Angular dimensions must fit on one line at mobile width',
      );
      for (const [name, target] of [
        ['map', explorer],
        ['encoding', encoding],
        ['cells', encoding.locator('.geohash-neighbors')],
        ['quadtree', tree.locator('.geo-map')],
        ['cutover', page.locator('#publication')],
      ]) {
        await target.evaluate((el) =>
          scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' }),
        );
        await page.evaluate(() => document.activeElement?.blur());
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `artifacts/proximity-review-${locale}-${name}-${width}.png`,
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
    await page.setViewportSize({ width: 1500, height: 1100 });
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/proximity-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Proximity: planar coverage/extremes, actual geohash encoding/neighbors/meridian/dateline/poles, quadtree recursive radius pruning/checked points,9nodes/4traces,VIEN/mobile/keyboard18theme accessibility passed.',
);
