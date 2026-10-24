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
  });
  const page = await context.newPage();
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
    const min = +(await el.getAttribute('min')),
      max = +(await el.getAttribute('max')),
      step = +((await el.getAttribute('step')) || 1);
    assert.ok(Number.isFinite(step) && step > 0);
    const fromEnd = max - n < n - min;
    await page.keyboard.press(fromEnd ? 'End' : 'Home');
    for (let i = 0; i < Math.round((fromEnd ? max - n : n - min) / step); i++)
      await page.keyboard.press(fromEnd ? 'ArrowLeft' : 'ArrowRight');
    assert.equal(+(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-parallelism/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.parallelism-playground');
    assert.equal(await labs.count(), 3);
    for (const x of await labs.all()) await ready(x);
    const layout = labs.nth(0),
      pipe = labs.nth(1),
      expert = labs.nth(2);
    assert.deepEqual(await layout.locator('dd').allTextContents(), [
      '8',
      '32.60 GiB',
      'YES',
      '0',
      '4.839 ms',
      '0.000 MiB',
    ]);
    await layout.locator('input[type=checkbox]').check();
    assert.equal(await layout.locator('dd').nth(3).textContent(), '1');
    await layout.locator('fieldset').nth(0).getByRole('button', { name: '1', exact: true }).click();
    assert.equal(await layout.locator('dd').nth(2).textContent(), 'NO');
    assert.equal(await layout.locator('dd').nth(4).textContent(), '0.000 ms');
    await layout.locator('fieldset').nth(0).getByRole('button', { name: '8', exact: true }).click();
    await layout.locator('input[type=checkbox]').uncheck();
    assert.equal(await layout.locator('dd').nth(3).textContent(), '1');
    await layout
      .locator('fieldset')
      .nth(0)
      .getByRole('button', { name: '16', exact: true })
      .click();
    await layout.locator('fieldset').nth(1).getByRole('button', { name: '4', exact: true }).click();
    await layout.locator('fieldset').nth(2).getByRole('button', { name: '4', exact: true }).click();
    assert.equal(await layout.locator('.parallel-rank-grid>span').count(), 256);
    assert.equal(await layout.locator('dd').first().textContent(), '256');
    await range(layout.locator('input[type=range]').first(), 2048);
    assert.ok(parseFloat(await layout.locator('dd').nth(4).textContent()) > 30);
    await layout.locator('fieldset').nth(0).getByRole('button', { name: '4', exact: true }).click();
    await layout.locator('fieldset').nth(1).getByRole('button', { name: '1', exact: true }).click();
    await layout.locator('fieldset').nth(2).getByRole('button', { name: '2', exact: true }).click();
    await range(layout.locator('input[type=range]').first(), 1);
    assert.deepEqual(await pipe.locator('dd').allTextContents(), [
      '40 ms',
      '110 ms',
      '72.7%',
      '72.7%',
    ]);
    await range(pipe.locator('input[type=range]').nth(1), 1);
    assert.equal(await pipe.locator('dd').nth(2).textContent(), '25.0%');
    await range(pipe.locator('input[type=range]').nth(1), 8);
    await range(pipe.locator('input[type=range]').nth(2), 2);
    assert.equal(await pipe.locator('dd').nth(1).textContent(), '190 ms');
    await range(pipe.locator('input[type=range]').nth(2), 1);
    assert.deepEqual(await expert.locator('dd').allTextContents(), [
      '4 / 4 / 4 / 4',
      '8 GiB',
      '128 KiB',
      '0 / 0',
      '1',
      'YES',
    ]);
    await expert.locator('input[type=checkbox]').nth(0).check();
    assert.deepEqual(await expert.locator('dd').allTextContents(), [
      '8 / 3 / 3 / 2',
      '8 GiB',
      '224 KiB',
      '4 / 0',
      '2',
      'YES',
    ]);
    await expert.locator('input[type=checkbox]').nth(2).check();
    assert.equal(await expert.locator('dd').nth(3).textContent(), '0 / 4');
    assert.equal(await expert.locator('dd').last().textContent(), 'NO');
    await expert.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await expert.locator('dd').nth(1).textContent(), '14 GiB');
    assert.equal(await expert.locator('dd').last().textContent(), 'YES');
    assert.equal(await expert.locator('tbody tr').count(), 16);
    await expert.locator('input[type=checkbox]').nth(2).uncheck();
    await expert.locator('input[type=checkbox]').nth(1).uncheck();
    await range(expert.locator('input[type=range]'), 2);
    assert.equal(await expert.locator('dd').nth(3).textContent(), '0 / 0');
    await range(expert.locator('input[type=range]'), 1);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.parallelism-playground')].some((x) =>
            /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(x.innerText),
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
            '.parallelism-playground .worksheet-results>div,.parallel-rank-grid>span,.parallel-expert-grid>div',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/parallel-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/parallel-${locale}-${i}-results-${width}.png` });
      }
    }
    // The largest supported timeline stays inside a deliberately scrollable region.
    await range(pipe.locator('input[type=range]').nth(0), 8);
    await range(pipe.locator('input[type=range]').nth(1), 16);
    assert.equal(await pipe.locator('.parallel-stage-track>span').count(), 128);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
    );
    await pipe.locator('.parallel-timeline').focus();
    await page.keyboard.press('ArrowRight');
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
    'artifacts/parallel-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Parallelism: placement/failure domains, collective costs, dependency timelines and expert routing/copies/capacity; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
