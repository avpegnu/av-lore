import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore',
  themes = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8')),
  report = [],
  errors = [];
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
fs.mkdirSync('artifacts', { recursive: true });
try {
  const context = await browser.newContext({
      viewport: { width: 1500, height: 1100 },
      reducedMotion: 'reduce',
    }),
    page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  async function ready(el) {
    await el.scrollIntoViewIfNeeded();
    await el.locator('xpath=ancestor::astro-island[1]').evaluate(async (el) => {
      if (el.dataset.uiReady === 'true') return;
      await new Promise((r) => el.addEventListener('av-lore:island-ready', r, { once: true }));
    });
  }
  async function boundary(el, key) {
    await el.focus();
    await page.keyboard.press(key);
  }
  for (const locale of ['vi', 'en']) {
    await page.setViewportSize({ width: 1500, height: 1100 });
    await page.goto(`${base}/${locale === 'en' ? 'en/' : ''}system-design/unique-ids/`);
    await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const labs = page.locator('.handbook-experiment'),
      bits = labs.first(),
      issuer = bits.locator('.identifier-issuer'),
      ranges = bits.locator('input[type=range]');
    assert.equal(await labs.count(), 2);
    for (const lab of await labs.all()) await ready(lab);
    async function action(name) {
      await issuer.locator(`[data-id-action=${name}]`).click();
    }
    assert.deepEqual(await issuer.locator('dd').allTextContents(), [
      '100000000',
      '∅',
      '∅',
      '0 / 0',
      '0',
    ]);
    await action('issue');
    await action('issue');
    assert.equal(await issuer.locator('dd').nth(2).textContent(), '1');
    assert.equal(await issuer.locator('dd').last().textContent(), '2');
    const before = await issuer.locator('li code').allTextContents();
    assert.equal(before.length, 2);
    await action('back');
    await action('issue');
    assert.equal(await issuer.locator('dd').first().textContent(), '99999950');
    assert.equal(await issuer.locator('dd').nth(1).textContent(), '100000000');
    assert.equal(await issuer.locator('dd').nth(3).textContent(), '0 / 1');
    assert.deepEqual(await issuer.locator('li code').allTextContents(), before);
    await action('recover');
    await action('issue');
    assert.equal(await issuer.locator('dd').nth(2).textContent(), '0');
    assert.equal(await issuer.locator('dd').last().textContent(), '3');
    assert.ok(BigInt(await issuer.locator('li code').last().textContent()) > BigInt(before.at(-1)));
    await boundary(ranges.nth(1), 'Home');
    assert.equal(await issuer.locator('dd').last().textContent(), '0');
    await action('burst');
    assert.equal(await issuer.locator('dd').nth(2).textContent(), '15');
    assert.equal(await issuer.locator('dd').nth(3).textContent(), '16 / 1');
    assert.equal(await issuer.locator('li').count(), 3);
    await action('issue');
    assert.equal(await issuer.locator('dd').nth(3).textContent(), '0 / 1');
    assert.equal(await issuer.locator('dd').last().textContent(), '16');
    await action('tick');
    await action('issue');
    assert.equal(await issuer.locator('dd').nth(2).textContent(), '0');
    assert.equal(await issuer.locator('dd').last().textContent(), '17');
    await action('burst');
    assert.equal(await issuer.locator('dd').last().textContent(), '32');
    assert.equal(await issuer.locator('dd').nth(3).textContent(), '15 / 2');
    const samples = await issuer.locator('li code').allTextContents();
    assert.equal(samples.length, 6);
    assert.equal(new Set(samples).size, 6);
    for (const input of await ranges.all()) await boundary(input, 'End');
    assert.ok(
      BigInt(await bits.locator(':scope > code').textContent()) > BigInt(Number.MAX_SAFE_INTEGER),
    );
    assert.equal(await issuer.locator('dd').last().textContent(), '0');
    await action('burst');
    assert.equal(await issuer.locator('dd').nth(3).textContent(), '262144 / 1');
    assert.equal(await issuer.locator('li').count(), 3);
    const tree = labs.last();
    await boundary(tree.locator('input'), 'End');
    const random = await tree.locator('.leaf-pages').innerText();
    for (const mode of await tree.locator('.worksheet-choices button').all()) {
      await mode.click();
      const keys = (await tree.locator('.leaf-pages span').allTextContents()).flatMap((s) =>
        s.split(' · ').map(Number),
      );
      assert.equal(keys.length, 31);
      assert.equal(new Set(keys).size, 31);
      assert.deepEqual(
        keys,
        [...keys].sort((a, b) => a - b),
      );
    }
    assert.notEqual(await tree.locator('.leaf-pages').innerText(), random);
    assert.equal(await page.locator('section[aria-labelledby=choices] thead th').count(), 4);
    assert.equal(await page.locator('section[aria-labelledby=bits] tbody tr').count(), 3);
    const answer = page.locator('section[aria-labelledby=interview] details').first();
    await answer.locator('summary').click();
    assert.ok((await answer.innerText()).includes(locale === 'vi' ? '6.000' : '6,000'));
    if (locale === 'en')
      await page.waitForFunction(
        () => !/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(document.querySelector('main').innerText),
      );
    for (const theme of themes) {
      await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme.id);
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
    await page.evaluate(() => (document.documentElement.dataset.theme = 'github-dark'));
    await boundary(ranges.nth(1), 'Home');
    await action('burst');
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      await page.evaluate(() => document.activeElement?.blur?.());
      await issuer.evaluate((el) =>
        window.scrollTo({
          top: el.getBoundingClientRect().top + scrollY - 100,
          behavior: 'instant',
        }),
      );
      await page.waitForTimeout(150);
      await page.screenshot({ path: `artifacts/identifier-review-${locale}-issuer-${width}.png` });
      await tree.evaluate((el) =>
        window.scrollTo({
          top: el.getBoundingClientRect().top + scrollY - 100,
          behavior: 'instant',
        }),
      );
      await page.waitForTimeout(150);
      await page.screenshot({ path: `artifacts/identifier-review-${locale}-tree-${width}.png` });
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/identifier-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  'Identifiers: BigInt bit budgets, rollback refusal/recovery, sequence exhaustion without wrap, bounded batch samples, independent layout reset, both leaf-order fixtures, worked answers, keyboard, VI/EN/mobile and18theme scans passed.',
);
