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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/episodes/ep-netflix/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const timeline = page.locator('.build-timeline');
    await ready(timeline);
    const stages = timeline.locator(':scope>ol>li>button');
    assert.equal(await stages.count(), 14);
    for (let i = 0; i < 14; i++) {
      await stages.nth(i).click();
      assert.equal(await stages.nth(i).getAttribute('aria-current'), 'step');
      assert.equal(await timeline.locator('.build-decisions>section').count(), 4);
      const explorer = timeline.locator('.architecture-explorer');
      const controlWidth = await explorer
        .locator('.architecture-controls button')
        .first()
        .evaluate((el) => el.getBoundingClientRect().width);
      const explorerWidth = await explorer.evaluate((el) => el.getBoundingClientRect().width);
      assert.ok(
        controlWidth < explorerWidth * 0.6,
        'Stage selector styles must not override embedded diagram controls',
      );
      await explorer.locator('.architecture-node').last().focus();
      await page.keyboard.press('Enter');
      await explorer.locator('.architecture-controls button').nth(1).click();
      assert.ok(
        (await explorer.locator('.architecture-steps button[aria-current=step]').count()) === 1,
      );
    }
    assert.equal(await timeline.locator('.build-navigation button').last().isDisabled(), true);
    await stages.last().focus();
    await page.keyboard.press('Home');
    assert.equal(await stages.first().getAttribute('aria-current'), 'step');
    assert.equal(await timeline.locator('.build-navigation button').first().isDisabled(), true);
    await page.keyboard.press('ArrowRight');
    assert.equal(await stages.nth(1).getAttribute('aria-current'), 'step');
    await timeline.locator('.build-navigation button').last().click();
    assert.equal(await stages.nth(2).getAttribute('aria-current'), 'step');
    await timeline.locator('.build-navigation button').first().click();
    assert.equal(await stages.nth(1).getAttribute('aria-current'), 'step');
    const labs = page.locator('.netflix-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) await ready(lab);
    const q = labs.nth(0),
      fill = labs.nth(1),
      live = labs.nth(2);
    assert.equal(await q.locator('dd').first().textContent(), 'TARGET_MET');
    assert.equal(await q.locator('dd').nth(2).textContent(), '1.98 GB');
    assert.equal(await q.locator('tr[data-selected=true]').count(), 1);
    await q.locator('input[type=checkbox]').check();
    assert.ok((await q.locator('dd').nth(1).textContent()).includes('6 Mbps'));
    await rangeTo(q.locator('input[type=range]').nth(1), 4);
    assert.equal(await q.locator('dd').first().textContent(), 'TARGET_UNMET');
    await q.locator('input[type=checkbox]').uncheck();
    assert.equal(await q.locator('dd').first().textContent(), 'TARGET_MET');
    await q.locator('button[data-cap="720"]').click();
    assert.ok((await q.locator('dd').nth(1).textContent()).startsWith('720p'));
    await q.locator('button[data-cap="480"]').click();
    assert.equal(await q.locator('dd').first().textContent(), 'TARGET_UNMET');
    await q.locator('button[data-cap="1080"]').click();
    await rangeTo(q.locator('input[type=range]').nth(1), 6);
    assert.deepEqual((await fill.locator('dd').allTextContents()).slice(2, 6), [
      'A, D, E',
      '770 GB',
      'B, C',
      '1,000 GB',
    ]);
    await rangeTo(fill.locator('input[type=range]').nth(1), 5);
    await rangeTo(fill.locator('input[type=range]').nth(2), 10);
    assert.equal(await fill.locator('dd').nth(1).textContent(), '0.38 GB');
    assert.equal(await fill.locator('dd').nth(4).textContent(), '—');
    await rangeTo(fill.locator('input[type=range]').nth(1), 50);
    await rangeTo(fill.locator('input[type=range]').nth(2), 60);
    assert.equal(await live.locator('dd').nth(2).textContent(), '3,000,000');
    assert.equal(await live.locator('dd').first().textContent(), '200,000');
    await live.locator('[data-policy=edge]').click();
    assert.equal(await live.locator('dd').nth(2).textContent(), '80');
    await live.locator('[data-policy=shield]').click();
    assert.equal(await live.locator('dd').nth(2).textContent(), '4');
    assert.equal(await live.locator('dd').first().textContent(), '200,000');
    assert.equal(await live.locator('dd').last().textContent(), '2 s');
    await rangeTo(live.locator('input[type=range]').last(), 3);
    assert.equal(await live.locator('dd').last().textContent(), '0 s');
    assert.equal(await live.locator('dd').nth(5).textContent(), '16 s');
    await rangeTo(live.locator('input[type=range]').nth(1), 120);
    assert.equal(await live.locator('dd').nth(1).textContent(), '0');
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.netflix-playground,.build-stage')].some((el) =>
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
          .locator('.build-decisions>section,.netflix-playground .worksheet-results>div')
          .evaluateAll((els) =>
            els
              .filter((el) => el.scrollWidth > el.clientWidth + 1)
              .map((el) => el.textContent.slice(0, 80)),
          ),
        [],
      );
      await stages.nth(10).click();
      await timeline
        .locator('.build-stage')
        .evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => scrollBy(0, -100));
      await page.screenshot({ path: `artifacts/netflix-stage-${locale}-${width}.png` });
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/netflix-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/netflix-${locale}-${i}-results-${width}.png` });
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
  // Shared timeline enhancement must also work with earlier stages lacking the optional panels.
  await page.goto(base + '/en/episodes/ep-chatgpt/');
  await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
  const timeline = page.locator('.build-timeline');
  await ready(timeline);
  const stageButtons = timeline.locator(':scope>ol>li>button');
  await stageButtons.first().focus();
  await page.keyboard.press('End');
  assert.equal(await stageButtons.last().getAttribute('aria-current'), 'step');
  assert.equal(await timeline.locator('.build-decisions>section').count(), 0);
  await page.keyboard.press('Home');
  assert.equal(await stageButtons.first().getAttribute('aria-current'), 'step');
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/netflix-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Netflix: 14 stages, keyboard navigation, quality constraints, whole-file prefill, live control/media/buffer; VI/EN, mobile, nine themes and earlier timeline regression passed.',
);
