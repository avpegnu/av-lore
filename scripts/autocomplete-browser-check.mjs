import { chromium, expect } from '@playwright/test';
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
      viewport: { width: 1500, height: 1000 },
      reducedMotion: 'reduce',
    }),
    page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const locale of ['vi', 'en']) {
    await page.goto(
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/autocomplete/',
    );
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.handbook-experiment');
    assert.equal(await labs.count(), 2);
    for (const lab of await labs.all()) {
      await lab.scrollIntoViewIfNeeded();
      await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
        if (el.dataset.uiReady === 'true') return;
        await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    const prefix = labs.first(),
      metrics = prefix.locator('dd'),
      input = prefix.locator('input[type=text]'),
      fold = prefix.locator('input[type=checkbox]'),
      modes = prefix.locator('button');
    assert.deepEqual(await metrics.allTextContents(), ['7', '3', '2', '3']);
    await modes.nth(1).click();
    assert.equal(await metrics.nth(2).textContent(), '3');
    await modes.last().click();
    assert.equal(await metrics.first().textContent(), '6');
    await fold.check();
    assert.equal(await metrics.first().textContent(), '8');
    await fold.uncheck();
    await input.fill('ca\u0300');
    assert.equal(await prefix.locator('.suggestion-results code').textContent(), 'cà phê');
    await input.fill('xyz');
    assert.equal(await metrics.nth(2).textContent(), '0');
    await input.fill('ca');
    await modes.first().click();
    await prefix.locator('input[type=range]').focus();
    await page.keyboard.press('Home');
    assert.equal(await metrics.nth(2).textContent(), '0');
    await prefix.locator('input[type=range]').focus();
    await page.keyboard.press('End');
    assert.equal(await metrics.nth(2).textContent(), '4');
    await modes.nth(1).click();
    assert.equal(await metrics.nth(2).textContent(), '5');
    await prefix.locator('details summary').click();
    assert.equal(await prefix.locator('details [translate=no]').count(), 11);
    const tree = prefix.locator('.prefix-tree'),
      ca = tree.locator('svg:visible g[data-prefix=ca]');
    await modes.first().click();
    await prefix.locator('input[type=range]').focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(tree.locator('svg:visible g[role=button]')).toHaveCount(7);
    await expect(ca).toHaveAttribute('aria-pressed', 'true');
    await expect(ca).toHaveAttribute('aria-label', 'ca / matches: 7');
    await tree.locator('svg:visible g[data-prefix=d]').click();
    await expect(input).toHaveValue('d');
    await expect(metrics.first()).toHaveText('2');
    await ca.focus();
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('ca');
    await expect(metrics.nth(2)).toHaveText('2');
    await modes.last().click();
    await expect(ca).toHaveAttribute('aria-label', 'ca / matches: 6');
    await modes.first().click();
    await fold.check();
    await expect(tree.locator('svg:visible g[role=button]')).toHaveCount(5);
    await expect(ca).toHaveAttribute('aria-label', 'ca / matches: 9');
    await input.fill('ca\u0300');
    await expect(ca).toHaveAttribute('aria-pressed', 'true');
    await fold.uncheck();
    await expect(tree.locator('svg:visible g[data-prefix="cà"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await tree.locator('svg:visible g[data-prefix="cá"]').click();
    await expect(input).toHaveValue('cá');
    await expect(prefix.locator('.suggestion-results code')).toHaveText('cách học');
    await tree.locator('svg:visible g[data-prefix=""]').focus();
    await page.keyboard.press('Space');
    await expect(input).toHaveValue('');
    await expect(tree.locator('svg:visible g[data-prefix=""]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await input.fill('ca');
    const explorer = page.locator('.architecture-explorer');
    await explorer.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelector('.architecture-explorer')?.closest('astro-island')?.dataset
          .uiReady === 'true',
    );
    assert.equal(await explorer.locator('.architecture-node').count(), 9);
    assert.equal(
      await explorer
        .locator('.architecture-canvas')
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      false,
    );
    for (const tab of await explorer.locator('[role=tab]').all()) {
      await tab.click();
      for (const step of await explorer.locator('.architecture-steps button').all()) {
        await step.click();
        await expect(explorer.locator('.architecture-steps [aria-current=step]')).toHaveCount(1);
      }
    }
    const race = labs.last(),
      clock = race.locator('input[type=range]'),
      guard = race.locator('input[type=checkbox]');
    assert.equal(await race.locator('dd').nth(1).textContent(), 'cat');
    await clock.focus();
    await page.keyboard.press('End');
    assert.equal(await race.locator('dd').nth(1).textContent(), 'c');
    assert.equal(await race.locator('dd').last().textContent(), '1');
    await guard.check();
    assert.equal(await race.locator('dd').nth(1).textContent(), 'cat');
    assert.equal(await race.locator('dd').last().textContent(), '0');
    await clock.focus();
    await page.keyboard.press('Home');
    assert.equal(await race.locator('dd').nth(1).textContent(), '—');
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.handbook-experiment')].some((el) => {
            const clone = el.cloneNode(true);
            clone
              .querySelectorAll('[translate=no],script,style,template')
              .forEach((n) => n.remove());
            return /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(clone.textContent);
          }),
      );
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      await tree.locator('svg:visible g[data-prefix=d]').click();
      await expect(input).toHaveValue('d');
      await ca.focus();
      await page.keyboard.press('Enter');
      await expect(input).toHaveValue('ca');
      for (let i = 0; i < 2; i++) {
        await labs.nth(i).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/autocomplete-${locale}-${i}-${width}.png` });
      }
      await page.addStyleTag({ content: '* {scroll-behavior:auto!important}' });
      for (const [name, target] of [
        ['tree', tree],
        ['map', explorer],
        ['ranking', page.locator('#ranking')],
      ]) {
        await target.evaluate((el) =>
          scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' }),
        );
        await page.evaluate(() => document.activeElement?.blur());
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `artifacts/autocomplete-review-${locale}-${name}-${width}.png`,
        });
      }
      if (width === 390) {
        const region = tree.locator('.prefix-tree-scroll');
        await region.scrollIntoViewIfNeeded();
        await expect(tree.locator('svg.prefix-tree-portrait')).toBeVisible();
        assert.equal(await region.evaluate((el) => el.scrollWidth > el.clientWidth + 1), false);
      }
    }
    for (const theme of JSON.parse(fs.readFileSync('src/lib/themes.json'))) {
      await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
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
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1000 });
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/autocomplete-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Autocomplete: branching trie/node selection/path/folding, prefix walks/top-K filtering/overfetch, stale-response guards, all architecture traces/desktop-fit, VI/EN/mobile/keyboard and18theme accessibility passed.',
);
