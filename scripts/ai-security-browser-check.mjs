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
      step = +(await el.getAttribute('step'));
    for (let i = 0; i < Math.round((n - min) / step); i++) await page.keyboard.press('ArrowRight');
    assert.equal(+(await el.inputValue()), n);
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/ai-systems/ai-safety/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.ai-security-playground');
    assert.equal(await labs.count(), 3);
    for (const el of await labs.all()) await ready(el);
    const paths = labs.nth(0),
      url = labs.nth(1),
      moderation = labs.nth(2);
    const flags = paths.locator('input[type=checkbox]'),
      pathState = paths.locator('.security-state>strong');
    assert.equal(await pathState.textContent(), 'NO_SIMULATED_DISCLOSURE');
    await flags.nth(2).check();
    await flags.nth(3).check();
    await paths.locator('.security-actions button').nth(1).click();
    assert.equal(await pathState.textContent(), 'SIMULATED_DISCLOSURE');
    assert.ok((await paths.locator('.security-state').textContent()).includes('1 / 2'));
    await flags.nth(4).check();
    await flags.nth(5).check();
    assert.ok((await paths.locator('.security-state').textContent()).includes('2 / 2'));
    await flags.nth(3).uncheck();
    assert.ok((await paths.locator('.security-state').textContent()).includes('1 / 2'));
    await flags.nth(4).uncheck();
    assert.equal(await pathState.textContent(), 'NO_SIMULATED_DISCLOSURE');
    await flags.nth(4).check();
    await flags.first().uncheck();
    assert.equal(await pathState.textContent(), 'NO_SIMULATED_DISCLOSURE');
    assert.deepEqual(await paths.locator('.security-paths article>strong').allTextContents(), [
      'NO_ATTACK_ATTEMPT',
      'NO_ATTACK_ATTEMPT',
    ]);
    await flags.first().check();
    await flags.nth(1).uncheck();
    assert.deepEqual(await paths.locator('.security-paths article>strong').allTextContents(), [
      'NO_PRIVATE_PAYLOAD',
      'NO_PRIVATE_PAYLOAD',
    ]);
    await flags.nth(1).check();
    for (const i of [2, 3, 4, 5]) await flags.nth(i).uncheck();
    await paths.locator('.security-actions button').first().click();
    const urlFlags = url.locator('input[type=checkbox]'),
      urlState = url.locator('.security-state>strong');
    assert.equal(await urlState.textContent(), 'BLOCKED');
    assert.ok((await url.locator('.security-boundaries').textContent()).includes('HOST_DENIED'));
    await urlFlags.first().uncheck();
    assert.equal(await urlState.textContent(), 'UNSAFE_FIXTURE_ALLOW');
    await urlFlags.first().check();
    await url.locator('.security-actions button').nth(2).click();
    assert.equal(await urlState.textContent(), 'BLOCKED');
    assert.ok(
      (await url.locator('.security-boundaries').textContent()).includes('DESTINATION_DENIED'),
    );
    await urlFlags.nth(1).uncheck();
    assert.equal(await urlState.textContent(), 'UNSAFE_FIXTURE_ALLOW');
    await urlFlags.nth(1).check();
    await url.locator('.security-actions button').last().click();
    assert.equal(await urlState.textContent(), 'BLOCKED');
    assert.ok(
      (await url.locator('.security-boundaries').textContent()).includes('REDIRECT_TARGET_DENIED'),
    );
    await urlFlags.last().uncheck();
    assert.equal(await urlState.textContent(), 'UNSAFE_FIXTURE_ALLOW');
    await urlFlags.last().check();
    await url.locator('.security-actions button').first().click();
    assert.equal(await urlState.textContent(), 'FIXTURE_ALLOW_NOT_PROOF');
    await url.locator('.security-actions button').nth(1).click();
    assert.deepEqual(await moderation.locator('dd').allTextContents(), [
      '50.0%',
      '33.3%',
      '60.0%',
      '1.5%',
    ]);
    assert.equal(await moderation.locator('.security-case-grid article').count(), 12);
    assert.ok(
      (await moderation.locator('.security-base-rate').textContent()).includes(
        'TP: 50.0 · FP: 3300.0',
      ),
    );
    await range(moderation.locator('input[type=range]').first(), 1);
    assert.deepEqual(await moderation.locator('dd').allTextContents(), [
      '0.0%',
      '0.0%',
      'NONE',
      'NONE',
    ]);
    await range(moderation.locator('input[type=range]').first(), 0);
    assert.deepEqual(await moderation.locator('dd').allTextContents(), [
      '100.0%',
      '100.0%',
      '50.0%',
      '1.0%',
    ]);
    await range(moderation.locator('input[type=range]').nth(1), 50);
    assert.equal(await moderation.locator('dd').last().textContent(), '50.0%');
    await range(moderation.locator('input[type=range]').first(), 0.7);
    assert.equal(await moderation.locator('dd').last().textContent(), '60.0%');
    await range(moderation.locator('input[type=range]').nth(1), 1);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.ai-security-playground')].some((el) =>
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
            '.ai-security-playground .worksheet-results>div,.security-state,.security-paths article,.security-boundaries li,.security-case-grid article',
          )
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/ai-security-${locale}-${i}-${width}.png` });
        await labs
          .nth(i)
          .locator(i === 2 ? '.worksheet-results' : '.security-state')
          .first()
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `artifacts/ai-security-${locale}-${i}-results-${width}.png`,
        });
      }
    }
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1100 });
  }
  for (const theme of JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'))) {
    await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
    const a = await new AxeBuilder({ page })
      .include('.rich-handbook')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    report.push({
      theme: theme.id,
      violations: a.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    });
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/ai-security-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'AI security: separate tool/renderer paths, parsed host/connection/redirect boundaries, moderation confusion counts and prevalence-dependent precision; VI/EN, keyboard, mobile and nine themes passed.',
);
