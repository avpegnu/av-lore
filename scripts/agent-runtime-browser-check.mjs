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
      step = +((await el.getAttribute('step')) || 1);
    assert.ok(Number.isFinite(step) && step > 0);
    for (let i = 0; i < Math.round((n - min) / step); i++) await page.keyboard.press('ArrowRight');
    assert.equal(+(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-agents/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.agent-runtime-playground');
    assert.equal(await labs.count(), 3);
    for (const el of await labs.all()) await ready(el);
    const loop = labs.nth(0),
      effect = labs.nth(1),
      context = labs.nth(2);
    const status = loop.locator('.agent-run-status>strong');
    assert.deepEqual(await loop.locator('dd').allTextContents(), [
      '3',
      '3,920',
      '0',
      'WAIT_APPROVAL',
    ]);
    await loop.locator('.agent-actions').last().getByRole('button').first().click();
    assert.deepEqual(await loop.locator('dd').allTextContents(), ['4', '5,570', '1', 'DONE']);
    await range(loop.locator('input[type=range]').nth(1), 4000);
    assert.equal(await status.textContent(), 'WAIT_APPROVAL');
    await loop.locator('.agent-actions').last().getByRole('button').first().click();
    assert.deepEqual(await loop.locator('dd').allTextContents(), [
      '3',
      '3,920',
      '1',
      'TOKEN_BUDGET',
    ]);
    await range(loop.locator('input[type=range]').nth(1), 8000);
    await loop.locator('.agent-actions').first().getByRole('button').last().click();
    assert.equal(await status.textContent(), 'LOOP_GUARD');
    await loop.locator('.agent-actions').first().getByRole('button').nth(1).click();
    await loop.locator('.agent-actions').last().getByRole('button').first().click();
    assert.equal(await status.textContent(), 'DONE');
    assert.equal(await loop.locator('dd').first().textContent(), '5');
    await loop.locator('.agent-actions').first().getByRole('button').first().click();
    await loop.locator('input[type=checkbox]').uncheck();
    await loop.locator('.agent-actions').last().getByRole('button').first().click();
    assert.equal(await status.textContent(), 'AUTH_BLOCKED');
    await loop.locator('input[type=checkbox]').check();
    await loop.locator('.agent-actions').last().getByRole('button').last().click();
    assert.equal(await status.textContent(), 'REJECTED');
    await range(loop.locator('input[type=range]').first(), 2);
    assert.equal(await status.textContent(), 'STEP_LIMIT');
    await range(loop.locator('input[type=range]').first(), 8);
    assert.equal(await status.textContent(), 'WAIT_APPROVAL');
    const flags = effect.locator('input[type=checkbox]');
    assert.deepEqual(await effect.locator('dd').allTextContents(), ['ONE_EFFECT_CONFIRMED', '1']);
    await flags.first().uncheck();
    assert.deepEqual(await effect.locator('dd').allTextContents(), ['DUPLICATE_EFFECT', '2']);
    await flags.first().check();
    await flags.nth(1).uncheck();
    assert.deepEqual(await effect.locator('dd').allTextContents(), ['DUPLICATE_EFFECT', '2']);
    await flags.nth(1).check();
    await flags.last().check();
    assert.deepEqual(await effect.locator('dd').allTextContents(), [
      'CANCELLED_WITH_PRIOR_EFFECT',
      '1',
    ]);
    await flags.first().uncheck();
    assert.deepEqual(await effect.locator('dd').allTextContents(), ['RECONCILE_REQUIRED', '1']);
    await flags.first().check();
    await flags.last().uncheck();
    for (const i of [2, 3, 4]) {
      await flags.nth(i).uncheck();
      assert.deepEqual(await effect.locator('dd').allTextContents(), ['BLOCKED', '0']);
      await flags.nth(i).check();
    }
    assert.deepEqual(await context.locator('dd').allTextContents(), [
      '9,000',
      '8,400',
      '600',
      'NOT_MODELED',
    ]);
    await range(context.locator('input[type=range]').nth(2), 0);
    assert.deepEqual(await context.locator('dd').allTextContents(), [
      '6,000',
      '6,000',
      '0',
      'NOT_MODELED',
    ]);
    await range(context.locator('input[type=range]').nth(2), 200);
    await range(context.locator('input[type=range]').nth(3), 0);
    assert.deepEqual(await context.locator('dd').allTextContents(), [
      '9,000',
      '6,000',
      '3,000',
      'NOT_MODELED',
    ]);
    await range(context.locator('input[type=range]').nth(3), 3);
    await range(context.locator('input[type=range]').first(), 20);
    assert.deepEqual(await context.locator('dd').allTextContents(), [
      '58,000',
      '30,800',
      '27,200',
      'NOT_MODELED',
    ]);
    await range(context.locator('input[type=range]').first(), 6);
    assert.equal(await context.locator('.agent-context-bars article').count(), 6);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.agent-runtime-playground')].some((el) =>
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
            '.agent-runtime-playground .worksheet-results>div,.agent-event-list li,.agent-run-status,.agent-context-bars article',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/agent-runtime-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').first().scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/agent-runtime-${locale}-${i}-results-${width}.png`,
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
    'artifacts/agent-runtime-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Agents: bounded loop/approval/auth, pre-turn budgets/committed effects, lost-response replay/intent/receipts and input-context inventory; VI/EN, keyboard, mobile and nine themes passed.',
);
