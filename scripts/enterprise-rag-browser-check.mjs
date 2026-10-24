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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-case-rag/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.enterprise-rag-playground');
    assert.equal(await labs.count(), 3);
    for (const el of await labs.all()) await ready(el);
    const access = labs.nth(0),
      revoke = labs.nth(1),
      migration = labs.nth(2);
    const users = access.locator('.enterprise-user-grid>article');
    assert.equal(await users.count(), 3);
    assert.deepEqual(await users.nth(0).locator('dd').allTextContents(), ['0% · 0/1', '0 / 2']);
    assert.deepEqual(await users.nth(2).locator('dd').allTextContents(), ['50% · 1/2', '0 / 1']);
    await access.locator('.enterprise-actions button').first().click();
    assert.deepEqual(await users.nth(1).locator('dd').allTextContents(), ['100% · 2/2', '0 / 0']);
    await access.locator('input[type=checkbox]').check();
    assert.deepEqual(await users.nth(0).locator('dd').allTextContents(), ['0% · 0/1', '0 / 0']);
    assert.deepEqual(await users.nth(1).locator('dd').allTextContents(), ['50% · 1/2', '0 / 0']);
    await access.locator('input[type=checkbox]').uncheck();
    await access.locator('.enterprise-actions button').last().click();
    assert.equal(await users.nth(0).locator('dd').last().textContent(), '2 / 0');
    assert.equal(await users.nth(2).locator('dd').last().textContent(), '1 / 0');
    assert.ok(
      !(await access.locator('.enterprise-user-grid li>strong').allTextContents()).includes('BETA'),
    );
    await access.locator('.enterprise-actions button').nth(1).click();
    await range(access.locator('input[type=range]'), 5);
    assert.equal(await users.nth(0).locator('dd').first().textContent(), '100% · 1/1');
    await range(access.locator('input[type=range]'), 2);
    const guards = revoke.locator('input[type=checkbox]');
    assert.deepEqual(await revoke.locator('dd').allTextContents(), [
      'BLOCKED_AT_GENERATOR',
      'NO',
      'NO',
    ]);
    await guards.nth(1).uncheck();
    assert.deepEqual(await revoke.locator('dd').allTextContents(), [
      'BLOCKED_AT_ANSWER',
      'YES',
      'NO',
    ]);
    await guards.last().uncheck();
    assert.deepEqual(await revoke.locator('dd').allTextContents(), [
      'USER_DISCLOSURE',
      'YES',
      'YES',
    ]);
    await guards.nth(1).check();
    await guards.last().check();
    await revoke.locator('.enterprise-actions button').last().click();
    assert.deepEqual(await revoke.locator('dd').allTextContents(), [
      'BLOCKED_AT_ANSWER',
      'NO',
      'NO',
    ]);
    await guards.last().uncheck();
    assert.deepEqual(await revoke.locator('dd').allTextContents(), [
      'USER_DISCLOSURE',
      'NO',
      'YES',
    ]);
    await guards.last().check();
    await revoke.locator('.enterprise-actions button').first().click();
    await guards.first().uncheck();
    assert.deepEqual(await revoke.locator('dd').allTextContents(), [
      'BLOCKED_AT_GENERATOR',
      'YES',
      'NO',
    ]);
    await guards.first().check();
    await revoke.locator('.enterprise-actions button').nth(1).click();
    const flags = migration.locator('input[type=checkbox]');
    assert.deepEqual(await migration.locator('dd').allTextContents(), [
      'NOT_READY',
      'production-E1',
      'E1',
      '120',
    ]);
    await range(migration.locator('input[type=range]').nth(1), 120);
    assert.deepEqual(await migration.locator('dd').allTextContents(), [
      'QUALIFIED_FIXTURE_CUTOVER',
      'candidate-E2',
      'E2',
      '120',
    ]);
    await flags.first().uncheck();
    assert.equal(await migration.locator('dd').first().textContent(), 'NOT_READY');
    await flags.last().check();
    assert.deepEqual(await migration.locator('dd').allTextContents(), [
      'QUERY_SPACE_MISMATCH',
      'candidate-E2',
      'E1',
      '120',
    ]);
    await flags.first().check();
    await flags.nth(1).uncheck();
    assert.equal(await migration.locator('dd').first().textContent(), 'FORCED_WITH_GAPS');
    await flags.last().uncheck();
    assert.equal(await migration.locator('dd').first().textContent(), 'NOT_READY');
    await flags.nth(1).check();
    await range(migration.locator('input[type=range]').nth(1), 110);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.enterprise-rag-playground')].some((el) =>
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
            '.enterprise-rag-playground .worksheet-results>div,.enterprise-user-grid>article,.enterprise-events li,.enterprise-readiness',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/enterprise-rag-${locale}-${i}-${width}.png` });
        await labs
          .nth(i)
          .locator(i === 0 ? '.enterprise-user-grid' : '.worksheet-results')
          .first()
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/enterprise-rag-${locale}-${i}-results-${width}.png`,
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
    'artifacts/enterprise-rag-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Enterprise RAG: principal-scoped coverage/underfill/candidate misses, in-flight permission boundaries and compatible index migration evidence; VI/EN, keyboard, mobile and nine themes passed.',
);
