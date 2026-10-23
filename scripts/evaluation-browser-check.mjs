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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-evals/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.evaluation-playground');
    assert.equal(await labs.count(), 3);
    for (const el of await labs.all()) await ready(el);
    const judge = labs.nth(0),
      pairs = labs.nth(1),
      gates = labs.nth(2);
    assert.deepEqual(await judge.locator('dd').allTextContents(), [
      '27.8%',
      '20.6%',
      '51.5%',
      '57.4%',
    ]);
    await range(judge.locator('input[type=range]').nth(1), 1);
    assert.deepEqual(await judge.locator('dd').allTextContents(), [
      '0.0%',
      '0.0%',
      '100.0%',
      'NONE',
    ]);
    await range(judge.locator('input[type=range]').nth(1), 0);
    await range(judge.locator('input[type=range]').nth(2), 1);
    assert.deepEqual(await judge.locator('dd').allTextContents(), [
      '60.0%',
      '40.0%',
      '0.0%',
      '60.0%',
    ]);
    await range(judge.locator('input[type=range]').nth(1), 0.4);
    await range(judge.locator('input[type=range]').nth(2), 0.8);
    assert.deepEqual(await pairs.locator('dd').allTextContents(), [
      '58.0%',
      '62.0%',
      '+4.0 pp',
      '100 / 20',
    ]);
    const initialCI = await pairs.locator('.eval-bootstrap figcaption strong').textContent();
    assert.equal(await pairs.locator('.eval-histogram i').count(), 21);
    await pairs.locator('.eval-actions button').nth(1).click();
    assert.deepEqual(await pairs.locator('dd').allTextContents(), [
      '58.0%',
      '62.0%',
      '+4.0 pp',
      '100 / 4',
    ]);
    assert.notEqual(
      await pairs.locator('.eval-bootstrap figcaption strong').textContent(),
      initialCI,
    );
    await pairs.locator('.eval-actions button').nth(2).click();
    assert.equal(
      await pairs.locator('.eval-bootstrap figcaption strong').textContent(),
      '0.0 pp → 0.0 pp',
    );
    assert.ok((await pairs.locator('.eval-bootstrap').textContent()).includes('DEGENERATE'));
    for (const slider of await pairs.locator('input[type=range]').all()) await range(slider, 0);
    assert.equal(await pairs.locator('dd').count(), 0);
    assert.ok((await pairs.locator('p[role=status]').textContent()).includes('NO_DATA'));
    await pairs.locator('.eval-actions button').first().click();
    assert.deepEqual(await pairs.locator('dd').allTextContents(), [
      '58.0%',
      '62.0%',
      '+4.0 pp',
      '100 / 20',
    ]);
    const status = gates.locator('.eval-gate-status>strong');
    assert.equal(await status.textContent(), 'BLOCKED');
    assert.equal(
      await gates.locator('tbody tr').last().locator('td').last().textContent(),
      '+6.0 pp',
    );
    assert.ok(
      (await gates.locator('.eval-gate-status').textContent()).includes('quality/enterprise'),
    );
    await gates.locator('.eval-actions button').last().click();
    assert.equal(await status.textContent(), 'INSUFFICIENT_EVIDENCE');
    await range(gates.locator('input[type=range]'), 20);
    await gates.locator('input[type=checkbox]').last().check();
    assert.equal(await status.textContent(), 'CANARY_CANDIDATE');
    await gates.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await status.textContent(), 'INSUFFICIENT_EVIDENCE');
    await gates.locator('input[type=checkbox]').first().check();
    await gates.locator('input[type=checkbox]').nth(1).uncheck();
    assert.equal(await status.textContent(), 'INSUFFICIENT_EVIDENCE');
    await gates.locator('input[type=checkbox]').nth(1).check();
    await gates.locator('.eval-actions button').nth(1).click();
    assert.equal(await status.textContent(), 'BLOCKED');
    assert.ok(
      (await gates.locator('.eval-gate-status').textContent()).includes('unauthorized-disclosure'),
    );
    await gates.locator('.eval-actions button').first().click();
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.evaluation-playground')].some((el) =>
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
            '.evaluation-playground .worksheet-results>div,.eval-outcomes article,.eval-gate-status',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/evaluation-${locale}-${i}-${width}.png` });
        await labs
          .nth(i)
          .locator(i === 2 ? '.eval-gate-status' : '.worksheet-results')
          .first()
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/evaluation-${locale}-${i}-results-${width}.png`,
        });
      }
      await gates.locator('.eval-table').scrollIntoViewIfNeeded();
      await gates.locator('.eval-table').focus();
      await page.keyboard.press('ArrowRight');
      await page.screenshot({ path: `artifacts/evaluation-${locale}-budget-${width}.png` });
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
    'artifacts/evaluation-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Evaluation: matched case resampling/degeneracy, exact judge-order probabilities/unresolved mass, slice/privacy/missing-evidence gates; VI/EN, keyboard, mobile and nine themes passed.',
);
