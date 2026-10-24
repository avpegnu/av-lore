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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/episodes/ep-whatsapp/');
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
    const labs = page.locator('.secure-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) await ready(lab);
    const delivery = labs.nth(0),
      fanout = labs.nth(1),
      membership = labs.nth(2);
    assert.deepEqual(await delivery.locator('dd').allTextContents(), ['—', 'NO', 'NO', '0']);
    await delivery.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await delivery.locator('dd').nth(1).textContent(), 'YES');
    await delivery.locator('input[type=checkbox]').first().check();
    await delivery.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await delivery.locator('dd').nth(2).textContent(), 'YES');
    await delivery.locator('input[type=checkbox]').nth(1).check();
    await delivery.locator('input[type=checkbox]').nth(2).uncheck();
    assert.equal(await delivery.locator('dd').nth(3).textContent(), '1');
    await delivery.locator('input[type=checkbox]').nth(2).check();
    await rangeTo(delivery.locator('input[type=range]'), 0);
    assert.equal(await delivery.locator('dd').first().textContent(), 'D1, D2');
    await rangeTo(delivery.locator('input[type=range]'), 5);
    assert.deepEqual(await fanout.locator('dd').allTextContents(), [
      '0',
      '5',
      '995',
      '100',
      '19,900',
      '20,895',
    ]);
    await rangeTo(fanout.locator('input[type=range]').nth(3), 1);
    assert.deepEqual(await fanout.locator('.secure-upload-bars>section>span').allTextContents(), [
      '995',
      '1,000',
    ]);
    await rangeTo(fanout.locator('input[type=range]').first(), 10);
    await rangeTo(fanout.locator('input[type=range]').nth(2), 8);
    await rangeTo(fanout.locator('input[type=range]').nth(3), 3);
    await rangeTo(fanout.locator('input[type=range]').nth(4), 5);
    assert.equal(await fanout.locator('dd').first().textContent(), '2');
    assert.equal(await fanout.locator('tbody tr').count(), 3);
    assert.equal(await fanout.locator('tbody th').last().textContent(), '3 / 8');
    assert.deepEqual(await membership.locator('dd').allTextContents(), [
      '2 / 2',
      'SENT',
      'NO',
      'YES',
      'YES',
    ]);
    await membership.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await membership.locator('dd').nth(1).textContent(), 'STALE EPOCH');
    await membership.locator('input[type=checkbox]').nth(2).uncheck();
    assert.deepEqual((await membership.locator('dd').allTextContents()).slice(1), [
      'SENT',
      'YES',
      'NO',
      'YES',
    ]);
    await membership.locator('input[type=checkbox]').first().check();
    await membership.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await membership.locator('dd').nth(3).textContent(), 'NO');
    await membership.locator('input[type=checkbox]').nth(1).check();
    await membership.locator('input[type=checkbox]').nth(2).check();
    await rangeTo(membership.locator('input[type=range]'), 0);
    assert.equal(await membership.locator('dd').nth(1).textContent(), 'WAIT');
    await rangeTo(membership.locator('input[type=range]'), 4);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.secure-playground,.build-stage')].some((el) =>
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
            '.secure-playground .worksheet-results>div,.secure-device-cards>article,.checkout-claims p,.build-decisions>section',
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
        await page.screenshot({ path: `artifacts/secure-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/secure-${locale}-${i}-results-${width}.png` });
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
    'artifacts/secure-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Private Messenger: 12 stages, per-device persistence/ACK/replay, active-sender envelope arithmetic and membership/key boundaries; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
