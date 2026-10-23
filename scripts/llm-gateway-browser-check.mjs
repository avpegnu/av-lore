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
  page.on('request', (r) => {
    if (new URL(r.url()).hostname.endsWith('.test'))
      errors.push('Unexpected fixture network request: ' + r.url());
  });
  async function ready(el) {
    await el.scrollIntoViewIfNeeded();
    await el.locator('xpath=ancestor::astro-island[1]').evaluate(async (i) => {
      if (i.dataset.uiReady === 'true') return;
      await new Promise((r) => i.addEventListener('av-lore:island-ready', r, { once: true }));
    });
  }
  async function range(el, n) {
    await el.focus();
    await page.keyboard.press('Home');
    const min = +(await el.getAttribute('min')),
      step = +(await el.getAttribute('step'));
    for (let i = 0; i < Math.round((n - min) / step); i++) await page.keyboard.press('ArrowRight');
    assert.equal(+(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-case-gateway/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.llm-gateway-playground');
    assert.equal(await labs.count(), 3);
    for (const el of await labs.all()) await ready(el);
    const route = labs.nth(0),
      fail = labs.nth(1),
      account = labs.nth(2);
    const flags = route.locator('input[type=checkbox]'),
      policies = route.locator('.gateway-actions button');
    assert.deepEqual(await route.locator('dd').allTextContents(), [
      'QUALIFIED_FIXTURE_ROUTE',
      'C',
      '1',
    ]);
    await flags.nth(4).uncheck();
    assert.deepEqual(await route.locator('dd').allTextContents(), [
      'QUALIFIED_FIXTURE_ROUTE',
      'C',
      '2',
    ]);
    await policies.last().click();
    assert.equal(await route.locator('dd').nth(1).textContent(), 'B');
    await flags.first().check();
    assert.equal(await route.locator('dd').nth(1).textContent(), 'C');
    await flags.first().uncheck();
    await flags.nth(4).check();
    await flags.nth(5).check();
    assert.deepEqual(await route.locator('dd').allTextContents(), [
      'NO_ELIGIBLE_ROUTE',
      'NONE',
      '0',
    ]);
    await flags.nth(5).uncheck();
    await flags.last().uncheck();
    await policies.first().click();
    assert.deepEqual(await route.locator('dd').allTextContents(), ['POLICY_VIOLATION', 'D', '3']);
    await flags.last().check();
    await flags.nth(2).uncheck();
    await flags.nth(3).uncheck();
    assert.deepEqual(await route.locator('dd').allTextContents(), [
      'QUALIFIED_FIXTURE_ROUTE',
      'D',
      '2',
    ]);
    await flags.nth(2).check();
    await flags.nth(3).check();
    const failureButtons = fail.locator('.gateway-actions button'),
      replay = fail.locator('input[type=checkbox]');
    assert.deepEqual(await fail.locator('dd').allTextContents(), [
      'FALLBACK_SUCCEEDED',
      '2',
      '1050 ms',
      'NO',
    ]);
    await range(fail.locator('input[type=range]').first(), 1000);
    assert.equal(await fail.locator('dd').first().textContent(), 'DEADLINE_EXHAUSTED');
    assert.equal(await fail.locator('dd').nth(1).textContent(), '1');
    await range(fail.locator('input[type=range]').first(), 1500);
    await failureButtons.nth(2).click();
    assert.equal(await fail.locator('dd').last().textContent(), 'YES');
    await replay.uncheck();
    assert.equal(await fail.locator('dd').first().textContent(), 'REPLAY_POLICY_BLOCKED');
    await replay.check();
    await failureButtons.nth(3).click();
    assert.equal(await fail.locator('dd').first().textContent(), 'PARTIAL_STREAM_ERROR');
    await failureButtons.last().click();
    assert.equal(await fail.locator('dd').first().textContent(), 'SIDE_EFFECT_REPLAY_BLOCKED');
    await failureButtons.first().click();
    assert.deepEqual(await fail.locator('dd').allTextContents(), [
      'FALLBACK_SUCCEEDED',
      '2',
      '650 ms',
      'NO',
    ]);
    await failureButtons.nth(1).click();
    const quotaFlags = account.locator('input[type=checkbox]'),
      dedup = account.locator('.gateway-actions button');
    assert.deepEqual(await account.locator('dd').allTextContents(), [
      'SETTLED_FIXTURE',
      '1 / 2',
      '4000',
      '0',
      '2000 / 2000',
      '0',
      '4500',
    ]);
    await quotaFlags.first().uncheck();
    assert.equal(await account.locator('dd').first().textContent(), 'OVER_RESERVED');
    assert.equal(await account.locator('dd').nth(3).textContent(), '1500');
    await quotaFlags.first().check();
    await dedup.nth(1).click();
    assert.equal(await account.locator('dd').nth(4).textContent(), '1200 / 2000');
    assert.equal(await account.locator('dd').first().textContent(), 'LEDGER_MISMATCH');
    await dedup.last().click();
    assert.equal(await account.locator('dd').nth(4).textContent(), '3200 / 2000');
    await dedup.first().click();
    await quotaFlags.last().check();
    assert.deepEqual(await account.locator('dd').allTextContents(), [
      'USAGE_PENDING',
      '1 / 2',
      '4000',
      '0',
      '1200 / 2000',
      '2800',
      '2500',
    ]);
    await quotaFlags.last().uncheck();
    await range(account.locator('input[type=range]').last(), 6000);
    assert.equal(await account.locator('dd').nth(2).textContent(), '6000');
    await range(account.locator('input[type=range]').last(), 4000);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.llm-gateway-playground')].some((el) =>
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
            '.llm-gateway-playground .worksheet-results>div,.gateway-deployments li,.gateway-events li',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/llm-gateway-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').first().scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/llm-gateway-${locale}-${i}-results-${width}.png`,
        });
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
    'artifacts/llm-gateway-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'LLM Gateway: hard route constraints/preferences, deadline/exposure/effect replay boundaries, atomic reservations and per-attempt/pending usage; VI/EN, keyboard, mobile and nine themes passed.',
);
