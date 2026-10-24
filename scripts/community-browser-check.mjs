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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/episodes/ep-discord/');
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
    const labs = page.locator('.community-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) await ready(lab);
    const reads = labs.nth(0),
      fan = labs.nth(1),
      resume = labs.nth(2);
    assert.equal(await reads.locator('dd').nth(3).textContent(), '0');
    const originalQueries = Number(await reads.locator('dd').first().textContent());
    await reads.locator('input[type=checkbox]').nth(2).uncheck();
    assert.ok(Number(await reads.locator('dd').nth(3).textContent()) > 0);
    assert.ok(Number(await reads.locator('dd').nth(4).textContent()) > 0);
    await reads.locator('input[type=checkbox]').nth(2).check();
    await reads.locator('input[type=checkbox]').first().uncheck();
    assert.ok(Number(await reads.locator('dd').first().textContent()) > originalQueries);
    await reads.locator('input[type=checkbox]').first().check();
    await reads.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await reads.locator('dd').first().textContent(), '12');
    await reads.locator('input[type=checkbox]').nth(1).check();
    await rangeTo(reads.locator('input[type=range]').nth(1), 80);
    assert.equal(await reads.locator('dd').nth(3).textContent(), '0');
    await rangeTo(reads.locator('input[type=range]').nth(1), 40);
    assert.equal(await fan.locator('dd').nth(1).textContent(), '20');
    assert.equal(await fan.locator('dd').nth(2).textContent(), '25,000');
    assert.equal(await fan.locator('dd').nth(6).textContent(), '5,000');
    await rangeTo(fan.locator('input[type=range]').nth(4), 8);
    assert.equal(await fan.locator('dd').nth(6).textContent(), '0');
    assert.equal(await fan.locator('dd').nth(2).textContent(), '25,000');
    await rangeTo(fan.locator('input[type=range]').nth(4), 4);
    await fan.locator('input[type=checkbox]').uncheck();
    assert.equal(await fan.locator('dd').nth(5).textContent(), '25,000');
    await fan.locator('input[type=checkbox]').check();
    await rangeTo(fan.locator('input[type=range]').nth(2), 0);
    assert.equal(await fan.locator('dd').nth(2).textContent(), '0');
    await rangeTo(fan.locator('input[type=range]').nth(2), 10);
    assert.equal(await resume.locator('dd').first().textContent(), 'SNAPSHOT_REQUIRED');
    assert.equal(await resume.locator('dd').nth(4).textContent(), 'm3, m4, m5');
    await rangeTo(resume.locator('input[type=range]').first(), 4);
    assert.equal(await resume.locator('dd').first().textContent(), 'BUFFER');
    await resume.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await resume.locator('dd').nth(1).textContent(), '8');
    assert.equal(await resume.locator('dd').nth(2).textContent(), '1');
    await resume.locator('input[type=checkbox]').nth(1).check();
    await resume.locator('input[type=checkbox]').nth(2).uncheck();
    assert.equal(await resume.locator('dd').nth(3).textContent(), 'YES');
    await resume.locator('input[type=checkbox]').nth(2).check();
    await resume.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await resume.locator('dd').first().textContent(), 'DENIED');
    assert.equal(await resume.locator('.community-messages>article').count(), 0);
    await resume.locator('input[type=checkbox]').first().check();
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.community-playground,.build-stage')].some((el) =>
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
            '.community-playground .worksheet-results>div,.community-relays>section,.build-decisions>section',
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
        await page.screenshot({ path: `artifacts/community-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/community-${locale}-${i}-results-${width}.png` });
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
    'artifacts/community-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Community Chat: 12 stages, authorization-safe coalescing, relay load/gaps, snapshot-live bridge and deletion guards; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
