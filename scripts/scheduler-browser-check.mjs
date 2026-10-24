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
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/job-scheduler/',
    );
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.scheduler-playground');
    assert.equal(await labs.count(), 3);
    for (const lab of await labs.all()) {
      await lab.scrollIntoViewIfNeeded();
      await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
        if (el.dataset.uiReady === 'true') return;
        await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    const lease = labs.nth(0),
      catchup = labs.nth(1),
      dst = labs.nth(2),
      values = () => lease.locator('dd').allTextContents();
    assert.equal((await values())[2], '2 / 80');
    await lease.locator('input[type=checkbox]').check();
    assert.equal((await values())[2], '1 / 40');
    await lease.locator('input[type=checkbox]').uncheck();
    await lease.locator('[data-sink=idempotent]').click();
    assert.equal((await values())[2], '1 / 40');
    await lease.locator('[data-sink=authority-and-idempotent]').click();
    await rangeTo(lease.locator('input[type=range]'), 3);
    assert.equal((await values())[2], '0 / 0');
    assert.equal(
      await lease.locator('.scheduler-attempts strong').first().textContent(),
      'STALE_AUTHORITY',
    );
    await rangeTo(lease.locator('input[type=range]'), 4);
    assert.equal((await values())[2], '1 / 40');
    await lease.locator('[data-sink=none]').click();
    await rangeTo(lease.locator('input[type=range]'), 5);
    assert.deepEqual((await values()).slice(2), ['2 / 80', 'REJECTED_STALE_ATTEMPT']);
    assert.deepEqual(await catchup.locator('dd').allTextContents(), ['30', '40', '30']);
    await catchup.locator('[data-policy=latest]').click();
    assert.deepEqual(await catchup.locator('dd').allTextContents(), ['40', '—', '40']);
    await catchup.locator('[data-policy=skip]').click();
    assert.equal(await catchup.locator('dd').first().textContent(), '—');
    await catchup.locator('[data-policy=all]').click();
    await rangeTo(catchup.locator('input[type=range]').nth(2), 2);
    assert.deepEqual(await catchup.locator('dd').allTextContents(), ['30, 40', '—', '40']);
    await rangeTo(catchup.locator('input[type=range]').first(), 60);
    assert.equal(await catchup.locator('dd').first().textContent(), '40, 50');
    assert.equal(await catchup.locator('dd').nth(1).textContent(), '60');
    await rangeTo(catchup.locator('input[type=range]').nth(1), 0);
    assert.equal(await catchup.locator('dd').first().textContent(), '60');
    assert.deepEqual(await dst.locator('dd').allTextContents(), ['0', '1', '1']);
    await dst.locator('[data-gap=next-valid]').click();
    await dst.locator('[data-fold=both]').click();
    assert.deepEqual(await dst.locator('dd').allTextContents(), ['1', '2', '3']);
    assert.equal(await dst.locator('.scheduler-dst article').count(), 3);
    assert.equal(
      await dst.locator('.scheduler-dst code').first().textContent(),
      '2026-03-08T07:00:00Z',
    );
    assert.deepEqual(
      await dst.locator('.scheduler-dst>section').last().locator('code').allTextContents(),
      ['2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z'],
    );
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.scheduler-playground')].some((el) =>
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
            '.scheduler-dst>section,.scheduler-attempts>section,.scheduler-playground .worksheet-results>div',
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
        await page.screenshot({ path: `artifacts/scheduler-${locale}-${i}-${width}.png` });
        await labs.nth(i).locator('.worksheet-results').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/scheduler-${locale}-${i}-results-${width}.png` });
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
    'artifacts/scheduler-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Scheduler: lease/sink arrival orders and guards, bounded deadline-aware catch-up, DST gap/fold identities; VI/EN, keyboard, mobile and 18 theme/locale checks passed.',
);
