import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const themes = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'));
const content = Object.fromEntries(
  ['estimation', 'scaling', 'networking'].map((id) => [
    id,
    JSON.parse(fs.readFileSync(`src/content/handbook/${id}.json`, 'utf8')),
  ]),
);
const errors = [],
  report = [];
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
  page.on('pageerror', (e) => errors.push({ route: page.url(), message: String(e) }));
  const section = (id) => page.locator(`.handbook-section[aria-labelledby="${id}"]`);
  async function ready(lab) {
    await lab.scrollIntoViewIfNeeded();
    await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
      if (el.dataset.uiReady === 'true') return;
      await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
    });
  }
  async function range(input, key) {
    await input.focus();
    await page.keyboard.press(key);
  }
  async function values(lab, expected) {
    assert.deepEqual(await lab.locator('dd').allTextContents(), expected);
  }
  for (const locale of ['vi', 'en'])
    for (const id of ['estimation', 'scaling', 'networking']) {
      await page.setViewportSize({ width: 1500, height: 1100 });
      await page.goto(`${base}/${locale === 'en' ? 'en/' : ''}system-design/${id}/`);
      if (locale === 'en')
        await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
      if (id === 'estimation') {
        const capacity = section('worksheet').locator('.lab-frame');
        await ready(capacity);
        for (const [i, value] of [1000000, 10, 4, 1000, 30, 3].entries())
          await capacity.locator('input').nth(i).fill(String(value));
        const metrics = await capacity.locator('.metric strong').allTextContents();
        assert.deepEqual(
          metrics.map((t) => Number(t.replace(/[.\s]|GB/g, ''))),
          [116, 463, 900],
        );
        const latency = section('latency').locator('.handbook-experiment');
        await ready(latency);
        await values(latency, ['185', '160']);
        await latency.locator('button').last().click();
        await values(latency, ['125', '160']);
        const budget = section('availability').locator('.handbook-experiment');
        await ready(budget);
        await budget.getByRole('button', { name: '99.999%', exact: true }).click();
        await values(budget, ['25.92', '0.432']);
        const dependency = section('dependency-model').locator('.handbook-experiment');
        await ready(dependency);
        await range(dependency.locator('input[type=range]').first(), 'End');
        await range(dependency.locator('input[type=range]').nth(1), 'Home');
        await values(dependency, ['99.20279', '99.90000']);
        await range(dependency.locator('input[type=range]').nth(1), 'End');
        await dependency.locator('input[type=checkbox]').check();
        await values(dependency, ['99.20279', '99.00000']);
        assert.equal(await section('powers').locator('tbody tr').count(), 5);
        assert.ok((await section('working-set').innerText()).includes('6 GB'));
        assert.ok((await section('worked-system').innerText()).includes('225 TB'));
      } else if (id === 'scaling') {
        const saturation = section('bottlenecks').locator('.handbook-experiment');
        await ready(saturation);
        await values(saturation, ['80%', '500', '4.0', '100']);
        await range(saturation.locator('input'), 'End');
        assert.equal(await saturation.locator('dd').nth(1).textContent(), '—');
        await range(saturation.locator('input'), 'Home');
        await values(saturation, ['0%', '100', '0.0', '100']);
        const timeline = page.locator('.build-timeline');
        await ready(timeline);
        const stages = content.scaling.sections.find((s) => s.id === 'stages').stages,
          buttons = timeline.locator(':scope > ol > li > button');
        assert.equal(stages.length, 10);
        assert.equal(await buttons.count(), 10);
        for (const [i, stage] of stages.entries()) {
          await buttons.nth(i).click();
          await page.waitForFunction(
            (t) => document.querySelector('.build-stage > div > h3')?.textContent === t,
            stage.title[locale],
          );
          const explanation = await timeline.locator('.build-stage > div').innerText();
          for (const field of ['problem', 'decision', 'tradeoff', 'nextPressure', 'exitCriteria'])
            assert.ok(explanation.includes(stage[field][locale]), `${locale}/${stage.id}/${field}`);
          const diagram = timeline.locator('.architecture-explorer');
          assert.equal(
            await diagram.locator('.architecture-node').count(),
            stage.diagram.nodes.length,
          );
          for (const [t, trace] of stage.diagram.traces.entries()) {
            await diagram.locator('[role=tab]').nth(t).click();
            const steps = diagram.locator('.architecture-steps button');
            for (let step = 0; step < trace.steps.length; step++) {
              await steps.nth(step).click();
              assert.equal(await steps.nth(step).getAttribute('aria-current'), 'step');
              assert.ok((await diagram.locator('.architecture-edge.is-current').count()) >= 1);
            }
          }
          const lastNode = diagram.locator('.architecture-node').last();
          await lastNode.focus();
          await page.keyboard.press('Enter');
          assert.equal(await lastNode.getAttribute('aria-pressed'), 'true');
          assert.equal(
            await diagram.locator('.architecture-detail p').textContent(),
            stage.diagram.nodes.at(-1).detail[locale],
          );
        }
        await buttons.last().focus();
        await page.keyboard.press('Home');
        assert.equal(await buttons.first().getAttribute('aria-current'), 'step');
        await page.keyboard.press('ArrowDown');
        assert.equal(await buttons.nth(1).getAttribute('aria-current'), 'step');
        await page.keyboard.press('End');
        assert.equal(await buttons.last().getAttribute('aria-current'), 'step');
        await timeline.locator('.build-navigation button').first().click();
        assert.equal(await buttons.nth(8).getAttribute('aria-current'), 'step');
      } else {
        const handshake = section('dns').locator('.handbook-experiment');
        await ready(handshake);
        await values(handshake, ['110', '170']);
        await handshake.locator('button').nth(1).click();
        await values(handshake, ['70', '130']);
        await handshake.locator('button').last().click();
        await values(handshake, ['0', '60']);
        await range(handshake.locator('input'), 'End');
        await values(handshake, ['0', '220']);
        const transport = section('realtime').locator('.handbook-experiment');
        await ready(transport);
        await values(transport, ['20000', '4.000', '0', '20000']);
        await transport.locator('button').last().click();
        await values(transport, ['3333', '0.667', '100000', '0']);
        assert.equal(await section('transport').locator('tbody tr').count(), 3);
        assert.equal(await section('realtime').locator('tbody tr').count(), 5);
        assert.equal(await section('styles').locator('.learning-card').count(), 3);
        const worked = section('interview').locator('.handbook-questions details').last();
        await worked.locator('summary').click();
        assert.ok((await worked.innerText()).includes('163'));
        assert.ok(await worked.locator('.callout').count());
      }
      for (const theme of themes) {
        await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme.id);
        const result = await new AxeBuilder({ page })
          .include('.rich-handbook')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        report.push({
          locale,
          id,
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
          `${locale}/${id}/${width}`,
        );
        await page.evaluate(() => document.activeElement?.blur?.());
        if (id === 'scaling' && width === 1500)
          assert.equal(
            await page
              .locator('.build-stage .architecture-canvas')
              .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
            false,
            'Scaling diagram should fit the desktop reading column',
          );
        const visual =
          id === 'estimation'
            ? section('worked-system')
            : id === 'networking'
              ? section('transport')
              : page.locator('.build-stage');
        await visual.screenshot({ path: `artifacts/foundations-${locale}-${id}-${width}.png` });
        if (id === 'scaling')
          await visual
            .locator('.architecture-canvas')
            .screenshot({ path: `artifacts/foundations-${locale}-scaling-diagram-${width}.png` });
      }
      if (locale === 'en')
        assert.equal(
          /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(await page.locator('main').innerText()),
          false,
          id,
        );
    }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/foundations-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  'Foundations: capacity/latency/availability/dependency math, ten scaling stages and every trace, protocol/transport scenarios, keyboard, VI/EN/mobile and 54 theme accessibility scans passed.',
);
