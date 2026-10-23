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
      viewport: { width: 1500, height: 1050 },
      reducedMotion: 'reduce',
    }),
    page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  const waitReady = async (lab) => {
    await lab.scrollIntoViewIfNeeded();
    await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
      if (el.dataset.uiReady === 'true') return;
      await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
    });
  };
  for (const locale of ['vi', 'en']) {
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/chat/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.handbook-experiment');
    assert.equal(await labs.count(), 2);
    for (const lab of await labs.all()) await waitReady(lab);
    const routes = labs.first(),
      phase = routes.locator('input[type=range]'),
      stale = routes.locator('input[type=checkbox]');
    assert.equal(await routes.locator('dd').nth(1).textContent(), '2');
    await stale.check();
    await phase.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await routes.locator('dd').nth(1).textContent(), '1');
    assert.equal(await routes.locator('dd').nth(2).textContent(), '1');
    await stale.uncheck();
    assert.equal(await routes.locator('dd').nth(1).textContent(), '2');
    await phase.focus();
    await page.keyboard.press('End');
    assert.equal(await routes.locator('dd').first().textContent(), '0');
    await stale.check();
    assert.equal(await routes.locator('dd').last().textContent(), '2');
    const sync = labs.last(),
      deliveries = sync.locator('input[type=range]'),
      catchup = sync.locator('input[type=checkbox]');
    assert.equal(await sync.locator(':scope > .worksheet-results dd').first().textContent(), '1');
    assert.equal(await sync.locator(':scope > .worksheet-results dd').nth(1).textContent(), '3');
    assert.equal(await sync.locator(':scope > .worksheet-results dd').nth(2).textContent(), '1');
    assert.equal(await sync.locator(':scope > .worksheet-results dd').last().textContent(), '2');
    await catchup.check();
    assert.equal(await sync.locator(':scope > .worksheet-results dd').first().textContent(), '8');
    const devices = sync.locator('.chat-devices'),
      phone = devices.locator('[data-chat-device=phone]'),
      desktop = devices.locator('[data-chat-device=desktop]'),
      status = (seq) => devices.locator(`[data-chat-message="${seq}"] [data-chat-status]`);
    await expect(devices.locator('[data-chat-committed]')).toHaveText('2');
    await expect(phone.locator('[data-chat-cursor]')).toHaveText('2');
    await expect(desktop.locator('[data-chat-cursor]')).toHaveText('1');
    await expect(desktop.locator('[data-chat-sync]')).toBeDisabled();
    await devices.locator('[data-chat-commit]').click();
    await expect(status(3)).toHaveText('accepted');
    await phone.locator('[data-chat-deliver]').click();
    await expect(status(3)).toHaveText('delivered');
    await phone.locator('[data-chat-open]').click();
    await expect(status(3)).toHaveText('read');
    await expect(devices.locator('[data-chat-read]')).toHaveText('3');
    await desktop.locator('[data-chat-toggle]').click();
    await expect(desktop.locator('[data-chat-cursor]')).toHaveText('1');
    await desktop.locator('[data-chat-sync]').click();
    await expect(desktop.locator('[data-chat-cursor]')).toHaveText('3');
    await expect(desktop.locator('[data-chat-device-read]')).toHaveText('1');
    await desktop.locator('[data-chat-open]').click();
    await expect(desktop.locator('[data-chat-device-read]')).toHaveText('3');
    await devices.locator('[data-chat-reset]').click();
    await devices.locator('[data-chat-pair]').click();
    await expect(devices.locator('[data-chat-committed]')).toHaveText('4');
    await expect(phone.locator('[data-chat-cursor]')).toHaveText('2');
    await expect(phone.locator('[data-chat-buffer]')).toHaveText('4');
    await phone.locator('[data-chat-duplicate]').click();
    await expect(phone.locator('[data-chat-buffer]')).toHaveText('4');
    await phone.locator('[data-chat-open]').click();
    await expect(devices.locator('[data-chat-read]')).toHaveText('2');
    await expect(status(4)).toHaveText('accepted');
    await phone.locator('[data-chat-deliver]').click();
    await expect(phone.locator('[data-chat-cursor]')).toHaveText('4');
    await expect(phone.locator('[data-chat-buffer]')).toHaveText('—');
    await expect(status(4)).toHaveText('delivered');
    await expect(devices.locator('[data-chat-read]')).toHaveText('2');
    await phone.locator('[data-chat-open]').click();
    await expect(status(4)).toHaveText('read');
    await expect(desktop.locator('[data-chat-cursor]')).toHaveText('1');
    await phone.locator('[data-chat-toggle]').click();
    await devices.locator('[data-chat-commit]').click();
    await expect(status(5)).toHaveText('accepted');
    await expect(phone.locator('[data-chat-deliver]')).toBeDisabled();
    await desktop.locator('[data-chat-toggle]').click();
    await desktop.locator('[data-chat-sync]').click();
    await expect(status(5)).toHaveText('delivered');
    await expect(devices.locator('[data-chat-read]')).toHaveText('4');
    await devices.locator('[data-chat-reset]').focus();
    await page.keyboard.press('Enter');
    await expect(devices.locator('[data-chat-committed]')).toHaveText('2');
    for (let i = 0; i < 18; i++) await devices.locator('[data-chat-commit]').click();
    await expect(devices.locator('[data-chat-committed]')).toHaveText('20');
    await expect(devices.locator('[data-chat-commit]')).toBeDisabled();
    await expect(devices.locator('[data-chat-pair]')).toBeDisabled();
    await devices.locator('[data-chat-reset]').click();
    await devices.locator('[data-chat-pair]').click();
    const explorer = page.locator('.architecture-explorer');
    await waitReady(explorer);
    const svg = explorer.locator('.architecture-canvas svg');
    assert.equal(await explorer.locator('.architecture-node').count(), 10);
    expect(await svg.evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(
      await explorer.locator('.architecture-canvas').evaluate((el) => el.clientWidth),
    );
    for (const tab of await explorer.locator('[role=tab]').all()) {
      await tab.click();
      for (const step of await explorer.locator('.architecture-steps button').all()) {
        await step.click();
        await expect(explorer.locator('.architecture-steps [aria-current=step]')).toHaveCount(1);
      }
    }
    assert.equal(await sync.locator('.chat-sync-lanes section').first().locator('code').count(), 8);
    await catchup.uncheck();
    await deliveries.focus();
    await page.keyboard.press('End');
    assert.equal(await sync.locator(':scope > .worksheet-results dd').first().textContent(), '8');
    assert.equal(await sync.locator(':scope > .worksheet-results dd').nth(2).textContent(), '1');
    await deliveries.focus();
    await page.keyboard.press('Home');
    assert.equal(await sync.locator(':scope > .worksheet-results dd').first().textContent(), '0');
    await catchup.check();
    assert.equal(await sync.locator(':scope > .worksheet-results dd').first().textContent(), '8');
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.handbook-experiment')].some((el) =>
            /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText),
          ),
      );
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1050 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      for (let i = 0; i < 2; i++) {
        await labs.nth(i).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/chat-${locale}-${i}-${width}.png` });
      }
      for (const [name, target] of [
        ['devices', devices],
        ['map', explorer],
      ]) {
        await page.addStyleTag({ content: '* { scroll-behavior:auto!important; }' });
        await target.evaluate((el) =>
          window.scrollTo({
            top: el.getBoundingClientRect().top + scrollY - 100,
            behavior: 'instant',
          }),
        );
        await page.evaluate(() => document.activeElement?.blur());
        await page.waitForTimeout(150);
        await page.screenshot({ path: `artifacts/chat-review-${locale}-${name}-${width}.png` });
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
    await page.setViewportSize({ width: 1500, height: 1050 });
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/chat-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Chat: session generations, stale routing, contiguous sync, duplicate/gap handling, two independent device cursors/receipts/read markers, reconnect vs sync, bounded history, desktop-fit map/all traces, keyboard, VI/EN/mobile and18theme accessibility passed.',
);
