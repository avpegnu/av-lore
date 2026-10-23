import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const source = JSON.parse(fs.readFileSync('src/content/handbook/rate-limiting.json', 'utf8'));
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
    await page.goto(`${base}/${locale === 'en' ? 'en/' : ''}system-design/rate-limiting/`);
    await page.addStyleTag({ content: '* { scroll-behavior:auto!important; }' });
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.handbook-experiment'),
      comparison = labs.first();
    assert.equal(await labs.count(), 2);
    for (const lab of await labs.all()) await ready(lab);
    const algorithms = comparison.locator('.rate-algorithm'),
      inputs = comparison.locator('input[type=range]');
    assert.equal(await algorithms.count(), 5);
    assert.equal(await inputs.count(), 3);
    assert.equal(await algorithms.nth(2).locator('header > span').textContent(), '12 / 12');
    assert.equal(await algorithms.nth(3).locator('header > span').textContent(), '6 / 12');
    assert.equal(await comparison.locator('.rate-time-region svg').count(), 5);
    const firstRelease = await algorithms.nth(1).locator('svg title').first().textContent();
    assert.ok(firstRelease.includes('arrival=900 ms'));
    assert.ok(firstRelease.includes('release=1066.7 ms'));
    await boundary(inputs.nth(2), 'End');
    assert.equal(await inputs.nth(2).inputValue(), '5000');
    assert.equal(await algorithms.nth(2).locator('header > span').textContent(), '6 / 12');
    assert.ok(
      (await algorithms.nth(1).locator('svg title').first().textContent()).includes(
        'release=1733.3 ms',
      ),
    );
    await boundary(inputs.nth(2), 'Home');
    const choices = comparison.locator('.worksheet-choices button');
    for (let preset = 0; preset < 3; preset++) {
      await choices.nth(preset).click();
      for (const key of ['Home', 'End']) {
        for (const input of await inputs.all()) await boundary(input, key);
        const axisEnds = await comparison
          .locator('.rate-time-region svg text:last-child')
          .allTextContents();
        assert.equal(new Set(axisEnds).size, 1);
        for (const algorithm of await algorithms.all()) {
          const [allowed, total] = (await algorithm.locator('header > span').textContent())
            .split(' / ')
            .map(Number);
          assert.equal(await algorithm.locator('svg circle').count(), allowed);
          assert.equal(await algorithm.locator('svg .rate-release').count(), allowed);
          assert.equal(await algorithm.locator('svg .rate-rejection').count(), total - allowed);
          assert.equal(await algorithm.locator('svg title').count(), total);
        }
      }
    }
    await choices.first().click();
    await boundary(inputs.first(), 'Home');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    await boundary(inputs.nth(1), 'Home');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    await boundary(inputs.nth(2), 'Home');
    const race = labs.last(),
      mode = race.locator('.worksheet-choices button');
    await boundary(race.locator('input'), 'End');
    assert.deepEqual(await race.locator('dd').allTextContents(), ['8', '5']);
    await mode.last().click();
    assert.deepEqual(await race.locator('dd').allTextContents(), ['1', '5']);
    const graph = source.sections.find((s) => s.id === 'request-path').diagram,
      diagram = page.locator('section[aria-labelledby=request-path] .architecture-explorer');
    await ready(diagram);
    assert.equal(await diagram.locator('.architecture-node').count(), 7);
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
    assert.equal(
      await page.locator('section[aria-labelledby=fairness] .learning-flow li').count(),
      4,
    );
    assert.equal(await page.locator('section[aria-labelledby=multiregion] tbody tr').count(), 4);
    const firstAnswer = page.locator('section[aria-labelledby=interview] details').first();
    await firstAnswer.locator('summary').click();
    assert.ok((await firstAnswer.innerText()).includes(locale === 'vi' ? '0,6' : '0.6'));
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
      await page.evaluate(() => document.activeElement?.blur?.());
      await algorithms
        .first()
        .evaluate((el) =>
          window.scrollTo({
            top: el.getBoundingClientRect().top + scrollY - 110,
            behavior: 'instant',
          }),
        );
      await page.waitForTimeout(150);
      await page.screenshot({ path: `artifacts/rate-review-${locale}-chart-${width}.png` });
      if (width === 390) {
        const region = algorithms.first().locator('.rate-time-region');
        await region.focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => document.querySelector('.rate-time-region')?.scrollLeft > 0);
      }
      await diagram
        .locator('.architecture-canvas')
        .evaluate((el) =>
          window.scrollTo({
            top: el.getBoundingClientRect().top + scrollY - 110,
            behavior: 'instant',
          }),
        );
      await page.waitForTimeout(150);
      await page.screenshot({ path: `artifacts/rate-review-${locale}-routing-${width}.png` });
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/rate-limit-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  'Rate limiting: five shared-axis timelines, adjustable window/capacity and presets, queue departures, atomic race, policy/request traces, worked quotas, keyboard, VI/EN/mobile and18theme scans passed.',
);
