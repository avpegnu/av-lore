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
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/file-sync/');
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.handbook-experiment');
    assert.equal(await labs.count(), 2);
    for (const lab of await labs.all()) {
      await lab.scrollIntoViewIfNeeded();
      await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
        if (el.dataset.uiReady === 'true') return;
        await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    const chunks = labs.first(),
      range = chunks.locator(':scope > .worksheet-inputs input[type=range]'),
      choices = chunks.locator(':scope > .worksheet-choices button');
    assert.deepEqual(await chunks.locator(':scope > .worksheet-results dd').allTextContents(), [
      '16',
      '4',
      '3',
      '1',
    ]);
    await choices.nth(1).click();
    assert.deepEqual(await chunks.locator(':scope > .worksheet-results dd').allTextContents(), [
      '17',
      '17',
      '0',
      '5',
    ]);
    assert.equal(
      await chunks.locator('.sync-chunk-list').last().locator('li[data-reused=false]').count(),
      5,
    );
    await choices.last().click();
    assert.equal(await chunks.locator(':scope > .worksheet-results dd').nth(1).textContent(), '4');
    await range.focus();
    await page.keyboard.press('End');
    assert.equal(await chunks.locator(':scope > .worksheet-results dd').nth(2).textContent(), '2');
    await choices.first().click();
    assert.equal(await chunks.locator(':scope > .worksheet-results dd').nth(1).textContent(), '8');
    await range.focus();
    await page.keyboard.press('Home');
    assert.equal(await chunks.locator(':scope > .worksheet-results dd').nth(1).textContent(), '2');
    const boundary = chunks.locator('.sync-boundary-lab'),
      editors = boundary.locator('textarea'),
      methods = boundary.locator('[data-boundary-mode]'),
      operations = boundary.locator('.worksheet-choices button'),
      settings = boundary.locator('input[type=range]');
    await expect(methods.first().locator('[data-boundary-upload]')).toHaveText('205');
    await expect(methods.last().locator('[data-boundary-upload]')).toHaveText('19');
    assert.equal(
      await methods.last().locator('.boundary-chunks').last().locator('[data-new=false]').count(),
      8,
    );
    await operations.nth(2).click();
    for (const method of await methods.all())
      await expect(method.locator('[data-boundary-upload]')).toHaveText('0');
    await operations.nth(1).click();
    await expect(methods.first().locator('[data-boundary-upload]')).toHaveText('32');
    await settings.first().focus();
    await page.keyboard.press('End');
    await expect(methods.first().locator('[data-boundary-upload]')).toHaveText('64');
    await settings.last().focus();
    await page.keyboard.press('End');
    await expect(settings.last()).toHaveValue('6');
    await settings.last().focus();
    await page.keyboard.press('Home');
    await expect(settings.last()).toHaveValue('3');
    await editors.first().fill('a'.repeat(32));
    await editors.last().fill('b'.repeat(64));
    await settings.first().focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await expect(methods.first().locator('[data-boundary-upload]')).toHaveText('32');
    assert.equal(await methods.first().locator('.boundary-chunks').last().locator('li').count(), 2);
    await editors.first().fill('');
    await editors.last().fill('Tiếng Việt 👩🏽‍💻');
    const utf8Bytes = new TextEncoder().encode('Tiếng Việt 👩🏽‍💻').length;
    for (const method of await methods.all()) {
      await expect(method.locator('[data-boundary-bytes]')).toHaveText(String(utf8Bytes));
      await expect(method.locator('[data-boundary-upload]')).toHaveText(String(utf8Bytes));
    }
    await editors.first().fill('👩word');
    await operations.nth(1).click();
    await expect(editors.last()).toHaveValue('Xword');
    await editors.last().fill('');
    for (const method of await methods.all())
      await expect(method.locator('[data-boundary-upload]')).toHaveText('0');
    await operations.last().click();
    await expect(methods.last().locator('[data-boundary-upload]')).toHaveText('19');
    for (const summary of await boundary.locator('summary').all()) await summary.click();
    assert.equal(await methods.last().locator('details li').count(), 9);
    for (const summary of await boundary.locator('summary').all()) await summary.click();
    const conflict = labs.last(),
      stage = conflict.locator('input[type=range]'),
      guard = conflict.locator('input[type=checkbox]');
    assert.deepEqual(await conflict.locator('dd').allTextContents(), ['6', '1', '1', '0']);
    await guard.uncheck();
    assert.deepEqual(await conflict.locator('dd').allTextContents(), ['7', '0', '1', '1']);
    assert.equal(
      await conflict.locator('.sync-file-state section').first().locator('code').textContent(),
      'B edit',
    );
    await guard.check();
    await stage.focus();
    await page.keyboard.press('End');
    assert.deepEqual(await conflict.locator('dd').allTextContents(), ['6', '0', '2', '0']);
    assert.equal(
      await conflict.locator('.sync-file-state section').last().locator('code').textContent(),
      'report (conflicted B).bin',
    );
    await conflict.locator('button').last().click();
    assert.equal(
      await conflict.locator('.sync-file-state section').first().locator('code').textContent(),
      'B edit',
    );
    assert.equal(
      await conflict.locator('.sync-file-state section').last().locator('code').textContent(),
      'report (conflicted A).bin',
    );
    await stage.focus();
    await page.keyboard.press('Home');
    assert.deepEqual(await conflict.locator('dd').allTextContents(), ['5', '0', '1', '0']);
    await stage.fill('3');
    await stage.dispatchEvent('input');
    await stage.dispatchEvent('change');
    const explorer = page.locator('.architecture-explorer');
    await explorer.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelector('.architecture-explorer')?.closest('astro-island')?.dataset
          .uiReady === 'true',
    );
    assert.equal(await explorer.locator('.architecture-node').count(), 9);
    assert.equal(
      await explorer
        .locator('.architecture-canvas')
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      false,
    );
    assert.equal(await explorer.locator('[role=tab]').count(), 4);
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
        ['boundaries', boundary],
        ['chunks', boundary.locator('.boundary-comparison')],
        ['journal', page.locator('#journal')],
        ['conflict', conflict],
      ]) {
        await target.evaluate((el) =>
          scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' }),
        );
        await page.evaluate(() => document.activeElement?.blur());
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `artifacts/file-sync-review-${locale}-${name}-${width}.png`,
        });
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
    'artifacts/file-sync-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'File Sync: editable UTF-8/fixed/CDC boundaries, exact reuse/unique transfer, repeated chunks, Unicode codepoint edits, guarded conflicts/keep-both,9nodes/4traces,VIEN/mobile/keyboard and18theme accessibility passed.',
);
