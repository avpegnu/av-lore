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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/episodes/ep-youtube/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const timeline = page.locator('.build-timeline');
    await ready(timeline);
    const stages = timeline.locator(':scope>ol>li>button');
    assert.equal(await stages.count(), 13);
    for (let i = 0; i < 13; i++) {
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
    const labs = page.locator('.creator-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) await ready(lab);
    const retrieval = labs.nth(0),
      codec = labs.nth(1),
      prefetch = labs.nth(2);
    assert.equal(await retrieval.locator('dd').first().textContent(), '75%');
    assert.equal(
      await retrieval
        .locator('.creator-recommendations')
        .innerText()
        .then((s) => s.includes('v03')),
      false,
    );
    await retrieval.locator('input[type=checkbox]').uncheck();
    assert.equal(await retrieval.locator('dd').first().textContent(), '0%');
    await rangeTo(retrieval.locator('input[type=range]').first(), 16);
    await rangeTo(retrieval.locator('input[type=range]').nth(1), 1);
    assert.equal(await retrieval.locator('dd').first().textContent(), '100%');
    assert.equal(await retrieval.locator('dd').nth(3).textContent(), 'NO');
    await rangeTo(retrieval.locator('input[type=range]').nth(1), 8);
    assert.equal(await retrieval.locator('dd').nth(3).textContent(), 'YES');
    await rangeTo(retrieval.locator('input[type=range]').first(), 6);
    await rangeTo(retrieval.locator('input[type=range]').nth(1), 2);
    await retrieval.locator('input[type=checkbox]').check();
    assert.deepEqual(await codec.locator('dd').allTextContents(), [
      '20,000',
      '450.00',
      '$15.00',
      '$3.00',
      '16,667',
    ]);
    await rangeTo(codec.locator('input[type=range]').nth(1), 50);
    assert.equal(await codec.locator('dd').nth(3).textContent(), '$-6.00');
    await rangeTo(codec.locator('input[type=range]').nth(1), 0);
    assert.equal(await codec.locator('dd').nth(4).textContent(), 'NONE');
    await rangeTo(codec.locator('input[type=range]').nth(1), 100);
    await rangeTo(codec.locator('input[type=range]').nth(5), 12);
    assert.equal(await codec.locator('dd').nth(3).textContent(), '$-30.00');
    await rangeTo(codec.locator('input[type=range]').nth(5), 1);
    assert.deepEqual(await prefetch.locator('dd').allTextContents(), [
      '2.0 Mbps',
      '1',
      '80 ms',
      '0.500 / 0.300',
      '0.200',
    ]);
    await rangeTo(prefetch.locator('input[type=range]').nth(1), 5);
    assert.equal(await prefetch.locator('dd').nth(2).textContent(), '830 ms');
    assert.equal(await prefetch.locator('dd').nth(4).textContent(), '0.500');
    await rangeTo(prefetch.locator('input[type=range]').nth(1), 1);
    await rangeTo(prefetch.locator('input[type=range]').nth(4), 0.5);
    assert.equal(await prefetch.locator('dd').nth(4).textContent(), '0.425');
    await rangeTo(prefetch.locator('input[type=range]').first(), 0);
    assert.equal(await prefetch.locator('dd').nth(3).textContent(), '0.000 / 0.000');
    await rangeTo(prefetch.locator('input[type=range]').first(), 3);
    await rangeTo(prefetch.locator('input[type=range]').nth(2), 1);
    assert.equal(await prefetch.locator('dd').first().textContent(), '0.0 Mbps');
    await rangeTo(prefetch.locator('input[type=range]').nth(2), 3.2);
    await rangeTo(prefetch.locator('input[type=range]').nth(4), 2);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.creator-playground,.build-stage')].some((el) =>
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
            '.creator-playground .worksheet-results>div,.creator-funnel>article,.creator-prefixes>article,.creator-recommendations>article,.checkout-claims p,.build-decisions>section',
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
        await page.screenshot({ path: `artifacts/creator-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/creator-${locale}-${i}-results-${width}.png` });
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
    'artifacts/creator-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Creator Video: 13 stages, evidence-based retrieval recall, compatible-view codec payback and constrained prefix prefetch; VI/EN, keyboard, mobile and nine themes passed.',
);
