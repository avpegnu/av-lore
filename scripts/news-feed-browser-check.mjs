import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore',
  source = JSON.parse(fs.readFileSync('src/content/handbook/news-feed.json', 'utf8')),
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
    await page.goto(`${base}/${locale === 'en' ? 'en/' : ''}handbook/system-design/news-feed/`);
    await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const lab = page.locator('.handbook-experiment');
    assert.equal(await lab.count(), 1);
    await ready(lab);
    const aggregate = lab.locator(':scope > .worksheet-inputs input');
    assert.equal(await aggregate.count(), 2);
    assert.equal(await lab.locator(':scope > .worksheet-results dd').nth(1).textContent(), '34722');
    await boundary(aggregate.first(), 'End');
    assert.equal(
      await lab.locator(':scope > .worksheet-results dd').nth(1).textContent(),
      '347222',
    );
    await boundary(aggregate.last(), 'Home');
    assert.equal(await lab.locator(':scope > .worksheet-results dd').nth(1).textContent(), '0');
    assert.equal(await lab.locator(':scope > .worksheet-results dd').last().textContent(), '240');
    const experiment = lab.locator('.feed-tradeoff'),
      ranges = experiment.locator('input[type=range]'),
      stats = experiment.locator('.worksheet-results dd');
    assert.equal(await ranges.count(), 6);
    assert.deepEqual(await stats.allTextContents(), ['0', '10', '0.00', 'read-time']);
    assert.equal(await experiment.locator('tbody tr').count(), 3);
    async function mode(name) {
      await experiment.locator(`[data-feed-mode=${name}]`).click();
    }
    async function publish() {
      await experiment.locator('[data-feed-publish]').click();
      await experiment.locator('.feed-publication[data-active=true]').waitFor();
    }
    await mode('push');
    assert.deepEqual(await stats.allTextContents(), ['20,000,000', '1', '320.00', '20.000']);
    await publish();
    assert.equal(await experiment.locator('.feed-recipient-dots [data-lit=true]').count(), 120);
    await mode('pull');
    await publish();
    assert.deepEqual(await stats.allTextContents(), ['0', '300', '0.00', 'read-time']);
    assert.equal(await experiment.locator('.feed-recipient-dots [data-lit=true]').count(), 0);
    await mode('hybrid');
    await boundary(ranges.nth(2), 'Home');
    assert.equal(await ranges.nth(4).inputValue(), '0');
    assert.equal(await stats.nth(1).textContent(), '2');
    await mode('pull');
    assert.equal(await stats.nth(1).textContent(), '1');
    await mode('hybrid');
    await boundary(ranges.nth(2), 'End');
    await boundary(ranges.nth(4), 'End');
    assert.equal(await stats.nth(1).textContent(), '52');
    await boundary(ranges.nth(3), 'End');
    assert.equal(await stats.nth(1).textContent(), '51');
    assert.equal(await stats.first().textContent(), '20,000,000');
    await boundary(ranges.first(), 'End');
    assert.equal(
      await experiment.locator('.feed-publication').getAttribute('data-pulled'),
      'false',
      'Threshold uses > rather than >=',
    );
    await boundary(ranges.nth(3), 'Home');
    assert.equal(await experiment.locator('.feed-publication').getAttribute('data-pulled'), 'true');
    await mode('push');
    await boundary(ranges.nth(5), 'Home');
    assert.equal(await stats.last().textContent(), '100000.000');
    await boundary(ranges.nth(1), 'Home');
    await publish();
    assert.equal(await stats.first().textContent(), '0');
    assert.equal(await experiment.locator('.feed-recipient-dots span').count(), 0);
    await boundary(ranges.nth(1), 'End');
    await boundary(ranges.first(), 'Home');
    await publish();
    assert.equal(await stats.first().textContent(), '1');
    assert.equal(await experiment.locator('.feed-recipient-dots [data-lit=true]').count(), 1);
    const graph = source.sections.find((s) => s.id === 'architecture').diagram,
      diagram = page.locator('.architecture-explorer');
    await ready(diagram);
    assert.equal(await diagram.locator('.architecture-node').count(), 9);
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
    assert.equal(graph.traces[0].steps[3].from, 'api');
    assert.equal(graph.traces[0].steps[3].to, 'client');
    await diagram.locator('[role=tab]').first().focus();
    await page.keyboard.press('End');
    assert.equal(await diagram.locator('[role=tab]').last().getAttribute('aria-selected'), 'true');
    await diagram.locator('.architecture-node').last().focus();
    await page.keyboard.press('Enter');
    assert.equal(
      await diagram.locator('.architecture-detail p').textContent(),
      graph.nodes.at(-1).detail[locale],
    );
    const questions = page.locator('section[aria-labelledby=interview] details');
    await questions.nth(1).locator('summary').click();
    assert.ok((await questions.nth(1).innerText()).includes('20'));
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
    await boundary(ranges.first(), 'End');
    await boundary(ranges.nth(5), 'End');
    await mode('push');
    await publish();
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
        ['experiment', experiment],
        ['publication', experiment.locator('.feed-publication')],
        ['map', diagram.locator('.architecture-canvas')],
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
          path: `artifacts/news-feed-review-${locale}-${label}-${width}.png`,
        });
      }
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1500, height: 1100 });
    await experiment.locator('.feed-publication').scrollIntoViewIfNeeded();
    await publish();
    await page.waitForFunction(() => {
      const dots = document.querySelectorAll('.feed-recipient-dots span');
      return (
        dots.length === 120 &&
        getComputedStyle(dots[0]).backgroundColor !== getComputedStyle(dots[119]).backgroundColor
      );
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await publish();
    assert.equal(
      await experiment
        .locator('.feed-recipient-dots span')
        .first()
        .evaluate((el) => getComputedStyle(el).transitionProperty),
      'none',
    );
    await page.goto(`${base}/${locale === 'en' ? 'en/' : ''}ai-systems/ai-inference/`);
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    assert.equal(await page.locator('.feed-tradeoff').count(), 0);
    const kv = page
      .locator('.handbook-experiment')
      .filter({ has: page.getByText('Total KV / GB', { exact: true }) });
    assert.equal(await kv.count(), 1);
    await ready(kv);
    for (const range of await kv.locator('input').all()) await boundary(range, 'Home');
    assert.equal(await kv.locator('dd').first().textContent(), '131072');
    assert.equal(await kv.locator('dd').last().textContent(), '298');
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/news-feed-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  'News Feed: aggregate/per-author work, push/pull/hybrid controls and boundary cases, actual/reduced-motion publication, explicit publish ACK and four traces, desktop-fit map, shared KV branch, keyboard, VI/EN/mobile and18theme scans passed.',
);
