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
    for (let i = 0; i < Math.round((n - min) / step); i++) await page.keyboard.press('ArrowRight');
    assert.equal(Number(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/episodes/ep-stripe/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const timeline = page.locator('.build-timeline');
    await ready(timeline);
    const stages = timeline.locator(':scope>ol>li>button');
    assert.equal(await stages.count(), 12);
    for (let i = 0; i < 12; i++) {
      await stages.nth(i).click();
      assert.equal(await stages.nth(i).getAttribute('aria-current'), 'step');
      assert.equal(await timeline.locator('.build-decisions>section').count(), 4);
      await timeline.locator('.architecture-controls button').nth(1).click();
    }
    await stages.first().focus();
    await page.keyboard.press('End');
    assert.equal(await stages.last().getAttribute('aria-current'), 'step');
    await page.keyboard.press('Home');
    const labs = page.locator('.platform-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) await ready(lab);
    const processor = labs.nth(0),
      inbox = labs.nth(1),
      migration = labs.nth(2);
    assert.equal(await processor.locator('dd').nth(1).textContent(), 'UNKNOWN');
    await processor.locator('input[type=checkbox]').check();
    assert.equal(await processor.locator('dd').nth(1).textContent(), 'B_ACCEPTED_A_UNKNOWN');
    await rangeTo(processor.locator('input[type=range]'), 5);
    assert.equal(await processor.locator('dd').last().textContent(), '1');
    await processor.locator('input[type=checkbox]').uncheck();
    assert.equal(await processor.locator('dd').last().textContent(), '0');
    await processor.locator('[data-outcome=delayed]').click();
    await rangeTo(processor.locator('input[type=range]'), 4);
    assert.equal(await processor.locator('dd').nth(1).textContent(), 'UNKNOWN');
    await processor.locator('[data-outcome=absent]').click();
    assert.equal(await processor.locator('dd').first().textContent(), 'TERMINAL_ABSENT_AND_FENCED');
    assert.equal(await processor.locator('dd').nth(2).textContent(), '0 / 1');
    await processor.locator('[data-outcome=accepted]').click();
    await rangeTo(processor.locator('input[type=range]'), 3);
    assert.equal(await inbox.locator('dd').nth(1).textContent(), '1');
    await inbox.locator('input[type=checkbox]').nth(2).uncheck();
    assert.equal(await inbox.locator('dd').nth(1).textContent(), '2');
    await rangeTo(inbox.locator('input[type=range]'), 3);
    assert.equal(await inbox.locator('dd').first().textContent(), 'processing');
    await inbox.locator('input[type=checkbox]').nth(2).check();
    assert.equal(await inbox.locator('dd').first().textContent(), 'succeeded');
    await rangeTo(inbox.locator('input[type=range]'), 7);
    assert.equal(await inbox.locator('dd').nth(2).textContent(), '0');
    await inbox.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await inbox.locator('dd').nth(2).textContent(), '3');
    await inbox.locator('input[type=checkbox]').first().check();
    assert.equal(await migration.locator('dd').first().textContent(), 'NEW');
    await migration.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await migration.locator('dd').first().textContent(), 'OLD');
    await migration.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await migration.locator('dd').nth(1).textContent(), '1000');
    assert.equal(await migration.locator('dd').nth(4).textContent(), 'YES');
    await rangeTo(migration.locator('input[type=range]'), 6);
    assert.equal(await migration.locator('dd').nth(3).textContent(), 'FENCED');
    await migration.locator('input[type=checkbox]').nth(2).uncheck();
    assert.equal(await migration.locator('dd').last().textContent(), 'YES');
    await migration.locator('input[type=checkbox]').nth(2).check();
    assert.equal(await migration.locator('dd').last().textContent(), 'NO');
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.platform-playground,.build-stage')].some((el) =>
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
            '.platform-playground .worksheet-results>div,.platform-stores>section,.build-decisions>section',
          )
          .evaluateAll((els) =>
            els
              .filter((el) => el.scrollWidth > el.clientWidth + 1)
              .map((el) => el.textContent.slice(0, 80)),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/platform-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/platform-${locale}-${i}-results-${width}.png` });
      }
    }
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1100 });
  }
  for (const theme of JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'))) {
    await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
    const a = await new AxeBuilder({ page })
      .include('.rich-handbook')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    report.push({
      theme: theme.id,
      violations: a.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    });
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/platform-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Payment Platform: 12 stages, processor evidence, inbox/business dedup and migration/cutover/fencing; VI/EN, keyboard, mobile and nine themes passed.',
);
