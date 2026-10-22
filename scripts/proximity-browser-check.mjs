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
      ranges = cover.locator('input[type=range]'),
      center = cover.locator('input[type=checkbox]');
    assert.equal(await cover.locator('dd').last().textContent(), '0');
    const all = Number(await cover.locator('dd').nth(2).textContent());
    await center.check();
    assert.ok(Number(await cover.locator('dd').last().textContent()) > 0);
    assert.ok(Number(await cover.locator('dd').nth(2).textContent()) < all);
    await center.uncheck();
    await ranges.nth(2).focus();
    await page.keyboard.press('End');
    assert.equal(await cover.locator('dd').last().textContent(), '0');
    await ranges.last().focus();
    await page.keyboard.press('Home');
    assert.equal(await cover.locator('dd').last().textContent(), '0');
    assert.ok(Number(await cover.locator('dd').first().textContent()) > 9);
    await ranges.first().focus();
    await page.keyboard.press('Home');
    assert.equal(await cover.locator('dd').last().textContent(), '0');
    const tree = labs.last(),
      settings = tree.locator('input[type=range]');
    assert.equal(await tree.locator('dd').first().textContent(), '12');
    await tree.locator('input[type=checkbox]').check();
    assert.equal(await tree.locator('dd').first().textContent(), '28');
    await settings.last().focus();
    await page.keyboard.press('Home');
    assert.deepEqual(await tree.locator('dd').allTextContents(), ['28', '1', '0', '1']);
    await settings.last().focus();
    await page.keyboard.press('End');
    assert.equal(await tree.locator('dd').nth(2).textContent(), '6');
    await tree.locator('summary').click();
    assert.equal(
      await tree.locator('tbody tr').count(),
      Number(await tree.locator('dd').nth(1).textContent()),
    );
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
        await page.screenshot({ path: `artifacts/proximity-${locale}-${i}-${width}.png` });
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
  'Proximity: conservative cell coverage, boundary false negatives, bounded adaptive quadtrees, both locales, keyboard, mobile and nine theme accessibility passed.',
);
