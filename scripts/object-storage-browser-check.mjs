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
  for (const locale of ['vi', 'en']) {
    await page.goto(
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/object-storage/',
    );
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.handbook-experiment');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) {
      await lab.scrollIntoViewIfNeeded();
      await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
        if (el.dataset.uiReady === 'true') return;
        await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    const erasure = labs.nth(0),
      zone = erasure.locator('input[type=checkbox]').first();
    assert.deepEqual((await erasure.locator('dd').allTextContents()).slice(0, 4), [
      '12 / 12',
      '8',
      '0',
      'RECOVERABLE',
    ]);
    await zone.check();
    assert.deepEqual((await erasure.locator('dd').allTextContents()).slice(0, 4), [
      '8 / 12',
      '8',
      '4',
      'RECOVERABLE',
    ]);
    const fragment = erasure.locator('.object-domains section').nth(1).locator('button').first();
    await fragment.click();
    assert.equal(await erasure.locator('dd').nth(3).textContent(), 'UNRECOVERABLE');
    assert.equal(await erasure.locator('dd').last().textContent(), '—');
    await fragment.click();
    await erasure.locator('.object-actions').nth(1).locator('button').last().click();
    assert.deepEqual((await erasure.locator('dd').allTextContents()).slice(0, 4), [
      '4 / 12',
      '8',
      '8',
      'UNRECOVERABLE',
    ]);
    await erasure.locator('.object-actions').nth(1).locator('button').first().click();
    assert.equal(await erasure.locator('dd').nth(3).textContent(), 'RECOVERABLE');
    const upload = labs.nth(1),
      action = (a) => upload.locator(`[data-action="${a}"]`),
      reset = upload.locator('.object-actions button').last(),
      toggles = upload.locator('input[type=checkbox]');
    await action('replace-part').click();
    await action('complete').click();
    assert.equal(await upload.locator('dd').last().textContent(), 'INVALID_PART');
    assert.equal(await upload.locator('dd').nth(2).textContent(), 'OLD');
    await action('refresh-manifest').click();
    await action('complete').click();
    assert.equal(await upload.locator('dd').last().textContent(), 'EXPECTED_CHECKSUM_MISMATCH');
    await action('restore-part').click();
    await action('complete').click();
    assert.deepEqual((await upload.locator('dd').allTextContents()).slice(0, 5), [
      '4',
      '3',
      'AAABBBCCC',
      'COMPLETED',
      'KNOWN_COMPLETE',
    ]);
    await reset.click();
    await action('other-writer').click();
    await action('complete').click();
    assert.equal(await upload.locator('dd').last().textContent(), 'PRECONDITION_FAILED');
    assert.equal(await upload.locator('dd').nth(2).textContent(), 'OTHER');
    await toggles.first().uncheck();
    await action('complete').click();
    assert.equal(await upload.locator('dd').first().textContent(), '5');
    assert.equal(await upload.locator('dd').nth(2).textContent(), 'AAABBBCCC');
    await toggles.first().check();
    await reset.click();
    await action('complete-lost-ack').click();
    assert.equal(await upload.locator('dd').nth(4).textContent(), 'UNKNOWN');
    await action('reconcile').click();
    assert.equal(await upload.locator('dd').nth(4).textContent(), 'KNOWN_COMPLETE');
    await action('complete').click();
    assert.equal(await upload.locator('dd').first().textContent(), '4');
    await reset.click();
    await action('abort').click();
    await action('complete').click();
    assert.equal(await upload.locator('dd').last().textContent(), 'NO_SUCH_UPLOAD');
    assert.equal(await upload.locator('dd').nth(2).textContent(), 'OLD');
    await reset.click();
    await action('complete-lost-ack').click();
    await upload.locator('summary').click();
    const reader = labs.nth(2),
      pin = reader.locator('input[type=checkbox]'),
      clock = reader.locator('input[type=range]');
    assert.deepEqual(await reader.locator('dd').allTextContents(), ['v1', 'READING', '6']);
    await pin.uncheck();
    assert.equal(await reader.locator('dd').last().textContent(), '0');
    await clock.focus();
    await page.keyboard.press('End');
    assert.equal(await reader.locator('dd').nth(1).textContent(), 'FAILED');
    await pin.check();
    assert.equal(await reader.locator('dd').nth(1).textContent(), 'COMPLETE');
    await clock.focus();
    await page.keyboard.press('Home');
    assert.equal(await reader.locator('dd').nth(1).textContent(), 'NOT_STARTED');
    await clock.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    assert.deepEqual(await reader.locator('dd').allTextContents(), ['v1', 'READING', '6']);
    assert.equal(await reader.locator('[aria-current=step]').count(), 1);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          document
            .querySelectorAll('.handbook-experiment')[1]
            ?.querySelector('label')
            ?.textContent?.trim() === 'Publish conditionally against the expected head',
      );
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
      for (let i = 0; i < 3; i++) {
        await labs.nth(i).evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollBy(0, -96));
        await page.screenshot({ path: `artifacts/object-${locale}-${i}-${width}.png` });
      }
      for (const [label, el] of [
        ['domains', erasure.locator('.object-domains')],
        ['state', upload.locator('.worksheet-results')],
        ['reader', reader.locator('.object-reader-steps')],
      ]) {
        await el.evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollBy(0, -100));
        await page.screenshot({ path: `artifacts/object-${locale}-${label}-${width}.png` });
      }
    }
    report.push({ locale, scenarios: 'passed' });
    await page.setViewportSize({ width: 1500, height: 1100 });
    for (const theme of JSON.parse(fs.readFileSync('src/lib/themes.json'))) {
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
    'artifacts/object-storage-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Object storage: correlated-domain MDS availability, part/tag/content validation, conditional publication, unknown completion reconciliation, abort isolation and reader-pinned GC, VI/EN/mobile/keyboard and eighteen theme/locale accessibility passed.',
);
