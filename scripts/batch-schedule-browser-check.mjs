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
    assert.ok(Number.isFinite(step) && step > 0);
    for (let i = 0; i < Math.round((n - min) / step); i++) await page.keyboard.press('ArrowRight');
    assert.equal(Number(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-batching/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.llm-scheduling-playground');
    assert.equal(await labs.count(), 4);
    for (const lab of await labs.all()) await ready(lab);
    const scheduler = labs.nth(0),
      handoff = labs.nth(1),
      mass = labs.nth(2),
      cost = labs.nth(3);
    assert.deepEqual(await scheduler.locator('dd').allTextContents(), [
      '96.0 ms',
      '12.0 ms',
      'YES',
      '8192',
    ]);
    await rangeTo(scheduler.locator('input[type=range]').nth(1), 256);
    assert.equal(await scheduler.locator('dd').first().textContent(), '192.0 ms');
    await scheduler.locator('input[type=checkbox]').first().uncheck();
    assert.deepEqual((await scheduler.locator('dd').allTextContents()).slice(0, 3), [
      '68.0 ms',
      '68.0 ms',
      'NO',
    ]);
    await scheduler.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await scheduler.locator('dd').first().textContent(), 'WAIT');
    assert.equal(await scheduler.locator('dd').last().textContent(), '0');
    await scheduler.locator('input[type=checkbox]').nth(1).uncheck();
    await scheduler.locator('input[type=checkbox]').first().check();
    await rangeTo(scheduler.locator('input[type=range]').nth(1), 1024);
    assert.deepEqual(await handoff.locator('dd').allTextContents(), [
      '136.2 ms',
      '110.0 / 198.2 ms',
      'NO',
      'NO',
    ]);
    await rangeTo(handoff.locator('input[type=range]').nth(1), 128);
    assert.equal(await handoff.locator('dd').last().textContent(), 'YES');
    await rangeTo(handoff.locator('input[type=range]').nth(3), 50);
    assert.equal(await handoff.locator('dd').last().textContent(), 'NO');
    await rangeTo(handoff.locator('input[type=range]').nth(3), 5);
    await rangeTo(handoff.locator('input[type=range]').nth(1), 32);
    assert.deepEqual(await mass.locator('dd').allTextContents(), ['30.0%', '70.0%', '0.0%']);
    await mass.locator('input[type=checkbox]').uncheck();
    assert.equal(await mass.locator('dd').last().textContent(), '8.0%');
    await mass.locator('input[type=checkbox]').check();
    for (const input of await mass.locator('input[type=range]').all()) await rangeTo(input, 0);
    assert.equal(await mass.locator('[role=status]').count(), 1);
    await rangeTo(mass.locator('input[type=range]').first(), 1);
    assert.equal(await mass.locator('dd').last().textContent(), '0.0%');
    await rangeTo(mass.locator('input[type=range]').first(), 6);
    await rangeTo(mass.locator('input[type=range]').nth(1), 3);
    await rangeTo(mass.locator('input[type=range]').nth(2), 1);
    assert.deepEqual(await mass.locator('dd').allTextContents(), ['100.0%', '0.0%', '0.0%']);
    await rangeTo(mass.locator('input[type=range]').first(), 1);
    await rangeTo(mass.locator('input[type=range]').nth(1), 1);
    await rangeTo(mass.locator('input[type=range]').nth(2), 8);
    assert.deepEqual((await cost.locator('dd').allTextContents()).slice(0, 4), [
      '3.362',
      '30.0 ms',
      '2.24×',
      '4 / 8',
    ]);
    await rangeTo(cost.locator('input[type=range]').nth(2), 5);
    await rangeTo(cost.locator('input[type=range]').nth(3), 12);
    assert.equal(await cost.locator('dd').nth(4).textContent(), '0');
    await rangeTo(cost.locator('input[type=range]').nth(4), 8);
    assert.equal(await cost.locator('dd').last().textContent(), 'NO');
    await rangeTo(cost.locator('input[type=range]').nth(1), 0);
    assert.deepEqual((await cost.locator('dd').allTextContents()).slice(0, 4), [
      '1.000',
      '20.0 ms',
      '1.00×',
      '8 / 8',
    ]);
    assert.equal(await cost.locator('dd').last().textContent(), 'YES');
    await rangeTo(cost.locator('input[type=range]').nth(2), 1);
    await rangeTo(cost.locator('input[type=range]').nth(3), 1);
    await rangeTo(cost.locator('input[type=range]').nth(4), 4);
    await rangeTo(cost.locator('input[type=range]').nth(1), 4);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.llm-scheduling-playground,.build-stage')].some((el) =>
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
            '.llm-scheduling-playground .worksheet-results>div,.llm-mass-bars>article,.llm-handoff-stages>article',
          )
          .evaluateAll((els) =>
            els
              .filter((el) => el.scrollWidth > el.clientWidth + 1)
              .map((el) => el.textContent.slice(0, 80)),
          ),
        [],
      );
      for (let i = 0; i < 4; i++) {
        await labs.nth(i).evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/batch-schedule-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').first().scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/batch-schedule-${locale}-${i}-results-${width}.png`,
        });
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
    'artifacts/batch-schedule-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'LLM Scheduling: chunk/gap/starvation, split-pool handoff, exact residual sampling and speculation cost/memory boundaries; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
