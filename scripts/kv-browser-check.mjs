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
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/key-value-store/',
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
    const merkle = labs.last(),
      keys = merkle.locator('.worksheet-choices button'),
      range = merkle.locator('input[type=range]');
    assert.equal(await merkle.locator('dd').last().textContent(), '1');
    await range.focus();
    await page.keyboard.press('End');
    assert.equal(await merkle.locator('dd').nth(2).textContent(), '1');
    await keys.nth(2).click();
    assert.equal(await range.isDisabled(), true);
    assert.deepEqual(await merkle.locator('dd').allTextContents(), ['1', '1', '0', '0']);
    await keys.nth(2).click();
    await keys.nth(5).click();
    await range.focus();
    await page.keyboard.press('End');
    assert.equal(await merkle.locator('dd').nth(2).textContent(), '2');
    for (let i = 0; i < 8; i++)
      if ((await keys.nth(i).getAttribute('aria-pressed')) === 'false') await keys.nth(i).click();
    await range.focus();
    await page.keyboard.press('End');
    assert.deepEqual(await merkle.locator('dd').allTextContents(), ['15', '0', '8', '8']);
    assert.equal(await merkle.locator('.merkle-levels li[data-visited=true]').count(), 15);
    await merkle.locator('summary').click();
    assert.equal(await merkle.locator('details li').count(), 15);
    await merkle.locator('.merkle-scroll').focus();
    await page.keyboard.press('ArrowRight');
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
      await merkle.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => window.scrollBy(0, -96));
      await page.screenshot({ path: `artifacts/kv-${locale}-merkle-${width}.png` });
      const treeRoot = merkle.locator('.merkle-levels ol').first();
      assert.equal(
        await treeRoot.evaluate((el) => el.scrollWidth <= el.closest('.merkle-scroll').clientWidth),
        true,
      );
      await merkle.locator('.merkle-scroll').evaluate((el) => {
        el.scrollLeft = 0;
        el.scrollIntoView({ block: 'start' });
      });
      await page.evaluate(() => window.scrollBy(0, -100));
      await page.screenshot({ path: `artifacts/kv-${locale}-tree-${width}.png` });
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
  fs.writeFileSync('artifacts/kv-browser-report.json', JSON.stringify({ report, errors }, null, 2));
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'KV: symbolic Merkle branch pruning, changed-key location, matching roots, keyboard scrolling, both locales, mobile and nine theme accessibility passed.',
);
