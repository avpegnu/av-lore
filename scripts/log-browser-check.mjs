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
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/message-queue/',
    );
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.log-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) {
      await lab.scrollIntoViewIfNeeded();
      await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
        if (el.dataset.uiReady === 'true') return;
        await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    const seek = labs.nth(0),
      rep = labs.nth(1),
      vis = labs.nth(2);
    assert.equal(await seek.locator('dd').last().textContent(), '5');
    await seek.locator('input[type=checkbox]').first().check();
    assert.equal(await seek.locator('dd').last().textContent(), '6');
    assert.equal(await seek.locator('dd').nth(3).textContent(), '4 / 0');
    await rangeTo(seek.locator('input[type=range]'), 2);
    assert.equal(await seek.locator('dd').last().textContent(), '3');
    await seek.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await seek.locator('dd').first().textContent(), 'OFFSET_OUT_OF_RANGE');
    await rangeTo(seek.locator('input[type=range]'), 12);
    assert.equal(await seek.locator('dd').first().textContent(), 'END_OF_LOG');
    await rangeTo(seek.locator('input[type=range]'), 5);
    assert.equal(await rep.locator('dd').first().textContent(), 'UNKNOWN');
    await rep.locator('[data-ack=leader]').click();
    assert.equal(await rep.locator('dd').first().textContent(), 'ACKNOWLEDGED');
    assert.equal(await rep.locator('dd').nth(1).textContent(), '4');
    await rep.locator('[data-ack=all]').click();
    await rangeTo(rep.locator('input[type=range]').first(), 3);
    assert.equal(await rep.locator('dd').first().textContent(), 'ACKNOWLEDGED');
    assert.equal(await rep.locator('dd').nth(1).textContent(), '5');
    await rep.locator('input[type=checkbox]').first().check();
    assert.equal(await rep.locator('dd').first().textContent(), 'UNKNOWN');
    await rep.locator('input[type=checkbox]').first().uncheck();
    await rangeTo(rep.locator('input[type=range]').nth(1), 3);
    assert.equal(await rep.locator('dd').first().textContent(), 'REJECTED');
    await rep.locator('[data-ack=leader]').click();
    assert.equal(await rep.locator('dd').first().textContent(), 'ACKNOWLEDGED');
    assert.equal(await rep.locator('dd').nth(1).textContent(), '4');
    assert.ok((await rep.locator('.log-replicas section').nth(1).textContent()).includes('LEO boundary: 5'));
    await rep.locator('[data-ack=all]').click();
    await rangeTo(rep.locator('input[type=range]').nth(1), 2);
    await rangeTo(rep.locator('input[type=range]').first(), 4);
    assert.equal(await rep.locator('dd').nth(3).textContent(), 'CLEAN_ISR');
    await rangeTo(rep.locator('input[type=range]').first(), 5);
    assert.equal(await rep.locator('dd').nth(3).textContent(), 'UNAVAILABLE');
    await rep.locator('input[type=checkbox]').nth(1).check();
    assert.equal(await rep.locator('dd').nth(3).textContent(), 'UNCLEAN_WITH_DATA_LOSS');
    assert.equal(await rep.locator('dd').last().textContent(), 'YES');
    assert.equal(await vis.locator('dd').last().textContent(), 'N0');
    await vis.locator('[data-tx=committed]').click();
    assert.equal(await vis.locator('dd').last().textContent(), 'N0, T1, N2, T3, N5');
    await vis.locator('[data-tx=aborted]').click();
    assert.equal(await vis.locator('dd').last().textContent(), 'N0, N2, N5');
    await rangeTo(vis.locator('input[type=range]'), 4);
    assert.equal(await vis.locator('dd').nth(1).textContent(), 'NO');
    assert.equal(await vis.locator('dd').last().textContent(), 'N0');
    await vis.locator('input[type=checkbox]').uncheck();
    assert.equal(await vis.locator('dd').last().textContent(), 'N0, T1, N2, T3');
    await vis.locator('input[type=checkbox]').check();
    await rangeTo(vis.locator('input[type=range]'), 6);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.log-playground')].some((el) =>
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
            '.log-segments>section,.log-replicas>section,.log-playground .worksheet-results>div',
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
        await page.screenshot({ path: `artifacts/log-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/log-${locale}-${i}-results-${width}.png` });
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
    'artifacts/log-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Partitioned log: sparse seeks/compaction/retention, ISR admission/ACK/failover, HW/LSO/abort filtering; VI/EN, keyboard, mobile and eighteen theme/locale checks passed.',
);
