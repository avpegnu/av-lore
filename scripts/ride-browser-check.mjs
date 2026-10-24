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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/episodes/ep-uber/');
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
    const labs = page.locator('.ride-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) await ready(lab);
    const location = labs.nth(0),
      match = labs.nth(1),
      claims = labs.nth(2);
    assert.equal(await location.locator('dd').first().textContent(), 'C');
    await location.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await location.locator('dd').first().textContent(), 'B');
    await location.locator('input[type=checkbox]').first().check();
    await location.locator('input[type=checkbox]').nth(2).uncheck();
    assert.equal(await location.locator('dd').nth(3).textContent(), '2');
    assert.equal(await location.locator('dd').nth(4).textContent(), '1');
    await rangeTo(location.locator('input[type=range]').nth(1), 30);
    assert.equal(await location.locator('dd').nth(4).textContent(), '0');
    await location.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await location.locator('dd').nth(4).textContent(), '1');
    await location.locator('input[type=checkbox]').nth(1).check();
    await rangeTo(location.locator('input[type=range]').nth(1), 20);
    assert.equal(await match.locator('dd').nth(1).textContent(), '50 s');
    await match.locator('[data-policy=total]').click();
    assert.equal(await match.locator('dd').nth(1).textContent(), '26 s');
    await rangeTo(match.locator('input[type=range]'), 20);
    assert.equal(await match.locator('dd').nth(3).textContent(), '66 s');
    await rangeTo(match.locator('input[type=range]'), 0);
    await match.locator('[data-scenario="1"]').click();
    assert.equal(await match.locator('dd').nth(2).textContent(), '18 s');
    await match.locator('[data-policy=fair]').click();
    assert.equal(await match.locator('dd').nth(2).textContent(), '12 s');
    assert.equal(await match.locator('dd').nth(1).textContent(), '24 s');
    await match.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await match.locator('dd').first().textContent(), '1 / 2');
    await match.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await claims.locator('dd').first().textContent(), '0');
    assert.equal(await claims.locator('dd').nth(1).textContent(), 'D2');
    await claims.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await claims.locator('dd').first().textContent(), '1');
    await claims.locator('input[type=checkbox]').first().check();
    await claims.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await claims.locator('dd').nth(1).textContent(), 'D3');
    assert.equal(await claims.locator('dd').nth(2).textContent(), 'YES');
    await claims.locator('input[type=checkbox]').nth(1).check();
    assert.ok((await claims.locator('tbody').textContent()).includes('REPLAY_ACCEPTED'));
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.ride-playground,.build-stage')].some((el) =>
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
            '.ride-playground .worksheet-results>div,.ride-driver-loads>section,.build-decisions>section',
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
        await page.screenshot({ path: `artifacts/ride-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/ride-${locale}-${i}-results-${width}.png` });
      }
    }
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1100 });
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
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/ride-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Ride-hailing: 12 stages, sequence/TTL/ghost handling, matching/fairness/batch costs, driver/offer acceptance guards; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
