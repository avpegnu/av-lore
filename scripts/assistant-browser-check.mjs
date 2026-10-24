import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const report = [],
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
      if (i.dataset.uiReady !== 'true')
        await new Promise((r) => i.addEventListener('av-lore:island-ready', r, { once: true }));
    });
  }
  async function range(el, n) {
    await el.focus();
    await page.keyboard.press('Home');
    const min = +(await el.getAttribute('min')),
      step = +(await el.getAttribute('step'));
    for (let i = 0; i < Math.round((n - min) / step); i++) await page.keyboard.press('ArrowRight');
    assert.equal(+(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/episodes/ep-chatgpt/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const planner = page.locator('.chat-context-playground'),
      stream = page.locator('[data-kind="prod-stream"]');
    await ready(planner);
    await ready(stream);
    const results = planner.locator('.worksheet-results dd'),
      counts = planner.locator('.context-fates dd');
    assert.deepEqual(await results.allTextContents(), ['32026', '742', '27418', '0']);
    assert.deepEqual(await counts.allTextContents(), ['27', '0', '0', '13']);
    await planner.locator('.context-strategies button').nth(1).click();
    assert.deepEqual(await counts.allTextContents(), ['26', '14', '0', '0']);
    assert.deepEqual(await results.allTextContents(), ['32326', '442', '27718', '0']);
    await planner.locator('.context-strategies button').last().focus();
    await page.keyboard.press('Enter');
    assert.deepEqual(await counts.allTextContents(), ['4', '0', '3', '33']);
    assert.deepEqual(await results.allTextContents(), ['17026', '15742', '12418', '0']);
    await planner.locator('.worksheet-choices').first().getByRole('button').first().click();
    assert.deepEqual(await results.allTextContents(), ['11776', '-3584', '7168', '3584']);
    assert.deepEqual(await counts.allTextContents(), ['0', '0', '0', '40']);
    await planner.locator('.worksheet-choices').first().getByRole('button').last().click();
    await planner.locator('.context-strategies button').first().click();
    assert.deepEqual(await counts.allTextContents(), ['40', '0', '0', '0']);
    await range(planner.locator('input[type=range]').first(), 0);
    assert.equal(await planner.locator('.context-turns li').count(), 0);
    await range(planner.locator('input[type=range]').first(), 40);
    await planner.locator('.worksheet-choices').first().getByRole('button').nth(1).click();
    assert.equal(await stream.locator('dd').first().textContent(), 'PARTIAL_FAILURE');
    await stream.locator('.prod-actions').nth(1).getByRole('button').nth(1).click();
    assert.deepEqual(await stream.locator('dd').allTextContents(), [
      'COMPLETE',
      '2',
      'FIXTURE_COMPLETE',
    ]);
    await stream.locator('.prod-actions').nth(1).getByRole('button').last().click();
    assert.equal(await stream.locator('dd').first().textContent(), 'SPLICED_ANSWER');
    await stream.locator('.prod-actions').nth(1).getByRole('button').first().click();
    await stream.locator('.prod-actions').first().getByRole('button').nth(2).click();
    assert.equal(await stream.locator('dd').first().textContent(), 'COMPLETE');
    assert.ok(
      (await stream.locator('.prod-timeline').textContent()).includes('FIRST_CONTENT_TIMEOUT'),
    );
    await range(stream.locator('input[type=range]'), 1500);
    assert.equal(await stream.locator('dd').last().textContent(), 'UNCONFIRMED');
    await range(stream.locator('input[type=range]'), 0);
    await stream.locator('.prod-actions').first().getByRole('button').last().click();
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![
            ...document.querySelectorAll('.chat-context-playground,.production-app-playground'),
          ].some((el) => /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText)),
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
            '.context-turns li,.context-legend>div,.context-fates>div,.worksheet-results>div',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (const [name, el] of [
        ['context', planner],
        ['stream', stream],
      ]) {
        await el.evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/assistant-${locale}-${name}-${width}.png` });
      }
    }
    await page.setViewportSize({ width: 1500, height: 1100 });
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
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/assistant-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  'Assistant: atomic history selection/summary/retrieval, fixed overflow, stream failure/restart/cancellation; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
