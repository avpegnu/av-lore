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
    }),
    page = await context.newPage();
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
    const min = +((await el.getAttribute('min')) || 0),
      step = +((await el.getAttribute('step')) || 1);
    assert.ok(step > 0 && Number.isFinite((n - min) / step));
    for (let i = 0; i < Math.round((n - min) / step); i++) await page.keyboard.press('ArrowRight');
    assert.equal(+(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-inference/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const kv = page.locator('[data-kind="kv-budget"]'),
      roof = page.locator('.concept-worksheet');
    await ready(kv);
    await ready(roof);
    assert.deepEqual(await kv.locator('dd').allTextContents(), ['131072', '1.074', '17.18', '37']);
    const verdict = await kv.locator('.worksheet-verdict').textContent();
    await range(kv.locator('input[type=range]').first(), 16384);
    await range(kv.locator('input[type=range]').last(), 24);
    assert.deepEqual(await kv.locator('dd').allTextContents(), ['131072', '2.147', '51.54', '18']);
    assert.notEqual(await kv.locator('.worksheet-verdict').textContent(), verdict);
    await range(kv.locator('input[type=range]').last(), 1);
    assert.equal(await kv.locator('dd').nth(2).textContent(), '2.15');
    await range(kv.locator('input[type=range]').first(), 8192);
    await range(kv.locator('input[type=range]').last(), 16);
    assert.deepEqual(await roof.locator('dd').allTextContents(), [
      '24.59',
      '1.28',
      '40.7',
      '651',
      '10.41',
      '24.59',
    ]);
    const roofVerdict = await roof.locator('.worksheet-verdict').textContent();
    await range(roof.locator('input[type=range]').first(), 64);
    assert.equal(await roof.locator('dd').first().textContent(), '50.36');
    assert.equal(await roof.locator('dd').nth(2).textContent(), '19.9');
    assert.equal(await roof.locator('dd').nth(3).textContent(), '1271');
    assert.notEqual(await roof.locator('.worksheet-verdict').textContent(), roofVerdict);
    await range(roof.locator('input[type=range]').first(), 16);
    await range(roof.locator('input[type=range]').last(), 32768);
    assert.equal(await roof.locator('dd').last().textContent(), '84.72');
    assert.equal(await roof.locator('dd').nth(2).textContent(), '11.8');
    await range(roof.locator('input[type=range]').last(), 4096);
    await range(roof.locator('input[type=range]').first(), 1);
    assert.equal(await roof.locator('dd').last().textContent(), '16.54');
    assert.equal(await roof.locator('dd').nth(2).textContent(), '60.5');
    await range(roof.locator('input[type=range]').first(), 16);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.handbook-experiment')].some((el) =>
            /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText),
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
          .locator('.worksheet-results>div,.worksheet-verdict')
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (const [name, el] of [
        ['kv', kv],
        ['roofline', roof],
      ]) {
        await el.evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/inference-${locale}-${name}-${width}.png` });
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
    'artifacts/inference-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  'Inference: KV payload budgets/units and roofline bounds with infeasible configurations; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
