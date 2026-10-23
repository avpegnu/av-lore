import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore',
  errors = [],
  report = [],
  storageKey = 'av-lore-design-studio-v1';
fs.mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
try {
  for (const locale of ['vi', 'en']) {
    const context = await browser.newContext({
        viewport: { width: 1500, height: 1100 },
        reducedMotion: 'reduce',
      }),
      page = await context.newPage();
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => {
      if (new URL(r.url()).hostname.endsWith('.test'))
        errors.push('Unexpected fixture request ' + r.url());
    });
    const href = base + (locale === 'en' ? '/en' : '') + '/system-design/studio/';
    async function ready() {
      const el = page.locator('.design-studio');
      await el.scrollIntoViewIfNeeded();
      await el.locator('xpath=ancestor::astro-island[1]').evaluate(async (i) => {
        if (i.dataset.uiReady === 'true') return;
        await new Promise((r) => i.addEventListener('av-lore:island-ready', r, { once: true }));
      });
      if (locale === 'en')
        await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
      await page.waitForFunction((k) => localStorage.getItem(k) !== null, storageKey);
      return el;
    }
    await page.goto(href);
    let studio = await ready();
    const toolbar = () => studio.locator('.studio-toolbar button'),
      prompt = () => studio.locator('.studio-prompt select');
    assert.equal(await studio.locator('.studio-svg-node').count(), 1);
    await toolbar().nth(4).click();
    assert.equal(await studio.locator('.studio-svg-node').count(), 5);
    await toolbar().nth(2).click();
    assert.equal(await studio.locator('.studio-table tbody tr').count(), 5);
    assert.ok(
      (await studio.locator('.studio-model-state').textContent()).includes(
        'ACYCLIC_OPERATION_FIXTURE',
      ),
    );
    const first = studio.locator('.studio-svg-node').first();
    await first.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    assert.equal(await studio.locator('.studio-inspector input').nth(4).inputValue(), '80');
    const beforeDrag = +(await studio.locator('.studio-inspector input').nth(4).inputValue());
    const box = await first.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20, { steps: 4 });
    await page.mouse.up();
    assert.ok(+(await studio.locator('.studio-inspector input').nth(4).inputValue()) > beforeDrag);
    await studio.locator('.studio-expand').click();
    await page.waitForFunction(() => !!document.fullscreenElement, undefined, { timeout: 10000 });
    await page.screenshot({ path: `artifacts/studio-${locale}-canvas-fullscreen.png` });
    await studio.locator('.studio-fullscreen-controls button').click();
    await page.waitForFunction(() => !document.fullscreenElement, undefined, { timeout: 10000 });
    await studio
      .locator('.studio-notes textarea')
      .fill('Evidence: delayed ACK and current authorization need review.');
    const download = page.waitForEvent('download');
    await toolbar().nth(6).click();
    const jsonDownload = await download;
    await jsonDownload.saveAs(`artifacts/studio-${locale}-draft.json`);
    const exported = JSON.parse(fs.readFileSync(`artifacts/studio-${locale}-draft.json`, 'utf8'));
    assert.equal(exported.design.nodes.length, 5);
    assert.match(exported.design.notes, /delayed ACK/);
    await prompt().selectOption('feed');
    assert.equal(await studio.locator('.studio-svg-node').count(), 1);
    await toolbar().nth(4).click();
    assert.equal(await studio.locator('.studio-svg-node').count(), 8);
    await toolbar().nth(2).click();
    assert.ok((await studio.locator('.studio-edge-list').textContent()).includes('w×25'));
    await prompt().selectOption('short-links');
    assert.equal(await studio.locator('.studio-svg-node').count(), 5);
    assert.equal(
      await studio.locator('.studio-notes textarea').inputValue(),
      exported.design.notes,
    );
    await page.reload();
    studio = await ready();
    assert.equal(await prompt().inputValue(), 'short-links');
    assert.equal(await studio.locator('.studio-svg-node').count(), 5);
    assert.equal(
      await studio.locator('.studio-notes textarea').inputValue(),
      exported.design.notes,
    );
    const file = studio.locator('input[type=file]');
    await file.setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{broken'),
    });
    assert.equal(await studio.locator('.studio-svg-node').count(), 5);
    const hostile = structuredClone(exported);
    hostile.design.nodes[0].label = '<img src="https://fixture.test/x">';
    await file.setInputFiles({
      name: 'valid.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(hostile)),
    });
    assert.equal(await page.locator('img[src*="fixture.test"]').count(), 0);
    assert.equal(await studio.locator('.studio-svg-node').count(), 5);
    await file.setInputFiles({
      name: 'restore.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(exported)),
    });
    // A harmless self-contained cycle must disable numerical inference rather than ignore a back edge.
    const cycle = structuredClone(exported);
    cycle.design.edges.push({ from: 'sql-5', to: 'service-3', reads: 1, writes: 0 });
    await file.setInputFiles({
      name: 'cycle.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(cycle)),
    });
    await toolbar().nth(2).click();
    assert.match(await studio.locator('.studio-model-state').textContent(), /STRUCTURE_ONLY_CYCLE/);
    assert.ok((await studio.locator('.studio-table tbody td').allTextContents()).includes('N/A'));
    await file.setInputFiles({
      name: 'restore.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(exported)),
    });
    await toolbar().nth(3).click();
    assert.equal(await studio.locator('.studio-comparison').count(), 1);
    assert.equal(await studio.locator('.studio-svg-node').count(), 5);
    await toolbar().nth(4).click();
    assert.equal(await studio.locator('.studio-svg-node').count(), 5);
    assert.equal(await toolbar().nth(4).getAttribute('data-armed'), 'true');
    await toolbar().nth(4).click();
    assert.equal(await studio.locator('.studio-notes textarea').inputValue(), '');
    // Connect/update/delete through the shared form, including keyboard-friendly list editing.
    await toolbar().nth(1).click();
    const list = studio.locator('.studio-list');
    assert.equal(await list.isVisible(), true);
    await list.locator('li button').first().click();
    const connect = studio.locator('.studio-connect');
    await connect.locator('select').first().selectOption('sql-5');
    await connect.locator('select').last().selectOption('gateway-2');
    await connect.locator('input').first().fill('0');
    await connect.locator('input').last().fill('0.5');
    await connect.locator('button').click();
    assert.equal(await studio.locator('.studio-edge-list li').count(), 6);
    await studio.locator('.studio-edge-list li').last().locator('button').last().click();
    assert.equal(await studio.locator('.studio-edge-list li').count(), 5);
    await toolbar().nth(2).click();
    // Prompt switching must preserve independent drafts; every example must render and review.
    for (const id of ['chat', 'checkout', 'media', 'search', 'gateway', 'custom']) {
      await prompt().selectOption(id);
      await toolbar().nth(4).click();
      assert.ok((await studio.locator('.studio-svg-node').count()) > 1);
      await toolbar().nth(2).click();
      assert.match(
        await studio.locator('.studio-model-state').textContent(),
        /ACYCLIC_OPERATION_FIXTURE/,
      );
    }
    await prompt().selectOption('feed');
    await toolbar().nth(2).click();
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      await studio.scrollIntoViewIfNeeded();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      if (width === 390) assert.equal(await studio.locator('.studio-list').isVisible(), true);
      await page.screenshot({ path: `artifacts/studio-${locale}-editor-${width}.png` });
      await studio.locator('.studio-review').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `artifacts/studio-${locale}-review-${width}.png` });
    }
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          !/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(document.querySelector('.design-studio').innerText),
      );
    await page.setViewportSize({ width: 1500, height: 1100 });
    for (const theme of JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'))) {
      await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
      const graphContrast = await studio.evaluate((root) => {
        const rgb = (c) =>
          (c.match(/[\d.]+/g) || [])
            .slice(0, 3)
            .map(Number)
            .map((v) => {
              const n = v / 255;
              return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            });
        const luminance = (c) => {
          const a = rgb(c);
          return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        };
        const ratio = (a, b) => {
          const x = luminance(a),
            y = luminance(b);
          return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
        };
        const edge = getComputedStyle(root.querySelector('.studio-svg-edge path')).stroke;
        const bg = getComputedStyle(root.querySelector('.studio-canvas-region')).backgroundColor;
        const meta = getComputedStyle(root.querySelector('.studio-node-meta')).fill;
        const tile = getComputedStyle(root.querySelector('.studio-svg-node rect')).fill;
        return { edge, edgeRatio: ratio(edge, bg), metaRatio: ratio(meta, tile) };
      });
      assert.notEqual(graphContrast.edge, 'none');
      assert.ok(
        graphContrast.edgeRatio >= 3,
        JSON.stringify({ theme: theme.id, ...graphContrast }),
      );
      assert.ok(
        graphContrast.metaRatio >= 4.5,
        JSON.stringify({ theme: theme.id, ...graphContrast }),
      );
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
    // A different tab invalidates this tab's autosave; its next edits must not overwrite the new store.
    const other = await context.newPage();
    await other.goto(href);
    const external = JSON.stringify({ version: 1, promptId: 'short-links', drafts: {} });
    await other.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: storageKey, v: external });
    await page.waitForFunction(() =>
      document.querySelector('.studio-status').textContent.match(/tab/),
    );
    await studio.locator('.studio-notes textarea').fill('UNSAVED_TAB_CHANGE');
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), storageKey), external);
    await other.close();
    await context.close();
    report.push({ locale, scenarios: 'passed' });
  }
  // Malformed persisted data must remain available for recovery, never auto-replaced with empty drafts.
  const context = await browser.newContext(),
    page = await context.newPage();
  await page.goto(base + '/system-design/studio/');
  await page.evaluate((k) => localStorage.setItem(k, '{broken'), storageKey);
  await page.reload();
  await page.locator('.design-studio').scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    document.querySelector('.studio-status')?.textContent.includes('JSON'),
  );
  assert.equal(await page.evaluate((k) => localStorage.getItem(k), storageKey), '{broken');
  await context.close();
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/design-studio-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations?.length),
  JSON.stringify(report.filter((r) => r.violations?.length)),
);
console.log(
  'Design Studio: canvas keyboard/drag, eight prompts, operation edits/review, scoped reload persistence, guarded replace, safe imports/exports, cycles, cross-tab/corrupt storage, VI/EN, mobile and nine themes passed.',
);
