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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-fine-tuning/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.fine-tune-playground');
    assert.equal(await labs.count(), 3);
    for (const el of await labs.all()) await ready(el);
    const plan = labs.nth(0),
      budget = labs.nth(1),
      cost = labs.nth(2);
    const flags = plan.locator('input[type=checkbox]');
    const status = plan.locator('[role=status]>span');
    assert.equal(await status.textContent(), 'NEEDS_EVALS');
    await flags.first().check();
    assert.equal(await status.textContent(), 'CANDIDATE_EXPERIMENT');
    await plan.locator('.tune-actions button').nth(2).click();
    assert.equal(await status.textContent(), 'NEEDS_DATA');
    await flags.nth(1).check();
    assert.equal(await status.textContent(), 'CANDIDATE_EXPERIMENT');
    await plan.locator('.tune-actions button').nth(4).click();
    assert.equal(await status.textContent(), 'NEEDS_TEACHER_EVIDENCE');
    await flags.nth(2).check();
    assert.equal(await status.textContent(), 'CANDIDATE_EXPERIMENT');
    await flags.nth(1).uncheck();
    assert.equal(await status.textContent(), 'NEEDS_DATA');
    await flags.nth(1).check();
    await plan.locator('.tune-actions button').nth(5).click();
    assert.equal(await status.textContent(), 'CANDIDATE_EXPERIMENT');
    await plan.locator('.tune-actions button').first().click();
    for (const flag of await flags.all()) await flag.uncheck();
    assert.deepEqual(await budget.locator('dd').allTextContents(), [
      '6,815,744',
      '13.00 MiB',
      '16',
      'YES',
    ]);
    assert.deepEqual(await budget.locator('tbody tr td:first-of-type').allTextContents(), [
      '127.21 GiB',
      '23.00 GiB',
      '11.94 GiB',
    ]);
    assert.deepEqual(await budget.locator('tbody tr td:last-of-type').allTextContents(), [
      'NO',
      'YES',
      'YES',
    ]);
    await range(budget.locator('input[type=range]').first(), 32);
    assert.equal(await budget.locator('dd').first().textContent(), '13,631,488');
    await range(budget.locator('input[type=range]').first(), 16);
    await budget.locator('input[type=checkbox]').last().uncheck();
    assert.equal(await budget.locator('dd').nth(2).textContent(), '12');
    await budget.locator('input[type=checkbox]').last().check();
    await budget.locator('.tune-actions button').last().click();
    assert.equal(await budget.locator('dd').first().textContent(), '32,768,000');
    await budget.locator('.tune-actions button').first().click();
    await budget.locator('.tune-targets input').nth(0).uncheck();
    await budget.locator('.tune-targets input').nth(2).uncheck();
    assert.deepEqual(await budget.locator('dd').allTextContents(), ['0', '0.00 MiB', '16', 'NO']);
    for (const target of await budget.locator('.tune-targets input').all()) await target.check();
    assert.equal(await budget.locator('dd').first().textContent(), '41,943,040');
    for (const [i, target] of (await budget.locator('.tune-targets input').all()).entries())
      if (i !== 0 && i !== 2) await target.uncheck();
    const defaults = ['$8,100', '8.89 days', '$94,800', '3,000,000'];
    assert.deepEqual(await cost.locator('dd').allTextContents(), defaults);
    await range(cost.locator('input[type=range]').nth(3), 100);
    assert.deepEqual(await cost.locator('dd').allTextContents(), [
      '$-2,700',
      'NONE',
      '$-34,800',
      '3,000,000',
    ]);
    await range(cost.locator('input[type=range]').nth(3), 10);
    await range(cost.locator('input[type=range]').first(), 0);
    assert.deepEqual(await cost.locator('dd').allTextContents(), ['$-300', 'NONE', '$-6,000', '0']);
    await range(cost.locator('input[type=range]').first(), 100);
    assert.deepEqual(await cost.locator('dd').allTextContents(), defaults);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.fine-tune-playground')].some((el) =>
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
            '.fine-tune-playground .worksheet-results>div,.tune-plan-result,.tune-cost-breakdown article',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/fine-tune-${locale}-${i}-${width}.png` });
        await labs
          .nth(i)
          .locator(i === 0 ? '.tune-plan-result' : '.worksheet-results')
          .first()
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/fine-tune-${locale}-${i}-results-${width}.png`,
        });
      }
      await budget.locator('.tune-table').scrollIntoViewIfNeeded();
      await budget.locator('.tune-table').focus();
      await page.keyboard.press('ArrowRight');
      await page.screenshot({ path: `artifacts/fine-tune-${locale}-budget-${width}.png` });
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
    'artifacts/fine-tune-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Fine-tuning: evidence gates, GQA-aware LoRA counts/state budgets and distillation total cost/fallback/break-even; VI/EN, keyboard, mobile and nine themes passed.',
);
