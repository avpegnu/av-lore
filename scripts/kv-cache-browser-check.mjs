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
  async function ready(el) {
    await el.scrollIntoViewIfNeeded();
    await el.locator('xpath=ancestor::astro-island[1]').evaluate(async (island) => {
      if (island.dataset.uiReady === 'true') return;
      await new Promise((r) => island.addEventListener('av-lore:island-ready', r, { once: true }));
    });
  }
  async function rangeTo(el, n) {
    await el.focus();
    await page.keyboard.press('Home');
    const min = Number((await el.getAttribute('min')) || 0),
      step = Number((await el.getAttribute('step')) || 1);
    assert.ok(Number.isFinite(step) && step > 0);
    for (let i = 0; i < Math.round((n - min) / step); i++) await page.keyboard.press('ArrowRight');
    assert.equal(Number(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-kv-cache/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.kv-cache-playground');
    assert.equal(await labs.count(), 4);
    for (const lab of await labs.all()) await ready(lab);
    const ranks = labs.nth(0),
      pages = labs.nth(1),
      prefix = labs.nth(2),
      transfer = labs.nth(3);
    assert.deepEqual(await ranks.locator('dd').allTextContents(), [
      '4',
      '1×',
      '320 KiB',
      '1.81 GiB',
      '5',
      'FITS',
    ]);
    await rangeTo(ranks.locator('input[type=range]').nth(1), 2);
    assert.equal(await ranks.locator('dd').last().textContent(), 'OOM');
    await ranks.locator('button').filter({ hasText: 'INT4' }).click();
    assert.equal(await ranks.locator('dd').last().textContent(), 'FITS');
    await ranks.locator('button').filter({ hasText: 'BF16' }).click();
    await rangeTo(ranks.locator('input[type=range]').nth(1), 1);
    await rangeTo(ranks.locator('input[type=range]').first(), 4);
    assert.equal(await ranks.locator('dd').first().textContent(), '1');
    assert.equal(await ranks.locator('dd').nth(1).textContent(), '2×');
    await rangeTo(ranks.locator('input[type=range]').first(), 3);
    assert.equal(await ranks.locator('dd').nth(1).textContent(), '1×');
    await rangeTo(ranks.locator('input[type=range]').first(), 1);
    await ranks.locator('input[type=checkbox]').check();
    assert.equal(await ranks.locator('dd').nth(2).textContent(), '160 KiB');
    await ranks.locator('input[type=checkbox]').uncheck();
    assert.deepEqual(await pages.locator('dd').allTextContents(), [
      '4 / 2',
      '72 / 96',
      '24',
      '18',
      '0',
      '104',
      'NO',
    ]);
    await pages.locator('input[type=checkbox]').nth(1).check();
    assert.deepEqual(await pages.locator('dd').allTextContents(), [
      '3 / 2',
      '72 / 96',
      '16',
      '12',
      '24',
      '72',
      'YES',
    ]);
    await rangeTo(pages.locator('input[type=range]').first(), 2);
    assert.equal(await pages.locator('dd').nth(2).textContent(), '0');
    await rangeTo(pages.locator('input[type=range]').first(), 1);
    await pages.locator('input[type=checkbox]').nth(1).uncheck();
    assert.deepEqual(await prefix.locator('dd').allTextContents(), ['12', '2', 'NO', '3', 'NO']);
    await prefix.locator('input[type=checkbox]').first().check();
    assert.equal(await prefix.locator('dd').first().textContent(), '0');
    await prefix.locator('input[type=checkbox]').nth(3).uncheck();
    assert.equal(await prefix.locator('dd').nth(2).textContent(), 'YES');
    await prefix.locator('input[type=checkbox]').first().uncheck();
    await prefix.locator('input[type=checkbox]').nth(3).check();
    await prefix.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await prefix.locator('dd').first().textContent(), '0');
    await prefix.locator('input[type=checkbox]').nth(1).uncheck();
    await prefix.locator('input[type=checkbox]').nth(2).uncheck();
    assert.equal(await prefix.locator('dd').first().textContent(), '0');
    await prefix.locator('input[type=checkbox]').nth(2).check();
    await rangeTo(prefix.locator('input[type=range]'), 5);
    assert.equal(await prefix.locator('dd').first().textContent(), '4');
    await prefix.locator('input[type=checkbox]').nth(4).uncheck();
    assert.deepEqual((await prefix.locator('dd').allTextContents()).slice(3), ['2', 'YES']);
    await prefix.locator('input[type=checkbox]').nth(4).check();
    assert.deepEqual(await transfer.locator('dd').allTextContents(), [
      '540.9 ms',
      '409.6 ms',
      'NO',
      'YES',
      'RECOMPUTE',
    ]);
    await transfer.locator('input[type=checkbox]').check();
    assert.equal(await transfer.locator('dd').first().textContent(), '270.4 ms');
    assert.equal(await transfer.locator('dd').last().textContent(), 'TRANSFER');
    await rangeTo(transfer.locator('input[type=range]').nth(3), 500);
    assert.equal(await transfer.locator('dd').nth(3).textContent(), 'NO');
    await rangeTo(transfer.locator('input[type=range]').nth(1), 4);
    assert.equal(await transfer.locator('dd').nth(2).textContent(), 'NO');
    await rangeTo(transfer.locator('input[type=range]').nth(1), 16);
    await rangeTo(transfer.locator('input[type=range]').nth(3), 0);
    await transfer.locator('input[type=checkbox]').uncheck();
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.kv-cache-playground,.build-stage')].some((el) =>
            /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText),
          ),
      );
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      assert.deepEqual(
        await page
          .locator(
            '.kv-cache-playground .worksheet-results>div,.kv-page-pool>article,.kv-prefix-blocks>article,.kv-fork-branches>article,.kv-transfer-path>article',
          )
          .evaluateAll((els) =>
            els
              .filter((el) => el.scrollWidth > el.clientWidth + 1)
              .map((el) => el.textContent.slice(0, 80)),
          ),
        [],
      );
      for (let i = 0; i < 4; i++) {
        await labs.nth(i).evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/kv-cache-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/kv-cache-${locale}-${i}-results-${width}.png` });
        if (i === 2) {
          await labs.nth(i).locator('.worksheet-results').last().scrollIntoViewIfNeeded();
          await page.screenshot({ path: `artifacts/kv-cache-${locale}-${i}-fork-${width}.png` });
        }
      }
    }
    for (const theme of JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'))) {
      await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
      const a = await new AxeBuilder({ page })
        .include('.rich-handbook')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      report.push({
        locale,
        theme: theme.id,
        violations: a.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      });
    }
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1100 });
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/kv-cache-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'KV Cache: per-rank replication/memory, future page growth, prefix isolation/copy-on-write and two-direction transfer arithmetic; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
