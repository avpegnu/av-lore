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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/file-sync/');
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
    const chunks = labs.first(),
      range = chunks.locator('input[type=range]'),
      choices = chunks.locator('button');
    assert.deepEqual(await chunks.locator('dd').allTextContents(), ['16', '4', '3', '1']);
    await choices.nth(1).click();
    assert.deepEqual(await chunks.locator('dd').allTextContents(), ['17', '17', '0', '5']);
    assert.equal(
      await chunks.locator('.sync-chunk-list').last().locator('li[data-reused=false]').count(),
      5,
    );
    await choices.last().click();
    assert.equal(await chunks.locator('dd').nth(1).textContent(), '4');
    await range.focus();
    await page.keyboard.press('End');
    assert.equal(await chunks.locator('dd').nth(2).textContent(), '2');
    await choices.first().click();
    assert.equal(await chunks.locator('dd').nth(1).textContent(), '8');
    await range.focus();
    await page.keyboard.press('Home');
    assert.equal(await chunks.locator('dd').nth(1).textContent(), '2');
    const conflict = labs.last(),
      stage = conflict.locator('input[type=range]'),
      guard = conflict.locator('input[type=checkbox]');
    assert.deepEqual(await conflict.locator('dd').allTextContents(), ['6', '1', '1', '0']);
    await guard.uncheck();
    assert.deepEqual(await conflict.locator('dd').allTextContents(), ['7', '0', '1', '1']);
    assert.equal(
      await conflict.locator('.sync-file-state section').first().locator('code').textContent(),
      'B edit',
    );
    await guard.check();
    await stage.focus();
    await page.keyboard.press('End');
    assert.deepEqual(await conflict.locator('dd').allTextContents(), ['6', '0', '2', '0']);
    assert.equal(
      await conflict.locator('.sync-file-state section').last().locator('code').textContent(),
      'report (conflicted B).bin',
    );
    await conflict.locator('button').last().click();
    assert.equal(
      await conflict.locator('.sync-file-state section').first().locator('code').textContent(),
      'B edit',
    );
    assert.equal(
      await conflict.locator('.sync-file-state section').last().locator('code').textContent(),
      'report (conflicted A).bin',
    );
    await stage.focus();
    await page.keyboard.press('Home');
    assert.deepEqual(await conflict.locator('dd').allTextContents(), ['5', '0', '1', '0']);
    await stage.fill('3');
    await stage.dispatchEvent('input');
    await stage.dispatchEvent('change');
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
        await page.screenshot({ path: `artifacts/file-sync-${locale}-${i}-${width}.png` });
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
    'artifacts/file-sync-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'File Sync: ordered chunks, unique upload bytes, guarded conflicts, keep-both, both locales, keyboard, mobile and nine theme accessibility passed.',
);
