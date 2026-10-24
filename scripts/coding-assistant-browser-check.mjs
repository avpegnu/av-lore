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
  page.on('request', (r) => {
    if (new URL(r.url()).hostname.endsWith('.test'))
      errors.push('Unexpected fixture network request: ' + r.url());
  });
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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-case-coding/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.coding-assistant-playground');
    assert.equal(await labs.count(), 3);
    for (const el of await labs.all()) await ready(el);
    const race = labs.nth(0),
      packing = labs.nth(1),
      patch = labs.nth(2);
    assert.deepEqual(await race.locator('dd').allTextContents(), ['1', 'R3', '0', '0']);
    await range(race.locator('input[type=range]').first(), 0);
    const guards = race.locator('input[type=checkbox]');
    await guards.nth(0).uncheck();
    await guards.nth(1).uncheck();
    await guards.nth(2).uncheck();
    assert.deepEqual(await race.locator('dd').allTextContents(), ['3', 'R1', '2', '0']);
    assert.equal(await race.locator('.coding-timeline article').count(), 3);
    await guards.nth(0).check();
    assert.deepEqual(await race.locator('dd').allTextContents(), ['3', 'R3', '0', '0']);
    await guards.nth(0).uncheck();
    await guards.nth(1).check();
    assert.deepEqual(await race.locator('dd').allTextContents(), ['3', 'R2', '1', '0']);
    await guards.nth(1).uncheck();
    await guards.nth(2).check();
    assert.deepEqual(await race.locator('dd').allTextContents(), ['3', 'R1', '1', '2']);
    await guards.nth(0).check();
    await guards.nth(1).check();
    await range(race.locator('input[type=range]').first(), 100);
    await range(race.locator('input[type=range]').last(), 600);
    assert.equal(await race.locator('dd').nth(1).textContent(), 'NONE');
    await range(race.locator('input[type=range]').last(), 200);
    assert.deepEqual(await packing.locator('dd').allTextContents(), [
      '1500 / 1500',
      '4',
      'NO',
      'NOT_MODELED',
    ]);
    await packing.locator('input[type=checkbox]').uncheck();
    assert.deepEqual(await packing.locator('dd').allTextContents(), [
      '1500 / 1500',
      '4',
      'YES',
      'NOT_MODELED',
    ]);
    await packing.locator('input[type=checkbox]').check();
    await range(packing.locator('input[type=range]'), 500);
    assert.deepEqual(await packing.locator('dd').allTextContents(), [
      '0 / 500',
      '0',
      'NO',
      'NOT_MODELED',
    ]);
    assert.equal(
      await packing.locator('.coding-state').textContent(),
      'REQUIRED_CONTEXT_OVER_BUDGET',
    );
    await range(packing.locator('input[type=range]'), 2500);
    assert.deepEqual(await packing.locator('dd').allTextContents(), [
      '2000 / 2500',
      '5',
      'NO',
      'NOT_MODELED',
    ]);
    await range(packing.locator('input[type=range]'), 1500);
    const flags = patch.locator('input[type=checkbox]'),
      scenarios = patch.locator('.coding-actions button');
    assert.deepEqual(await patch.locator('dd').allTextContents(), [
      'BASE_CONFLICT',
      'NO',
      'PATCH-A',
    ]);
    await flags.nth(0).uncheck();
    assert.equal(await patch.locator('dd').first().textContent(), 'TEST_EVIDENCE_MISMATCH');
    await flags.nth(1).uncheck();
    assert.equal(await patch.locator('dd').first().textContent(), 'APPROVAL_PAYLOAD_MISMATCH');
    await flags.nth(2).uncheck();
    assert.equal(await patch.locator('dd').first().textContent(), 'STALE_PATCH_APPLIED');
    for (const f of await flags.all()) await f.check();
    await scenarios.first().click();
    assert.equal(await patch.locator('dd').first().textContent(), 'APPLIED_FIXTURE');
    await scenarios.nth(2).click();
    assert.equal(await patch.locator('dd').first().textContent(), 'TEST_EVIDENCE_MISMATCH');
    await flags.nth(1).uncheck();
    assert.equal(await patch.locator('dd').first().textContent(), 'APPROVAL_PAYLOAD_MISMATCH');
    await flags.nth(2).uncheck();
    assert.equal(await patch.locator('dd').first().textContent(), 'UNTESTED_PATCH_APPLIED');
    for (const f of await flags.all()) await f.check();
    await scenarios.nth(3).click();
    assert.equal(await patch.locator('dd').first().textContent(), 'COMMIT_VERSION_CONFLICT');
    await flags.nth(3).uncheck();
    assert.equal(await patch.locator('dd').first().textContent(), 'UNSAFE_OVERWRITE');
    await scenarios.last().click();
    assert.equal(await patch.locator('dd').first().textContent(), 'PATH_SCOPE_DENIED');
    for (const f of await flags.all()) await f.check();
    await scenarios.nth(1).click();
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.coding-assistant-playground')].some((el) =>
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
            '.coding-assistant-playground .worksheet-results>div,.coding-pieces li,.coding-timeline article',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/coding-assistant-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').first().scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/coding-assistant-${locale}-${i}-results-${width}.png`,
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
    'artifacts/coding-assistant-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Coding Assistant: reordered/stale/deadline responses, bounded context/exclusions and exact patch/base/evidence/atomic apply; VI/EN, keyboard, mobile and nine themes passed.',
);
