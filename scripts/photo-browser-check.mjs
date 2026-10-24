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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/episodes/ep-instagram/');
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
    await stages.last().focus();
    await page.keyboard.press('Home');
    assert.equal(await stages.first().getAttribute('aria-current'), 'step');
    await page.keyboard.press('ArrowRight');
    assert.equal(await stages.nth(1).getAttribute('aria-current'), 'step');
    const labs = page.locator('.photo-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) await ready(lab);
    const ids = labs.nth(0),
      pub = labs.nth(1),
      stories = labs.nth(2);
    assert.equal(await ids.locator('dd').nth(1).textContent(), '0');
    assert.equal(await ids.locator('dd').nth(2).textContent(), '76');
    await ids.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await ids.locator('dd').nth(1).textContent(), '76');
    await ids.locator('input[type=checkbox]').first().check();
    await ids.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await ids.locator('dd').nth(1).textContent(), '1100');
    await ids.locator('input[type=checkbox]').nth(1).uncheck();
    await ids.locator('input[type=checkbox]').nth(2).check();
    assert.equal(await ids.locator('dd').nth(1).textContent(), '0');
    assert.equal(await ids.locator('dd').nth(7).textContent(), 'NO');
    await rangeTo(ids.locator('input[type=range]').first(), 2);
    assert.equal(await ids.locator('dd').nth(5).textContent(), 'YES');
    await rangeTo(ids.locator('input[type=range]').nth(2), 8);
    assert.ok((await ids.locator('dd').nth(3).textContent()).startsWith('1341 /'));
    assert.equal(await pub.locator('dd').first().textContent(), 'DELETED');
    await pub.locator('input[type=checkbox]').nth(2).uncheck();
    assert.equal(await pub.locator('dd').nth(4).textContent(), 'YES');
    await pub.locator('input[type=checkbox]').nth(2).check();
    await rangeTo(pub.locator('input[type=range]'), 3);
    await pub.locator('input[type=checkbox]').first().check();
    assert.equal(await pub.locator('dd').nth(3).textContent(), 'YES');
    await pub.locator('input[type=checkbox]').first().uncheck();
    await pub.locator('input[type=checkbox]').nth(1).uncheck();
    await rangeTo(pub.locator('input[type=range]'), 4);
    assert.equal(await pub.locator('dd').nth(5).textContent(), 'YES');
    await pub.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await pub.locator('dd').first().textContent(), 'READY');
    assert.equal(await stories.locator('dd').nth(1).textContent(), '3');
    await stories.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await stories.locator('dd').nth(3).textContent(), '1');
    await stories.locator('input[type=checkbox]').nth(1).uncheck();
    await rangeTo(stories.locator('input[type=range]').first(), 24);
    assert.equal(await stories.locator('dd').first().textContent(), '3');
    assert.equal(await stories.locator('dd').nth(1).textContent(), '0');
    await stories.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await stories.locator('dd').nth(2).textContent(), '3');
    await stories.locator('input[type=checkbox]').first().check();
    await stories.locator('input[type=checkbox]').nth(2).uncheck();
    assert.equal(await stories.locator('dd').nth(4).textContent(), '0');
    await stories.locator('input[type=checkbox]').nth(2).check();
    await rangeTo(stories.locator('input[type=range]').first(), 23);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.photo-playground,.build-stage')].some((el) =>
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
            '.photo-playground .worksheet-results>div,.photo-story-cards>article,.build-decisions>section',
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
        await page.screenshot({ path: `artifacts/photo-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/photo-${locale}-${i}-results-${width}.png` });
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
    'artifacts/photo-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Photo Platform: 12 stages, ID overflow/clock/owner/precision guards, publication intent/readiness/deletion races and Story expiry/viewed holes; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
