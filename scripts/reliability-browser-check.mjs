import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore',
  source = JSON.parse(fs.readFileSync('src/content/handbook/reliability.json', 'utf8')),
  themes = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8')),
  report = [],
  errors = [];
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
fs.mkdirSync('artifacts', { recursive: true });
try {
  const context = await browser.newContext({
      viewport: { width: 1500, height: 1100 },
      reducedMotion: 'reduce',
    }),
    page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  async function ready(el) {
    await el.scrollIntoViewIfNeeded();
    await el.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
      if (el.dataset.uiReady === 'true') return;
      await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
    });
  }
  async function boundary(el, key) {
    await el.focus();
    await page.keyboard.press(key);
  }
  for (const locale of ['vi', 'en']) {
    await page.setViewportSize({ width: 1500, height: 1100 });
    await page.goto(`${base}/${locale === 'en' ? 'en/' : ''}system-design/reliability/`);
    await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.handbook-experiment');
    assert.equal(await labs.count(), 4);
    for (const lab of await labs.all()) await ready(lab);
    const time = labs.nth(0);
    assert.equal(await time.locator('dd').first().textContent(), '2592.00');
    await time.locator('button').last().click();
    assert.equal(await time.locator('dd').first().textContent(), '25.92');
    const dependency = labs.nth(1),
      composer = dependency.locator('.dependency-composer'),
      rows = composer.locator('.dependency-composition > li'),
      common = dependency.getByRole('checkbox');
    assert.equal(await rows.count(), 5);
    while ((await rows.count()) > 1)
      await rows.last().locator('[data-dependency-action=remove]').click();
    await rows.first().locator('select').selectOption('0.99');
    assert.deepEqual(await composer.locator('dd').allTextContents(), ['1', '99.00000', '99.00000']);
    await rows.first().getByRole('spinbutton').fill('2');
    assert.equal(await composer.locator('dd').nth(1).textContent(), '99.99000');
    await common.check();
    assert.equal(await composer.locator('dd').last().textContent(), '98.99010');
    const hard = rows.first().locator('[data-dependency-action=required]');
    await hard.focus();
    await page.keyboard.press('Space');
    assert.equal(await hard.getAttribute('aria-pressed'), 'false');
    assert.deepEqual(await composer.locator('dd').allTextContents(), [
      '0',
      '100.00000',
      '99.00000',
    ]);
    await rows.first().locator('[data-dependency-action=remove]').click();
    assert.equal(await rows.count(), 0);
    await composer.locator('[data-dependency-action=add]').click();
    assert.equal(await composer.locator('dd').last().textContent(), '98.90100');
    while ((await rows.count()) < 8) await composer.locator('[data-dependency-action=add]').click();
    assert.equal(await composer.locator('[data-dependency-action=add]').isDisabled(), true);
    await composer.locator('[data-dependency-action=reset]').click();
    assert.equal(await rows.count(), 5);
    await common.uncheck();
    const retry = labs.nth(2);
    for (const input of await retry.locator('input[type=range]').all())
      await boundary(input, 'End');
    assert.equal(await retry.locator('dd').first().textContent(), '1024');
    assert.equal(await retry.locator('dd').last().textContent(), '48');
    await retry.getByRole('checkbox').check();
    assert.equal(await retry.locator('dd').last().textContent(), '48');
    await retry.locator('.worksheet-choices button').nth(1).click();
    assert.equal(await retry.locator('dd').last().textContent(), '12');
    await retry.locator('.worksheet-choices button').first().click();
    assert.equal(await retry.locator('dd').last().textContent(), '0');
    const breaker = labs.nth(3),
      buttons = breaker.locator('.worksheet-choices button');
    await buttons.last().click();
    assert.equal(await breaker.locator('.breaker-state strong').textContent(), 'closed');
    for (let i = 0; i < 3; i++) await buttons.nth(1).click();
    assert.equal(await breaker.locator('.breaker-state strong').textContent(), 'open');
    await buttons.first().click();
    assert.equal(await breaker.locator('dd').last().textContent(), '1');
    await buttons.nth(2).click();
    await buttons.nth(3).click();
    assert.equal(await breaker.locator('.breaker-state strong').textContent(), 'half-open');
    await buttons.nth(1).click();
    assert.equal(await breaker.locator('.breaker-state strong').textContent(), 'open');
    await buttons.nth(2).click();
    await buttons.nth(3).click();
    await buttons.first().click();
    assert.equal(await breaker.locator('.breaker-state strong').textContent(), 'closed');
    const graph = source.sections.find((s) => s.id === 'deadlines').diagram,
      diagram = page.locator('section[aria-labelledby=deadlines] .architecture-explorer');
    await ready(diagram);
    assert.equal(await diagram.locator('.architecture-node').count(), 6);
    assert.equal(await diagram.locator('[role=tab]').count(), 3);
    for (const [i, trace] of graph.traces.entries()) {
      await diagram.locator('[role=tab]').nth(i).click();
      const steps = diagram.locator('.architecture-steps button');
      assert.equal(await steps.count(), trace.steps.length);
      for (const [j, step] of trace.steps.entries()) {
        await steps.nth(j).click();
        assert.ok((await steps.nth(j).innerText()).includes(step.description[locale]));
        assert.ok(await diagram.locator('.architecture-edge.is-current').count());
      }
    }
    await diagram.locator('[role=tab]').first().focus();
    await page.keyboard.press('End');
    assert.equal(await diagram.locator('[role=tab]').last().getAttribute('aria-selected'), 'true');
    await diagram.locator('.architecture-node').last().focus();
    await page.keyboard.press('Enter');
    assert.equal(
      await diagram.locator('.architecture-detail p').textContent(),
      graph.nodes.at(-1).detail[locale],
    );
    assert.equal(await page.locator('section[aria-labelledby=budget] tbody tr').count(), 4);
    assert.equal(await page.locator('section[aria-labelledby=recovery] .learning-card').count(), 3);
    const answers = page.locator('section[aria-labelledby=interview] details');
    for (const i of [0, 6]) await answers.nth(i).locator('summary').click();
    assert.ok((await answers.first().innerText()).includes('220'));
    assert.ok(
      (await answers.last().innerText()).includes(locale === 'vi' ? 'RTO 60' : 'sixty-minute RTO'),
    );
    if (locale === 'en')
      await page.waitForFunction(
        () => !/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(document.querySelector('main').innerText),
      );
    for (const theme of themes) {
      await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme.id);
      const result = await new AxeBuilder({ page })
        .include('.rich-handbook')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      report.push({
        locale,
        theme: theme.id,
        violations: result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      });
    }
    await page.evaluate(() => (document.documentElement.dataset.theme = 'github-dark'));
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      if (width === 1500)
        assert.equal(
          await diagram
            .locator('.architecture-canvas')
            .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
          false,
        );
      for (const [label, el] of [
        ['composer', composer],
        ['composition-results', composer.locator('.worksheet-results')],
        ['checkout', diagram.locator('.architecture-canvas')],
      ]) {
        await page.evaluate(() => document.activeElement?.blur?.());
        await el.evaluate((el) =>
          window.scrollTo({
            top: el.getBoundingClientRect().top + scrollY - 100,
            behavior: 'instant',
          }),
        );
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `artifacts/reliability-review-${locale}-${label}-${width}.png`,
        });
      }
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/reliability-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  'Reliability: heterogeneous conditional dependency composition, soft/hard assumptions, common cause, four original labs, checkout/degraded/overload traces, worked budgets/DR, keyboard, VI/EN/mobile and18theme scans passed.',
);
