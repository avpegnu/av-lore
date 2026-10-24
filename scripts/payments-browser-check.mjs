import { chromium, expect } from '@playwright/test';
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
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/payments/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.handbook-experiment');
    assert.equal(await labs.count(), 4);
    for (const lab of await labs.all()) {
      await lab.scrollIntoViewIfNeeded();
      await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
        if (el.dataset.uiReady === 'true') return;
        await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    const retry = labs.first(),
      stage = retry.locator('input[type=range]'),
      toggles = retry.locator('input[type=checkbox]'),
      policy = retry.locator('button');
    assert.equal(await retry.locator('.payment-facts strong').last().textContent(), 'UNKNOWN');
    assert.deepEqual(await retry.locator('dd').allTextContents(), ['1', '0', '0', '0']);
    await stage.focus();
    await page.keyboard.press('End');
    assert.deepEqual(await retry.locator('dd').allTextContents(), ['1', '0', '1', '0']);
    assert.equal(await retry.locator('.payment-facts strong').last().textContent(), 'CONFIRMED');
    await toggles.first().uncheck();
    assert.equal(await retry.locator('.payment-facts strong').last().textContent(), 'UNKNOWN');
    assert.equal(await retry.locator('dd').nth(2).textContent(), '0');
    await policy.nth(1).click();
    assert.equal(await retry.locator('dd').first().textContent(), '1');
    await toggles.last().uncheck();
    assert.deepEqual(await retry.locator('dd').allTextContents(), ['2', '1', '0', '1']);
    assert.equal(await retry.locator('.payment-facts strong').last().textContent(), 'UNKNOWN');
    await toggles.last().check();
    await policy.last().click();
    assert.equal(await retry.locator('dd').last().textContent(), '1');
    await stage.focus();
    await page.keyboard.press('Home');
    assert.deepEqual(await retry.locator('dd').allTextContents(), ['0', '0', '0', '0']);
    await page.keyboard.press('End');
    const ledger = labs.nth(1),
      ranges = ledger.locator('input[type=range]'),
      guard = ledger.locator('input[type=checkbox]');
    assert.deepEqual(await ledger.locator('dd').allTextContents(), [
      '16000',
      '16000',
      '4000',
      '4000',
      '3',
      '0',
    ]);
    await guard.uncheck();
    assert.deepEqual(await ledger.locator('dd').allTextContents(), [
      '39000',
      '39000',
      '21000',
      '4000',
      '0',
      '17000',
    ]);
    await guard.check();
    await ranges.last().focus();
    await page.keyboard.press('End');
    assert.equal(await ledger.locator('dd').nth(2).textContent(), '0');
    assert.equal(await ledger.locator('dd').last().textContent(), '0');
    await ledger.locator('summary').click();
    assert.equal(await ledger.locator('details section').count(), 3);
    assert.equal(await ledger.locator('tbody tr').count(), 6);
    const reserve = labs.nth(2),
      budgetControls = reserve.locator('input[type=range]'),
      atomic = reserve.locator('input[type=checkbox]'),
      evidence = reserve.locator('.refund-evidence button');
    await expect(reserve.locator('[data-refund-available]')).toHaveText('3000');
    await expect(reserve.locator('[data-refund-overbooked]')).toHaveText('0');
    await atomic.uncheck();
    await expect(reserve.locator('[data-refund-reserved]')).toHaveText('14000');
    await expect(reserve.locator('[data-refund-available]')).toHaveText('-4000');
    await expect(reserve.locator('[data-refund-overbooked]')).toHaveText('4000');
    assert.equal(await reserve.locator('.refund-allocation > div').count(), 5);
    await reserve
      .locator('.refund-allocation')
      .screenshot({ path: `artifacts/payments-review-${locale}-unsafe-allocation.png` });
    await budgetControls.last().focus();
    await page.keyboard.press('End');
    await expect(reserve.locator('[data-refund-reserved]')).toHaveText('14000');
    await evidence.last().click();
    await expect(reserve.locator('[data-refund-available]')).toHaveText('3000');
    await evidence.nth(1).click();
    await expect(reserve.locator('[data-refund-confirmed]')).toHaveText('7000');
    await expect(reserve.locator('[data-refund-available]')).toHaveText('-4000');
    await atomic.check();
    await expect(reserve.locator('[data-refund-available]')).toHaveText('3000');
    await budgetControls.nth(1).focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(reserve.locator('[data-refund-available]')).toHaveText('0');
    await evidence.last().click();
    await expect(reserve.locator('[data-refund-available]')).toHaveText('7000');
    await evidence.first().click();
    await expect(reserve.locator('[data-refund-reserved]')).toHaveText('10000');
    await budgetControls.last().focus();
    await page.keyboard.press('Home');
    await expect(reserve.locator('[data-refund-available]')).toHaveText('10000');
    await budgetControls.first().focus();
    await page.keyboard.press('End');
    await budgetControls.last().focus();
    await page.keyboard.press('End');
    await expect(reserve.locator('[data-refund-available]')).toHaveText('0');
    await budgetControls.first().focus();
    await page.keyboard.press('Home');
    await expect(reserve.locator('[data-refund-available]')).toHaveText('6000');
    const setAmount = async (control, value) => {
      await control.focus();
      await page.keyboard.press('Home');
      for (let i = 1000; i < value; i += 1000) await page.keyboard.press('ArrowRight');
    };
    await setAmount(budgetControls.first(), 7000);
    await setAmount(budgetControls.nth(1), 7000);
    await budgetControls.last().focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const recon = labs.last(),
      cases = recon.locator('.recon-cases button'),
      day = recon.locator('input[type=range]');
    await expect(recon.locator('[data-recon-matched]')).toHaveText('2');
    await expect(recon.locator('[data-recon-review]')).toHaveText('0');
    for (const [index, status] of [
      [1, 'amount-mismatch'],
      [2, 'net-mismatch'],
      [3, 'currency-mismatch'],
      [4, 'ambiguous-duplicate'],
      [5, 'missing-external'],
      [6, 'missing-internal'],
    ]) {
      await cases.nth(index).click();
      await expect(recon.locator(`[data-recon-status="${status}"]`)).toHaveCount(1);
    }
    await cases.nth(3).click();
    assert.ok((await recon.locator('tbody tr').first().innerText()).includes('10000 EUR'));
    await cases.nth(4).click();
    await recon.locator('summary').click();
    assert.equal(await recon.locator('details tbody tr').count(), 5);
    await recon.locator('summary').click();
    await cases.nth(5).click();
    await day.focus();
    await page.keyboard.press('Home');
    await expect(recon.locator('[data-recon-status=timing-open]')).toHaveCount(1);
    await day.focus();
    await page.keyboard.press('End');
    await expect(recon.locator('[data-recon-status=missing-external]')).toHaveCount(1);
    await cases.last().click();
    assert.equal(await recon.locator('.recon-table').first().locator('tbody tr').count(), 3);
    await expect(recon.locator('[data-recon-status=missing-internal]')).toHaveCount(1);
    await expect(recon.locator('[data-recon-status=missing-external]')).toHaveCount(1);
    await cases.first().click();
    const explorer = page.locator('.architecture-explorer');
    await explorer.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelector('.architecture-explorer')?.closest('astro-island')?.dataset
          .uiReady === 'true',
    );
    assert.equal(await explorer.locator('.architecture-node').count(), 11);
    assert.equal(
      await explorer
        .locator('.architecture-canvas')
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      false,
    );
    assert.equal(await explorer.locator('[role=tab]').count(), 5);
    for (const tab of await explorer.locator('[role=tab]').all()) {
      await tab.click();
      for (const step of await explorer.locator('.architecture-steps button').all()) {
        await step.click();
        assert.equal(await explorer.locator('.architecture-steps [aria-current=step]').count(), 1);
      }
    }
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.handbook-experiment')].some((el) =>
            /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText),
          ),
      );
    await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      for (const [name, target] of [
        ['map', explorer],
        ['refund', reserve],
        ['allocation', reserve.locator('.refund-allocation')],
        ['recon', recon],
        ['ledger', ledger],
        ['states', page.locator('#state-facts')],
      ]) {
        await target.evaluate((el) =>
          scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' }),
        );
        await page.evaluate(() => document.activeElement?.blur());
        await page.waitForTimeout(150);
        await page.screenshot({ path: `artifacts/payments-review-${locale}-${name}-${width}.png` });
      }
    }
    for (const theme of JSON.parse(fs.readFileSync('src/lib/themes.json'))) {
      await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
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
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1100 });
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/payments-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Payments: unknown/provider scopes, balanced duplicates, atomic/stale refund races and evidence, gross/fee/net/currency/account/duplicate/timing reconciliation,11nodes/5traces,VIEN/mobile/keyboard18theme accessibility passed.',
);
