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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/episodes/ep-spotify/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const timeline = page.locator('.build-timeline');
    await ready(timeline);
    const stages = timeline.locator(':scope>ol>li>button');
    assert.equal(await stages.count(), 11);
    for (let i = 0; i < 11; i++) {
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
    const labs = page.locator('.audio-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) await ready(lab);
    const startup = labs.nth(0),
      playlist = labs.nth(1),
      events = labs.nth(2);
    assert.equal(await startup.locator('dd').nth(1).textContent(), '484 ms');
    const t = startup.locator('input[type=checkbox]');
    await t.nth(5).uncheck();
    assert.equal(await startup.locator('dd').nth(1).textContent(), '584 ms');
    await t.nth(5).check();
    for (const i of [0, 1, 2, 3]) await t.nth(i).check();
    assert.equal(await startup.locator('dd').nth(1).textContent(), '20 ms');
    await t.nth(2).uncheck();
    assert.equal(await startup.locator('dd').nth(1).textContent(), '120 ms');
    await t.nth(7).uncheck();
    assert.equal(await startup.locator('dd').first().textContent(), 'DENIED');
    assert.equal(await startup.locator('svg').count(), 0);
    await t.nth(7).check();
    await t.nth(4).uncheck();
    assert.equal(await startup.locator('dd').nth(3).textContent(), '40 KB');
    await t.nth(6).check();
    assert.equal(await startup.locator('dd').nth(3).textContent(), '6 KB');
    await t.nth(4).check();
    assert.equal(await playlist.locator('dd').nth(3).textContent(), 'X0 · A · B · Y · C');
    await playlist.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await playlist.locator('dd').nth(1).textContent(), 'YES');
    await playlist.locator('input[type=checkbox]').first().check();
    await playlist.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await playlist.locator('dd').nth(3).textContent(), 'X0 · A · Y · C');
    await playlist.locator('input[type=checkbox]').nth(2).uncheck();
    assert.equal(await playlist.locator('dd').first().textContent(), 'RESYNC_REQUIRED');
    await playlist.locator('input[type=checkbox]').nth(2).check();
    assert.equal(await playlist.locator('dd').nth(2).textContent(), '1');
    assert.equal(
      await playlist.locator('.audio-playlist-entries strong').filter({ hasText: /^Y$/ }).count(),
      1,
    );
    await playlist.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await events.locator('dd').first().textContent(), '2');
    assert.equal(await events.locator('dd').nth(1).textContent(), '1');
    assert.equal(await events.locator('dd').nth(3).textContent(), '2');
    assert.equal(await events.locator('dd').nth(6).textContent(), '3');
    const ev = events.locator('input[type=checkbox]');
    await ev.nth(1).uncheck();
    assert.equal(await events.locator('dd').nth(6).textContent(), '4');
    await ev.nth(1).check();
    await ev.first().uncheck();
    assert.equal(await events.locator('dd').nth(6).textContent(), '3');
    await ev.first().check();
    await ev.nth(2).uncheck();
    assert.equal(await events.locator('dd').nth(6).textContent(), '5');
    await ev.nth(2).check();
    await ev.nth(3).uncheck();
    assert.equal(await events.locator('dd').nth(2).textContent(), '1');
    assert.equal(await events.locator('dd').nth(6).textContent(), '2');
    await ev.nth(3).check();
    await rangeTo(events.locator('input[type=range]').nth(1), 45);
    assert.equal(await events.locator('dd').nth(6).textContent(), '2');
    await rangeTo(events.locator('input[type=range]').nth(1), 30);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.audio-playground,.build-stage')].some((el) =>
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
            '.audio-playground .worksheet-results>div,.audio-playlist-entries>li,.checkout-claims p,.build-decisions>section',
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
        await page.screenshot({ path: `artifacts/audio-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/audio-${locale}-${i}-results-${width}.png` });
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
    'artifacts/audio-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Audio Platform: 11 stages, startup dependency/capability gates, offline playlist anchors/replay, event-vs-play dedup and closed-report adjustments; VI/EN, keyboard, mobile and nine themes passed.',
);
