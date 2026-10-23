import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const themes = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8')),
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
  page.on('pageerror', (e) => errors.push({ route: page.url(), message: String(e) }));
  async function ready(lab) {
    await lab.scrollIntoViewIfNeeded();
    await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
      if (el.dataset.uiReady === 'true') return;
      await new Promise((resolve) =>
        el.addEventListener('av-lore:island-ready', resolve, { once: true }),
      );
    });
  }
  async function range(input, key) {
    await input.focus();
    await page.keyboard.press(key);
  }
  async function graph(diagram, source, locale) {
    await ready(diagram);
    assert.equal(await diagram.locator('[role=tab]').count(), source.traces.length);
    for (const [i, trace] of source.traces.entries()) {
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
    const node = diagram.locator('.architecture-node').last();
    await node.focus();
    await page.keyboard.press('Enter');
    assert.equal(
      await diagram.locator('.architecture-detail p').textContent(),
      source.nodes.at(-1).detail[locale],
    );
    await diagram.locator('[role=tab]').first().focus();
    await page.keyboard.press('End');
    assert.equal(await diagram.locator('[role=tab]').last().getAttribute('aria-selected'), 'true');
  }
  for (const locale of ['vi', 'en'])
    for (const id of ['load-balancing', 'caching']) {
      const source = JSON.parse(fs.readFileSync(`src/content/handbook/${id}.json`, 'utf8'));
      await page.setViewportSize({ width: 1500, height: 1100 });
      await page.goto(`${base}/${locale === 'en' ? 'en/' : ''}system-design/${id}/`);
      if (locale === 'en')
        await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
      const labs = page.locator('.handbook-experiment');
      for (const lab of await labs.all()) await ready(lab);
      if (id === 'load-balancing') {
        const balancing = labs.nth(0),
          choices = balancing.locator('.worksheet-choices button');
        assert.equal(await choices.count(), 4);
        const outputs = [];
        for (const slow of [false, true]) {
          await balancing.locator('input[type=checkbox]').setChecked(slow);
          for (let i = 0; i < 4; i++) {
            await choices.nth(i).click();
            assert.equal(await choices.nth(i).getAttribute('aria-pressed'), 'true');
            assert.equal(await balancing.locator('svg rect').count(), 30);
            const result = await balancing.locator('dd').allTextContents();
            assert.ok(result.every((x) => Number.isFinite(Number(x)) && Number(x) > 0));
            outputs.push({ slow, algorithm: i, result });
          }
        }
        assert.notDeepEqual(
          outputs.find((x) => x.algorithm === 0 && !x.slow).result,
          outputs.find((x) => x.algorithm === 1 && !x.slow).result,
        );
        const ring = labs.nth(1),
          buttons = ring.locator('.worksheet-choices button');
        assert.equal(await ring.locator('dd').first().textContent(), '0');
        await buttons.first().click();
        const moved = Number(await ring.locator('dd').first().textContent());
        assert.ok(moved > 0 && moved < 400);
        assert.equal(await ring.locator('dd').last().textContent(), '128');
        await range(ring.locator('input[type=range]'), 'End');
        assert.equal(await ring.locator('dd').last().textContent(), '512');
        await ring.locator('input[type=text]').fill('tenant:heavy');
        assert.ok((await ring.locator('svg text').first().textContent()).startsWith('node-'));
        const global = source.sections.find((s) => s.id === 'global').diagram;
        await graph(
          page.locator('.handbook-section[aria-labelledby=global] .architecture-explorer'),
          global,
          locale,
        );
        assert.equal(
          await page
            .locator('.handbook-section[aria-labelledby=placement-options] tbody tr')
            .count(),
          5,
        );
      } else {
        const eviction = labs.nth(0),
          presets = eviction.locator('[role=group] button'),
          policies = eviction.locator('.worksheet-choices').nth(1).locator('button'),
          processed = eviction.locator('input[type=range]').first(),
          capacity = eviction.locator('input[type=range]').nth(1);
        const expected = [
            [5, 8, 6],
            [15, 17, 15],
            [20, 10, 20],
          ],
          lengths = [16, 27, 24];
        for (let i = 0; i < 3; i++) {
          await presets.nth(i).click();
          assert.deepEqual(await eviction.locator('dd').allTextContents(), ['0', '0']);
          assert.deepEqual(await eviction.locator('tbody tr td:last-child').allTextContents(), [
            '—',
            '—',
            '—',
          ]);
          await range(processed, 'End');
          assert.equal(await eviction.locator('.cache-request-trace li').count(), lengths[i]);
          assert.deepEqual(
            (await eviction.locator('tbody tr td:first-of-type').allTextContents()).map(Number),
            expected[i],
          );
          for (let p = 0; p < 3; p++) {
            await policies.nth(p).click();
            assert.deepEqual((await eviction.locator('dd').allTextContents()).map(Number), [
              expected[i][p],
              lengths[i] - expected[i][p],
            ]);
          }
        }
        for (const boundary of ['Home', 'End']) {
          await range(capacity, boundary);
          assert.equal(await processed.inputValue(), '0');
          await range(processed, 'End');
          assert.ok(
            (await eviction.locator('.cache-slots > div').count()) <=
              Number(await capacity.inputValue()),
          );
          assert.equal(
            (await eviction.locator('dd').allTextContents()).map(Number).reduce((a, b) => a + b, 0),
            24,
          );
        }
        const burst = labs.nth(1);
        assert.deepEqual(await burst.locator('dd').allTextContents(), ['100', '1000']);
        await burst.locator('input[type=checkbox]').first().check();
        assert.deepEqual(await burst.locator('dd').allTextContents(), ['100', '100']);
        await burst.locator('input[type=checkbox]').last().check();
        const expired = Number(await burst.locator('dd').first().textContent());
        assert.ok(expired > 0 && expired < 100);
        assert.equal(Number(await burst.locator('dd').last().textContent()), expired);
        await range(burst.locator('input[type=range]'), 'End');
        assert.deepEqual(await burst.locator('dd').allTextContents(), ['100', '100']);
        const patterns = source.sections.find((s) => s.id === 'patterns').diagram;
        await graph(
          page.locator('.handbook-section[aria-labelledby=patterns] .architecture-explorer'),
          patterns,
          locale,
        );
        assert.equal(patterns.traces.length, 5);
        assert.equal(
          await page.locator('.handbook-section[aria-labelledby=failure] .learning-card').count(),
          4,
        );
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
          id,
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
          `${id}/${locale}/${width}`,
        );
        const visual =
          id === 'caching'
            ? labs.first()
            : page.locator('.handbook-section[aria-labelledby=global] .architecture-explorer');
        if (id === 'load-balancing' && width === 1500)
          assert.equal(
            await visual
              .locator('.architecture-canvas')
              .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
            false,
          );
        await page.evaluate(() => document.activeElement?.blur?.());
        await visual.screenshot({ path: `artifacts/routing-cache-${id}-${locale}-${width}.png` });
      }
    }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/routing-cache-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  'Routing/cache: four balancers, ring membership, three workload/capacity replays and policy rankings, all five cache-policy traces, global DNS/request paths, burst controls, keyboard, VI/EN/mobile and 36 theme accessibility scans passed.',
);
