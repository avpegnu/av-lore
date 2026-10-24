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
    await page.goto(
      base + (locale === 'en' ? '/en' : '') + '/handbook/system-design/key-value-store/',
    );
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
    const replicas = labs.nth(2),
      writeActions = replicas.locator('.kv-write-actions button'),
      readActions = replicas.locator('.kv-read-actions button'),
      settings = replicas.locator('.kv-quorum-settings fieldset'),
      sloppy = replicas.locator(':scope > .worksheet-toggle input').first(),
      readRepair = replicas.locator(':scope > .worksheet-toggle input').last();
    const node = (id) => replicas.locator(`[data-kv-node="${id}"]`),
      value = (id) => node(id).locator('[data-kv-value]'),
      deliver = async (id) => replicas.locator(`[data-kv-message="${id}"]`).click(),
      reset = async () => {
        await writeActions.last().click();
        await expect(replicas.locator('[data-kv-pending]')).toHaveText('0');
      };
    await writeActions.first().click();
    await expect(replicas.locator('[data-kv-acks]')).toHaveText('0 / 2');
    await deliver('op-1:A');
    await expect(writeActions.nth(2)).toBeDisabled();
    await writeActions.nth(3).click();
    await expect(replicas.locator('[data-kv-outcome]')).toHaveText('unknown');
    await readActions.first().click();
    await expect(replicas.locator('[data-kv-read]')).toHaveText('ABSENT / NOT_FOUND');
    await node('A').locator('input').last().check();
    await node('C').locator('input').last().uncheck();
    await readActions.first().click();
    await expect(replicas.locator('[data-kv-read]')).toHaveText('v1 / value-1');
    await expect(value('B')).toHaveText('ABSENT');
    await deliver('op-1:B');
    await expect(replicas.locator('[data-kv-acks]')).toHaveText('2 / 2');
    await expect(replicas.locator('[data-kv-outcome]')).toHaveText('unknown');
    await reset();
    await writeActions.first().click();
    await deliver('op-1:A');
    await deliver('op-1:B');
    await writeActions.nth(3).click();
    await expect(replicas.locator('[data-kv-outcome]')).toHaveText('unknown');
    await reset();
    await settings.first().locator('button').first().click();
    await writeActions.first().click();
    await deliver('op-1:A');
    await writeActions.nth(2).click();
    await writeActions.nth(1).click();
    await deliver('op-2:C');
    await writeActions.nth(2).click();
    await deliver('op-1:C');
    await expect(value('C')).toHaveText('v2 / TOMBSTONE');
    await readActions.first().click();
    await expect(replicas.locator('[data-kv-read]')).toHaveText('v2 / TOMBSTONE / NOT_FOUND');
    await reset();
    for (const id of ['A', 'B', 'C']) await node(id).locator('input').first().uncheck();
    await sloppy.check();
    await writeActions.first().click();
    await deliver('op-1:A');
    await deliver('op-1:B');
    await writeActions.nth(2).click();
    await expect(replicas.locator('[data-kv-hints]')).toHaveText('2');
    for (const id of ['A', 'B', 'C']) await node(id).locator('input').first().check();
    await readActions.first().click();
    await expect(replicas.locator('[data-kv-read]')).toHaveText('ABSENT / NOT_FOUND');
    await node('D').locator('input').first().uncheck();
    await readActions.nth(1).click();
    await expect(value('A')).toHaveText('ABSENT');
    await expect(value('B')).toHaveText('v1 / value-1');
    await expect(replicas.locator('[data-kv-hints]')).toHaveText('1');
    await node('D').locator('input').first().check();
    await expect(value('A')).toHaveText('ABSENT');
    await readActions.nth(1).click();
    await expect(value('A')).toHaveText('v1 / value-1');
    await deliver('op-1:C');
    await readActions.nth(2).click();
    await expect(replicas.locator('[data-kv-hints]')).toHaveText('0');
    await expect(value('C')).toHaveText('ABSENT');
    await readActions.last().click();
    await expect(value('C')).toHaveText('v1 / value-1');
    await reset();
    for (const id of ['A', 'B', 'C']) await node(id).locator('input').first().uncheck();
    await sloppy.check();
    await writeActions.first().click();
    await deliver('op-1:A');
    await deliver('op-1:B');
    await writeActions.nth(2).click();
    await readActions.nth(2).click();
    for (const id of ['A', 'B', 'C']) await node(id).locator('input').first().check();
    await readActions.last().click();
    for (const id of ['A', 'B', 'C']) await expect(value(id)).toHaveText('ABSENT');
    await reset();
    await settings.first().locator('button').first().click();
    await writeActions.first().click();
    await deliver('op-1:A');
    await writeActions.nth(2).click();
    await node('A').locator('input').last().check();
    await node('C').locator('input').last().uncheck();
    await readRepair.check();
    await readActions.first().click();
    await expect(value('B')).toHaveText('v1 / value-1');
    await expect(value('C')).toHaveText('ABSENT');
    await node('C').locator('input').first().uncheck();
    await readActions.last().click();
    await expect(value('C')).toHaveText('ABSENT');
    await node('C').locator('input').first().check();
    await readActions.last().click();
    await expect(value('C')).toHaveText('v1 / value-1');
    await settings.last().locator('button').last().click();
    await node('C').locator('input').first().uncheck();
    await readActions.first().click();
    await expect(replicas.locator('[data-kv-read]')).toHaveText('UNAVAILABLE');
    await reset();
    await writeActions.first().click();
    await deliver('op-1:A');
    await deliver('op-1:B');
    await writeActions.nth(2).click();
    await readActions.first().click();
    await replicas.locator('summary').click();
    assert.equal(await replicas.locator('tbody tr').count(), 1);
    await replicas.locator('summary').click();
    const arithmetic = labs.nth(1),
      quorumControls = arithmetic.locator('input[type=range]');
    await quorumControls.first().focus();
    await page.keyboard.press('Home');
    for (const i of [1, 2]) {
      await quorumControls.nth(i).focus();
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowRight');
    }
    await expect(arithmetic.locator('dd').first()).toHaveText('1');
    await quorumControls.last().focus();
    await page.keyboard.press('End');
    assert.deepEqual(await arithmetic.locator('dd').allTextContents(), ['1', 'No', 'No']);
    const merkle = labs.last(),
      keys = merkle.locator('.worksheet-choices button'),
      range = merkle.locator('input[type=range]');
    assert.equal(await merkle.locator('dd').last().textContent(), '1');
    await range.focus();
    await page.keyboard.press('End');
    assert.equal(await merkle.locator('dd').nth(2).textContent(), '1');
    await keys.nth(2).click();
    assert.equal(await range.isDisabled(), true);
    assert.deepEqual(await merkle.locator('dd').allTextContents(), ['1', '1', '0', '0']);
    await keys.nth(2).click();
    await keys.nth(5).click();
    await range.focus();
    await page.keyboard.press('End');
    assert.equal(await merkle.locator('dd').nth(2).textContent(), '2');
    for (let i = 0; i < 8; i++)
      if ((await keys.nth(i).getAttribute('aria-pressed')) === 'false') await keys.nth(i).click();
    await range.focus();
    await page.keyboard.press('End');
    assert.deepEqual(await merkle.locator('dd').allTextContents(), ['15', '0', '8', '8']);
    assert.equal(await merkle.locator('.merkle-levels li[data-visited=true]').count(), 15);
    await merkle.locator('summary').click();
    assert.equal(await merkle.locator('details li').count(), 15);
    await merkle.locator('.merkle-scroll').focus();
    await page.keyboard.press('ArrowRight');
    const explorer = page.locator('.architecture-explorer');
    await explorer.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelector('.architecture-explorer')?.closest('astro-island')?.dataset
          .uiReady === 'true',
    );
    assert.equal(await explorer.locator('.architecture-node').count(), 8);
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
      const treeRoot = merkle.locator('.merkle-levels ol').first();
      assert.equal(
        await treeRoot.evaluate((el) => el.scrollWidth <= el.closest('.merkle-scroll').clientWidth),
        true,
      );
      for (const [name, target] of [
        ['map', explorer],
        ['replicas', replicas],
        ['inventory', replicas.locator('.kv-replica-grid')],
        ['pending', replicas.locator('.kv-message-grid')],
        ['merkle', merkle],
        ['ownership', page.locator('#membership')],
      ]) {
        await target.evaluate((el) =>
          scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' }),
        );
        await page.evaluate(() => document.activeElement?.blur());
        await page.waitForTimeout(150);
        await page.screenshot({ path: `artifacts/kv-review-${locale}-${name}-${width}.png` });
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
  fs.writeFileSync('artifacts/kv-browser-report.json', JSON.stringify({ report, errors }, null, 2));
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'KV: replica partial/late writes, lost success responses, tombstones, fallback/home overlap, live-only handoff/read/range repair and source loss; fixed quorum/Merkle,8nodes/4traces,VIEN/mobile/keyboard18theme accessibility passed.',
);
