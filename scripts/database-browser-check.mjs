import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const source = JSON.parse(fs.readFileSync('src/content/handbook/databases.json', 'utf8')),
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
  async function range(input, key) {
    await input.focus();
    await page.keyboard.press(key);
  }
  for (const locale of ['vi', 'en']) {
    await page.setViewportSize({ width: 1500, height: 1100 });
    await page.goto(`${base}/${locale === 'en' ? 'en/' : ''}system-design/databases/`);
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.handbook-experiment');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) await ready(lab);
    const isolation = labs.nth(0);
    assert.deepEqual(await isolation.locator('dd').allTextContents(), ['0', '0']);
    await isolation.locator('button').last().click();
    assert.deepEqual(await isolation.locator('dd').allTextContents(), ['1', '1']);
    const lsm = labs.nth(1),
      writes = lsm.locator('input[type=range]');
    await range(writes, 'Home');
    assert.equal(await lsm.locator('dd').first().textContent(), '∅');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    assert.equal(await lsm.locator('dd').first().textContent(), 'c1');
    await range(writes, 'End');
    assert.equal(await lsm.locator('dd').first().textContent(), '†');
    await lsm.locator('input[type=checkbox]').check();
    assert.equal(await lsm.locator('dd').first().textContent(), '†');
    await lsm.getByRole('button', { name: 'A', exact: true }).click();
    assert.equal(await lsm.locator('dd').first().textContent(), 'a2');
    await lsm.getByRole('button', { name: 'F', exact: true }).click();
    assert.equal(await lsm.locator('dd').first().textContent(), 'f1');
    const sharding = labs.nth(2),
      strategy = sharding.locator('.worksheet-choices').first().locator('button'),
      workload = sharding.locator('.worksheet-choices').nth(1).locator('button');
    const rangePeak = Number((await sharding.locator('dd').first().textContent()).replace('%', ''));
    assert.ok(rangePeak > 90);
    await strategy.last().click();
    const hashPeak = Number((await sharding.locator('dd').first().textContent()).replace('%', ''));
    assert.ok(hashPeak < rangePeak);
    await workload.last().click();
    for (const key of ['Home', 'End']) {
      await range(sharding.locator('input'), key);
      assert.ok(
        Number((await sharding.locator('dd').first().textContent()).replace('%', '')) >= 90,
      );
    }
    await strategy.first().click();
    await workload.first().click();
    await range(sharding.locator('input'), 'Home');
    assert.equal(await sharding.locator('dd').first().textContent(), '50.0%');
    assert.equal(
      await page.locator('.handbook-section[aria-labelledby=anomaly-schedules] tbody tr').count(),
      5,
    );
    assert.equal(
      await page.locator('.handbook-section[aria-labelledby=shards] tbody tr').count(),
      3,
    );
    const diagram = page.locator(
        '.handbook-section[aria-labelledby=index-ownership] .architecture-explorer',
      ),
      graph = source.sections.find((s) => s.id === 'index-ownership').diagram;
    await ready(diagram);
    assert.equal(await diagram.locator('.architecture-node').count(), 5);
    for (const [i, trace] of graph.traces.entries()) {
      await diagram.locator('[role=tab]').nth(i).click();
      const steps = diagram.locator('.architecture-steps button');
      assert.equal(await steps.count(), trace.steps.length);
      for (const [j, step] of trace.steps.entries()) {
        await steps.nth(j).click();
        assert.equal(await steps.nth(j).getAttribute('aria-current'), 'step');
        assert.ok((await steps.nth(j).innerText()).includes(step.description[locale]));
        assert.ok((await diagram.locator('.architecture-edge.is-current').count()) >= 1);
      }
    }
    await diagram.locator('.architecture-node').last().focus();
    await page.keyboard.press('Enter');
    assert.equal(
      await diagram.locator('.architecture-detail p').textContent(),
      graph.nodes.at(-1).detail[locale],
    );
    await diagram.locator('[role=tab]').first().focus();
    await page.keyboard.press('End');
    assert.equal(await diagram.locator('[role=tab]').last().getAttribute('aria-selected'), 'true');
    const questions = page.locator('.handbook-section[aria-labelledby=interview] details');
    assert.equal(await questions.count(), 8);
    for (const i of [6, 7]) {
      await questions.nth(i).locator('summary').click();
      assert.ok(await questions.nth(i).locator('.callout').count());
    }
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
        locale + '/' + width,
      );
      if (width === 1500)
        assert.equal(
          await diagram
            .locator('.architecture-canvas')
            .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
          false,
        );
      await page.evaluate(() => document.activeElement?.blur?.());
      await diagram
        .locator('.architecture-heading')
        .evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - 100));
      await page.waitForTimeout(200);
      await page.screenshot({
        path: `artifacts/database-review-${locale}-indexes-${width}-normal.png`,
      });
      await page
        .locator('.handbook-section[aria-labelledby=anomaly-schedules]')
        .screenshot({ path: `artifacts/database-review-${locale}-anomalies-${width}.png` });
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/database-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  'Database: snapshot/Serializable invariant, SST tombstones through compaction, range/hash/hot-key controls, five anomaly schedules, local/global index traces, worked answers, keyboard, VI/EN/mobile and 18 theme accessibility scans passed.',
);
