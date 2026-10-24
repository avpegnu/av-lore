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
  const key = async (control, action) => {
    await control.focus();
    await page.keyboard.press(action);
  };
  const value = async (control, number) => {
    await key(control, 'Home');
    const min = Number(await control.getAttribute('min'));
    for (let i = min; i < number; i++) await page.keyboard.press('ArrowRight');
    await expect(control).toHaveValue(String(number));
  };
  for (const locale of ['vi', 'en']) {
    await page.goto(
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/video-platform/',
    );
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.handbook-experiment');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) {
      await lab.scrollIntoViewIfNeeded();
      await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
        if (el.dataset.uiReady === 'true') return;
        await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    const dag = labs.first(),
      boxes = dag.locator('input[type=checkbox]'),
      clock = dag.locator(':scope > .worksheet-inputs input[type=range]'),
      metrics = dag.locator(':scope > .worksheet-results dd');
    assert.deepEqual(await metrics.allTextContents(), ['2', '0', '—', '—']);
    await boxes.nth(1).check();
    await expect(metrics.nth(2)).toHaveText('8');
    assert.deepEqual(await metrics.allTextContents(), ['2', '2', '8', '1']);
    await boxes.last().uncheck();
    await key(clock, 'End');
    await expect(metrics.nth(1)).toHaveText('0');
    await boxes.last().check();
    await expect(metrics.nth(3)).toHaveText('2');
    assert.deepEqual(await metrics.allTextContents(), ['3', '3', '8', '2']);
    await boxes.nth(1).uncheck();
    await expect(metrics.nth(2)).toHaveText('20');
    await boxes.first().uncheck();
    await expect(metrics.nth(2)).toHaveText('12');
    await key(clock, 'Home');
    await expect(metrics.nth(1)).toHaveText('0');
    const schedule = dag.locator('.encode-schedule'),
      controls = schedule.locator('input[type=range]'),
      makespan = schedule.locator('[data-encode-makespan]'),
      work = schedule.locator('[data-encode-work]');
    await expect(makespan).toHaveText('243.00');
    await expect(work).toHaveText('1533.00');
    assert.equal(await schedule.locator('[data-encode-task]').count(), 27);
    await key(controls.nth(2), 'Home');
    await expect(makespan).toHaveText('1533.00');
    await expect(schedule.locator('[data-encode-speedup]')).toHaveText('1.00×');
    await value(controls.nth(2), 8);
    await key(controls.nth(1), 'Home');
    await expect(makespan).toHaveText('837.00');
    await expect(work).toHaveText('1491.00');
    await value(controls.nth(1), 8);
    await key(controls.last(), 'Home');
    await expect(work).toHaveText('1485.00');
    await key(controls.last(), 'End');
    await expect(work).toHaveText('1725.00');
    await key(controls.first(), 'End');
    await expect(work).toHaveText('9125.00');
    await key(controls.nth(1), 'End');
    await expect(work).toHaveText('9365.00');
    assert.equal(await schedule.locator('[data-encode-task]').count(), 51);
    await key(controls.nth(2), 'End');
    assert.ok(
      Number(await makespan.textContent()) >=
        Number(await schedule.locator('[data-encode-bound]').textContent()),
    );
    await key(controls.first(), 'Home');
    await expect(work).toHaveText('633.00');
    await value(controls.first(), 10);
    await value(controls.nth(1), 8);
    await value(controls.nth(2), 8);
    await value(controls.last(), 2);
    await expect(makespan).toHaveText('243.00');
    await schedule.locator('summary').click();
    assert.equal(await schedule.locator('tbody tr').count(), 27);
    assert.ok((await schedule.locator('tbody tr').last().innerText()).includes('audio'));
    await schedule.locator('summary').click();
    const abr = labs.nth(1),
      runs = abr.locator('.video-abr-results section'),
      ranges = abr.locator('input[type=range]'),
      decisions = abr.locator('.video-decision-chart');
    assert.ok(
      Number(await runs.first().locator('dd').nth(1).textContent()) >
        Number(await runs.last().locator('dd').nth(1).textContent()),
    );
    assert.equal(await decisions.locator('polyline').count(), 3);
    for (const line of await decisions.locator('polyline').all())
      assert.equal((await line.getAttribute('points')).split(' ').length, 12);
    assert.ok((await decisions.locator('[data-stall-rule="0"]').count()) > 0);
    const original = await decisions.locator('[data-series=network]').getAttribute('points');
    for (const button of await abr.locator('.worksheet-choices button').all()) {
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      assert.equal(await decisions.locator('polyline').count(), 3);
    }
    assert.notEqual(
      await decisions.locator('[data-series=network]').getAttribute('points'),
      original,
    );
    await key(ranges.first(), 'End');
    await abr.locator('.worksheet-choices button').first().click();
    for (const run of await runs.all()) await expect(run.locator('dd').nth(1)).toHaveText('0.00');
    assert.equal(await decisions.locator('circle').count(), 0);
    await abr.locator('details summary').click();
    assert.equal(await abr.locator('tbody tr').count(), 24);
    assert.equal(await abr.locator('thead th').count(), 14);
    assert.equal(await abr.locator('.video-buffer-chart polyline').count(), 2);
    await value(ranges.first(), 6);
    await abr.locator('.worksheet-choices button').nth(1).click();
    await expect(abr.locator('tbody tr').first().locator('td').nth(1)).toHaveText('6.00');
    await abr.locator('details summary').click();
    const delivery = labs.last(),
      bandwidth = delivery.locator('input[type=range]');
    assert.deepEqual(await delivery.locator('dd').allTextContents(), [
      '3000',
      '150.0',
      '1350.0',
      '1,000,000',
    ]);
    await key(bandwidth.last(), 'End');
    await expect(delivery.locator('dd').nth(1)).toHaveText('0.0');
    await expect(delivery.locator('dd').first()).toHaveText('3000');
    await key(bandwidth.first(), 'End');
    await key(bandwidth.nth(1), 'Home');
    await expect(delivery.locator('dd').first()).toHaveText('2000');
    await key(bandwidth.last(), 'Home');
    await expect(delivery.locator('dd').nth(1)).toHaveText('2000.0');
    const explorer = page.locator('.architecture-explorer');
    await explorer.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelector('.architecture-explorer')?.closest('astro-island')?.dataset
          .uiReady === 'true',
    );
    assert.equal(await explorer.locator('.architecture-node').count(), 11);
    assert.equal(
      await explorer
        .locator('.architecture-canvas')
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      false,
    );
    assert.equal(await explorer.locator('[role=tab]').count(), 4);
    for (const tab of await explorer.locator('[role=tab]').all()) {
      await tab.click();
      for (const step of await explorer.locator('.architecture-steps button').all()) {
        await step.click();
        assert.equal(await explorer.locator('.architecture-steps [aria-current=step]').count(), 1);
      }
    }
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.handbook-experiment')].some((el) =>
            /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText),
          ),
      );
    await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      for (const [name, target] of [
        ['map', explorer],
        ['schedule', schedule],
        ['abr', decisions],
        ['gates', dag],
      ]) {
        await target.evaluate((el) =>
          scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' }),
        );
        await page.evaluate(() => document.activeElement?.blur());
        await page.waitForTimeout(150);
        await page.screenshot({ path: `artifacts/video-review-${locale}-${name}-${width}.png` });
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
    'artifacts/video-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Video: gated/progressive publication, real worker scheduling/dependencies/extremes, ABR decision/stall charts, byte-hit bounds,11-node/four-trace map, VI/EN/mobile/keyboard and18theme accessibility passed.',
);
