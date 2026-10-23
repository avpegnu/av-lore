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
    assert.ok(Math.abs(+(await el.inputValue()) - n) < 1e-8);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-serving/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.serving-stack-playground');
    assert.equal(await labs.count(), 3);
    for (const el of await labs.all()) await ready(el);
    const adapters = labs.nth(0),
      routing = labs.nth(1),
      econ = labs.nth(2);
    assert.deepEqual(await adapters.locator('dd').allTextContents(), [
      'LOAD',
      'B',
      '3 GiB',
      '422.7 ms',
    ]);
    await adapters.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await adapters.locator('dd').first().textContent(), 'WAIT');
    assert.equal(await adapters.locator('dd').nth(1).textContent(), 'NONE');
    await adapters.getByRole('button', { name: 'Adapter B', exact: true }).click();
    assert.equal(await adapters.locator('dd').first().textContent(), 'DENIED');
    await adapters.getByRole('button', { name: 'Tenant beta', exact: true }).click();
    assert.equal(await adapters.locator('dd').first().textContent(), 'HIT');
    await adapters.getByRole('button', { name: 'Adapter D', exact: true }).click();
    assert.equal(await adapters.locator('dd').first().textContent(), 'DENIED');
    await adapters.getByRole('button', { name: 'Tenant alpha', exact: true }).click();
    assert.equal(await adapters.locator('dd').first().textContent(), 'INCOMPATIBLE');
    await adapters.getByRole('button', { name: 'Adapter C', exact: true }).click();
    await adapters.locator('input[type=checkbox]').nth(1).uncheck();
    await range(adapters.locator('input[type=range]'), 4);
    assert.equal(await adapters.locator('dd').first().textContent(), 'WAIT');
    await adapters.locator('input[type=checkbox]').first().uncheck();
    assert.equal(await adapters.locator('dd').first().textContent(), 'LOAD');
    assert.equal(await adapters.locator('dd').nth(1).textContent(), 'A, B');
    await range(adapters.locator('input[type=range]'), 6);
    await adapters.locator('input[type=checkbox]').first().check();
    assert.deepEqual(await routing.locator('dd').allTextContents(), [
      '91.13%',
      '3.316',
      '26.45%',
      'YES / NO',
      '15.28% / 0.65%',
      '2.60 s',
    ]);
    await routing.getByRole('button', { name: 'small', exact: true }).click();
    assert.equal(await routing.locator('dd').first().textContent(), '76.50%');
    await routing.getByRole('button', { name: 'large', exact: true }).click();
    assert.equal(await routing.locator('dd').first().textContent(), '89.10%');
    await routing.getByRole('button', { name: 'cascade', exact: true }).click();
    await range(routing.locator('input[type=range]').nth(2), 0);
    await range(routing.locator('input[type=range]').nth(3), 100);
    assert.equal(await routing.locator('dd').first().textContent(), '70.00%');
    await range(routing.locator('input[type=range]').nth(2), 100);
    await range(routing.locator('input[type=range]').nth(3), 0);
    assert.equal(await routing.locator('dd').first().textContent(), '95.60%');
    await range(routing.locator('input[type=range]').nth(2), 80);
    await range(routing.locator('input[type=range]').nth(3), 10);
    await range(routing.locator('input[type=range]').nth(5), 3);
    assert.equal(await routing.locator('dd').nth(3).textContent(), 'YES / YES');
    await range(routing.locator('input[type=range]').nth(5), 2.5);
    assert.deepEqual(await econ.locator('dd').allTextContents(), [
      '4000',
      '3200',
      '$1.67',
      '$2.08',
    ]);
    await econ.locator('input[type=checkbox]').check();
    await range(econ.locator('input[type=range]').nth(2), 4000);
    assert.deepEqual(await econ.locator('dd').allTextContents(), [
      '4000',
      '3200',
      '$1.67',
      '$2.08',
    ]);
    await range(econ.locator('input[type=range]').nth(3), 0);
    assert.equal(await econ.locator('dd').nth(2).textContent(), '$1.67');
    await econ.locator('input[type=checkbox]').uncheck();
    assert.equal(await econ.locator('dd').nth(2).textContent(), 'NONE');
    await range(econ.locator('input[type=range]').nth(2), 10000);
    await range(econ.locator('input[type=range]').nth(3), 40);
    await range(econ.locator('input[type=range]').nth(5), 0);
    assert.equal(await econ.locator('dd').last().textContent(), 'NONE');
    await range(econ.locator('input[type=range]').nth(5), 80);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.serving-stack-playground')].some((el) =>
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
            '.serving-stack-playground .worksheet-results>div,.stack-adapter-map article,.stack-cost-flow>span',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/serving-stack-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/serving-stack-${locale}-${i}-results-${width}.png`,
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
    'artifacts/serving-stack-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Serving stacks: adapter auth/base/pins/admission, joint-outcome routing/cascade regressions and cost/window/SLO arithmetic; VI/EN, keyboard, mobile and nine themes passed.',
);
