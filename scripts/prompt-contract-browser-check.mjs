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
      if (i.dataset.uiReady === 'true') return;
      await new Promise((r) => i.addEventListener('av-lore:island-ready', r, { once: true }));
    });
  }
  async function range(el, n) {
    await el.focus();
    await page.keyboard.press('Home');
    const min = +(await el.getAttribute('min')),
      step = +((await el.getAttribute('step')) || 1);
    assert.ok(Number.isFinite(step) && step > 0);
    for (let i = 0; i < Math.round((n - min) / step); i++) await page.keyboard.press('ArrowRight');
    assert.equal(+(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-prompting/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.prompt-contract-playground');
    assert.equal(await labs.count(), 3);
    for (const el of await labs.all()) await ready(el);
    const grammar = labs.nth(0),
      validation = labs.nth(1),
      tools = labs.nth(2);
    assert.deepEqual(await grammar.locator('dd').allTextContents(), ['EOS', 'YES', '2 / 25', '6']);
    assert.equal(
      await grammar.locator('tbody tr[data-chosen=true] code').textContent(),
      '"{\\"status\\":\\""',
    );
    await grammar
      .getByRole('button', { name: locale === 'en' ? 'Next step →' : 'Bước tiếp →', exact: true })
      .click();
    assert.equal(await grammar.locator('dd').nth(2).textContent(), '5 / 25');
    await grammar
      .getByRole('button', {
        name: locale === 'en' ? 'Show last step' : 'Xem bước cuối',
        exact: true,
      })
      .click();
    assert.equal(await grammar.locator('dd').nth(2).textContent(), '1 / 25');
    await range(grammar.locator('input[type=range]'), 2);
    assert.deepEqual((await grammar.locator('dd').allTextContents()).slice(0, 2), ['LIMIT', 'NO']);
    await grammar.locator('input[type=checkbox]').uncheck();
    assert.deepEqual((await grammar.locator('dd').allTextContents()).slice(0, 2), ['EOS', 'NO']);
    assert.equal(
      await grammar.locator('.prompt-prefix').last().locator('code').textContent(),
      'Sure!',
    );
    await grammar.locator('input[type=checkbox]').check();
    await range(grammar.locator('input[type=range]'), 16);
    assert.equal(await validation.locator('dd').first().textContent(), 'SEMANTIC_MISMATCH');
    const expected = {
      syntax: 'PARSE_ERROR',
      extra: 'SCHEMA_ERROR',
      type: 'SCHEMA_ERROR',
      missing: 'SCHEMA_ERROR',
      truncated: 'PARSE_ERROR',
      refused: 'REFUSAL',
      correct: 'MATCHES_FIXTURE',
    };
    for (const [preset, status] of Object.entries(expected)) {
      await validation.getByRole('button', { name: preset, exact: true }).click();
      assert.equal(await validation.locator('dd').first().textContent(), status);
    }
    await validation.locator('input[type=checkbox]').uncheck();
    assert.equal(await validation.locator('dd').first().textContent(), 'INCOMPLETE');
    await validation.locator('input[type=checkbox]').check();
    await validation.getByRole('button', { name: 'semantic', exact: true }).click();
    const send = () =>
      tools
        .locator('.prompt-actions button')
        .filter({ hasText: locale === 'en' ? 'Send tool proposal' : 'Gửi tool proposal' })
        .click();
    await tools.getByRole('button', { name: 'Tenant beta', exact: true }).click();
    await send();
    assert.equal(await tools.locator('dd').first().textContent(), 'DENIED');
    await tools.getByRole('button', { name: 'Tenant alpha', exact: true }).click();
    await range(tools.locator('input[type=range]').first(), 1);
    await send();
    assert.equal(await tools.locator('dd').first().textContent(), 'BLOCKED');
    await range(tools.locator('input[type=range]').first(), 0);
    await range(tools.locator('input[type=range]').nth(1), 6);
    await send();
    assert.equal(await tools.locator('dd').first().textContent(), 'VERSION_CONFLICT');
    await range(tools.locator('input[type=range]').nth(1), 7);
    await send();
    assert.deepEqual(await tools.locator('dd').allTextContents(), [
      'COMMITTED_RESPONSE_LOST',
      'YES / 8',
      '1',
      '1',
    ]);
    await send();
    assert.equal(await tools.locator('dd').first().textContent(), 'REPLAYED');
    assert.equal(await tools.locator('dd').nth(2).textContent(), '1');
    await range(tools.locator('input[type=range]').nth(1), 8);
    await send();
    assert.equal(await tools.locator('dd').first().textContent(), 'KEY_MISMATCH');
    await tools.getByRole('button', { name: 'Key k2', exact: true }).click();
    await range(tools.locator('input[type=range]').nth(1), 7);
    await send();
    assert.equal(await tools.locator('dd').first().textContent(), 'VERSION_CONFLICT');
    await tools.getByRole('button', { name: 'Key k1', exact: true }).click();
    await send();
    assert.equal(await tools.locator('dd').first().textContent(), 'REPLAYED');
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.prompt-contract-playground')].some((el) =>
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
          .locator(
            '.prompt-contract-playground .worksheet-results>div,.prompt-validation-flow li,.prompt-contract-playground pre',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/prompt-contract-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/prompt-contract-${locale}-${i}-results-${width}.png`,
        });
      }
    }
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
    'artifacts/prompt-contract-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Prompt contracts: token masks/pieces/EOS/limits, envelope/parse/schema/truth ladder and authorized versioned idempotent tool effects; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
