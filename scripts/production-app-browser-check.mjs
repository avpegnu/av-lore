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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-production/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.production-app-playground');
    assert.equal(await labs.count(), 3);
    for (const el of await labs.all()) await ready(el);
    const stream = labs.nth(0),
      cache = labs.nth(1),
      cost = labs.nth(2);
    assert.deepEqual(await stream.locator('dd').allTextContents(), [
      'PARTIAL_FAILURE',
      '1',
      'FIXTURE_COMPLETE',
    ]);
    assert.ok(
      (await stream.locator('.prod-visible-output').textContent()).includes('Primary answer'),
    );
    await stream.locator('.prod-actions').nth(1).getByRole('button').nth(1).click();
    assert.deepEqual(await stream.locator('dd').allTextContents(), [
      'COMPLETE',
      '2',
      'FIXTURE_COMPLETE',
    ]);
    assert.ok(
      (await stream.locator('.prod-visible-output').textContent()).includes('Fallback answer'),
    );
    assert.ok(
      !(await stream.locator('.prod-visible-output').textContent()).includes('Primary answer'),
    );
    await stream.locator('.prod-actions').nth(1).getByRole('button').last().click();
    assert.equal(await stream.locator('dd').first().textContent(), 'SPLICED_ANSWER');
    assert.ok(
      (await stream.locator('.prod-visible-output').textContent()).includes(
        'Primary answerFallback answer',
      ),
    );
    await stream.locator('.prod-actions').nth(1).getByRole('button').first().click();
    await stream.locator('.prod-actions').first().getByRole('button').nth(2).click();
    assert.equal(await stream.locator('dd').first().textContent(), 'COMPLETE');
    assert.ok(
      (await stream.locator('.prod-timeline').textContent()).includes('TRANSPORT_HEARTBEAT'),
    );
    assert.ok(
      (await stream.locator('.prod-timeline').textContent()).includes('FIRST_CONTENT_TIMEOUT'),
    );
    await stream.locator('input[type=checkbox]').uncheck();
    assert.equal(await stream.locator('dd').first().textContent(), 'NO_QUALIFIED_FALLBACK');
    await stream.locator('input[type=checkbox]').check();
    await stream.locator('.prod-actions').first().getByRole('button').first().click();
    await range(stream.locator('input[type=range]'), 1500);
    assert.deepEqual(await stream.locator('dd').allTextContents(), [
      'CANCEL_REQUESTED',
      '1',
      'UNCONFIRMED',
    ]);
    await range(stream.locator('input[type=range]'), 0);
    await stream.locator('.prod-actions').first().getByRole('button').last().click();
    const flags = cache.locator('input[type=checkbox]');
    assert.equal(await cache.locator('dd').last().textContent(), 'VALID_FIXTURE_HIT');
    await flags.first().uncheck();
    assert.equal(await cache.locator('dd').last().textContent(), 'MISS_OR_BLOCKED');
    await flags.first().check();
    await range(cache.locator('input[type=range]'), 0.95);
    assert.equal(await cache.locator('dd').last().textContent(), 'MISS_OR_BLOCKED');
    await cache.locator('.prod-actions button').nth(1).click();
    assert.equal(await cache.locator('dd').last().textContent(), 'WRONG_INTENT_ANSWER');
    await range(cache.locator('input[type=range]'), 0.9);
    await cache.locator('.prod-actions button').nth(2).click();
    await flags.nth(1).uncheck();
    assert.equal(await cache.locator('dd').last().textContent(), 'MISS_OR_BLOCKED');
    await flags.nth(3).uncheck();
    assert.equal(await cache.locator('dd').last().textContent(), 'UNAUTHORIZED_DISCLOSURE');
    await flags.nth(1).check();
    await flags.nth(3).check();
    await cache.locator('.prod-actions button').nth(3).click();
    assert.equal(await cache.locator('dd').last().textContent(), 'MISS_OR_BLOCKED');
    await flags.nth(2).uncheck();
    assert.equal(await cache.locator('dd').last().textContent(), 'STALE_ANSWER');
    await flags.nth(2).check();
    await cache.locator('.prod-actions button').last().click();
    await flags.nth(3).uncheck();
    assert.equal(await cache.locator('dd').last().textContent(), 'UNAUTHORIZED_DISCLOSURE');
    await flags.nth(3).check();
    await cache.locator('.prod-actions button').first().click();
    const defaults = ['$414.85', '$720.00', '160', '28,800,000'];
    assert.deepEqual(await cost.locator('dd').allTextContents(), defaults);
    await range(cost.locator('input[type=range]').last(), 0);
    assert.equal(await cost.locator('dd').first().textContent(), '$518.53');
    assert.equal(await cost.locator('dd').last().textContent(), '28,800,000');
    await range(cost.locator('input[type=range]').last(), 0.8);
    await range(cost.locator('input[type=range]').nth(1), 1);
    assert.deepEqual(await cost.locator('dd').allTextContents(), ['$0.00', '$720.00', '0', '0']);
    await range(cost.locator('input[type=range]').nth(1), 0.2);
    assert.deepEqual(await cost.locator('dd').allTextContents(), defaults);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.production-app-playground')].some((el) =>
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
            '.production-app-playground .worksheet-results>div,.prod-timeline li,.prod-visible-output,.prod-cache-pair article',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/production-app-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').first().scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/production-app-${locale}-${i}-results-${width}.png`,
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
    'artifacts/production-app-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Production apps: content/restart/cancellation boundaries, exact/semantic identity/ACL/dependency checks and conditional response/prefix cache economics; VI/EN, keyboard, mobile and nine themes passed.',
);
