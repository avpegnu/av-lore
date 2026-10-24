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
  async function rangeTo(el, n) {
    await el.focus();
    await page.keyboard.press('Home');
    const min = Number((await el.getAttribute('min')) || 0),
      step = Number((await el.getAttribute('step')) || 1);
    for (let i = min; i < n; i += step) await page.keyboard.press('ArrowRight');
    assert.equal(await el.inputValue(), String(n));
  }
  for (const locale of ['vi', 'en']) {
    await page.goto(
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/digital-wallet/',
    );
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.wallet-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) {
      await lab.scrollIntoViewIfNeeded();
      await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
        if (el.dataset.uiReady === 'true') return;
        await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    const recovery = labs.nth(0),
      transfer = labs.nth(1),
      holds = labs.nth(2),
      result = recovery.locator('.worksheet-results dd');
    assert.deepEqual(await result.allTextContents(), ['REPLAY_COMPLETED', '0', 'YES']);
    await recovery.locator('input[type=checkbox]').first().check();
    assert.deepEqual(await result.allTextContents(), ['COMPLETED', '1', 'YES']);
    assert.deepEqual(
      await recovery.locator('.wallet-states>section').last().locator('dd').allTextContents(),
      ['20', '60', '20'],
    );
    await rangeTo(recovery.locator('input[type=range]'), 0);
    assert.equal(await result.first().textContent(), 'REPLAY_COMPLETED');
    await rangeTo(recovery.locator('input[type=range]'), 2);
    await recovery.locator('input[type=checkbox]').first().uncheck();
    await recovery.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await result.first().textContent(), 'IDEMPOTENCY_CONFLICT');
    await recovery.locator('input[type=checkbox]').nth(1).uncheck();
    await recovery.locator('input[type=checkbox]').first().check();
    const act = (a) => transfer.locator(`[data-action="${a}"]`).click(),
      values = () => transfer.locator('.worksheet-results dd').allTextContents();
    await transfer.locator('input[type=checkbox]').nth(1).check();
    await act('reserve');
    assert.equal((await values())[2], 'FENCED_OLD_COORDINATOR');
    await transfer.locator('input[type=checkbox]').nth(1).uncheck();
    await act('reserve');
    assert.deepEqual(await values(), ['HELD', '—', 'RESERVED', '100']);
    await act('depart');
    await act('timeout');
    assert.deepEqual(await values(), ['IN_TRANSIT', '—', 'UNKNOWN_WAIT_FOR_DECISION', '100']);
    await act('commit');
    await act('cancel');
    assert.equal((await values())[2], 'DECISION_CONFLICT');
    await act('refund');
    assert.equal((await values())[2], 'REFUND_NOT_AUTHORIZED');
    await transfer.locator('input[type=checkbox]').first().uncheck();
    await act('credit');
    assert.equal((await values())[2], 'DESTINATION_PENDING');
    await transfer.locator('input[type=checkbox]').first().check();
    await act('credit');
    assert.deepEqual(await values(), ['COMPLETED', 'COMMIT', 'COMPLETED', '100']);
    await act('credit');
    assert.equal((await values())[2], 'STEP_REPLAY');
    await act('reset');
    await act('reserve');
    await act('depart');
    await act('cancel');
    await act('credit');
    assert.equal((await values())[2], 'CREDIT_NOT_AUTHORIZED');
    await act('refund');
    assert.deepEqual(await values(), ['REFUNDED', 'CANCEL', 'REFUNDED', '100']);
    await act('refund');
    assert.equal((await values())[2], 'STEP_REPLAY');
    assert.deepEqual(await holds.locator('dd').allTextContents(), [
      '100',
      '60',
      '40',
      '0',
      '0',
      '100',
    ]);
    await holds.locator('input[type=checkbox]').check();
    assert.equal(await holds.locator('dd').nth(2).textContent(), '-20');
    assert.equal(await holds.locator('dd').last().textContent(), '100');
    await holds.locator('input[type=checkbox]').uncheck();
    await holds.locator('[data-resolution=post40]').click();
    assert.deepEqual(await holds.locator('dd').allTextContents(), [
      '60',
      '0',
      '60',
      '40',
      '20',
      '100',
    ]);
    await holds.locator('[data-resolution=void]').click();
    assert.deepEqual(await holds.locator('dd').allTextContents(), [
      '100',
      '0',
      '100',
      '0',
      '60',
      '100',
    ]);
    await holds.locator('[data-resolution=post40]').click();
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.wallet-playground')].some((el) =>
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
            '.wallet-states>section,.wallet-funds>section,.wallet-requests>section,.wallet-playground .worksheet-results>div',
          )
          .evaluateAll((els) =>
            els
              .filter((el) => el.scrollWidth > el.clientWidth + 1)
              .map((el) => el.textContent.slice(0, 90)),
          ),
        [],
      );
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/wallet-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/wallet-${locale}-${i}-results-${width}.png` });
      }
    }
    report.push({ locale, scenarios: 'passed' });
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
    'artifacts/wallet-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Wallet: snapshot/result recovery, conflicting payloads, fenced transfer decisions/timeouts/step retries, atomic reservations/partial posting; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
