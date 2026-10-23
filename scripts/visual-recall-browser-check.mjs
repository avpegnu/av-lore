import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const lessons = fs
  .readdirSync('src/content/handbook')
  .map((f) => JSON.parse(fs.readFileSync('src/content/handbook/' + f, 'utf8')));
const topicCount = fs.readdirSync('src/content/topics').filter((f) => f.endsWith('.json')).length;
const expected = topicCount + lessons.filter((l) => l.id !== 'cheat-sheet' && l.overview).length;
const themes = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'));
const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  }),
  errors = [],
  report = [];
fs.mkdirSync('artifacts', { recursive: true });
try {
  for (const locale of ['vi', 'en']) {
    const context = await browser.newContext({
        viewport: { width: 1500, height: 1100 },
        reducedMotion: 'reduce',
      }),
      page = await context.newPage();
    page.on('pageerror', (e) => errors.push(String(e)));
    page.setDefaultTimeout(20000);
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/system-design/cheat-sheet/');
    const tool = page.locator('.visual-recall');
    await tool.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelector('.visual-recall')?.closest('astro-island')?.dataset.uiReady ===
        'true',
    );
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const storage = await page.evaluate(() => ({
      review: localStorage.getItem('av-lore-daily-review-v1'),
      study: localStorage.getItem('it-basic-notes-interview-v1'),
    }));
    const query = tool.locator('input'),
      group = tool.locator('select'),
      cards = tool.locator('.visual-map'),
      actions = tool.locator('.visual-actions');
    assert.equal(await cards.count(), 8);
    assert.ok((await tool.locator('.visual-count').textContent()).includes(String(expected)));
    await tool.locator('.visual-more').click();
    assert.equal(await cards.count(), 16);
    await actions.locator('button').first().focus();
    await page.keyboard.press('Space');
    assert.equal(await actions.locator('button').first().getAttribute('aria-pressed'), 'true');
    assert.equal(await tool.locator('.visual-map-answer').count(), 0);
    assert.equal(await tool.locator('.visual-step-text strong').count(), 0);
    await cards.first().locator('button').focus();
    await page.keyboard.press('Space');
    assert.equal(await cards.first().locator('button').getAttribute('aria-expanded'), 'true');
    assert.equal(await tool.locator('.visual-map-answer').count(), 1);
    await actions.locator('button').nth(1).click();
    assert.equal(await tool.locator('.visual-map-answer').count(), 0);
    await group.selectOption('notes');
    assert.equal(Number(await tool.locator('.visual-count strong').textContent()), topicCount);
    await group.selectOption('foundation');
    assert.equal(await cards.count(), 4);
    await query.fill('yeu cau');
    assert.ok((await cards.count()) > 0);
    await query.fill('[.*<script>');
    assert.equal(await cards.count(), 0);
    assert.equal(await tool.locator('.visual-empty').count(), 1);
    await actions.locator('button').last().click();
    assert.equal(await cards.count(), 8);
    assert.equal(
      await tool.locator('.visual-map-answer').count(),
      0,
      'Clearing filters keeps self-test active',
    );
    await actions.locator('button').first().click();
    assert.equal(await tool.locator('.visual-map-answer').count(), 8);
    await group.selectOption('notes');
    while (await tool.locator('.visual-more').count()) await tool.locator('.visual-more').click();
    assert.equal(await cards.count(), topicCount);
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          !/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(document.querySelector('.visual-recall').innerText),
      );
    const href = await cards.last().locator('a').getAttribute('href');
    assert.ok(href.includes(locale === 'en' ? '/en/handbook/' : '/handbook/'));
    assert.ok(href.endsWith('#quick'));
    await group.selectOption('all');
    while (await tool.locator('.visual-more').count()) await tool.locator('.visual-more').click();
    assert.equal(await cards.count(), expected, 'All authoritative maps are reachable');
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          !/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(document.querySelector('.visual-recall').innerText),
      );
    for (const m of lessons.filter((l) => l.id !== 'cheat-sheet' && l.overview)) {
      const card = tool.locator(`[data-map-id="handbook:${m.id}"]`);
      assert.equal(await card.locator('.visual-map-path li').count(), m.overview.steps.length);
      assert.ok(
        (await card.innerText()).includes(m.takeaways[0][locale]),
        m.id + ' canonical takeaway',
      );
    }
    assert.deepEqual(
      await page.evaluate(() => ({
        review: localStorage.getItem('av-lore-daily-review-v1'),
        study: localStorage.getItem('it-basic-notes-interview-v1'),
      })),
      storage,
      'Visual self-test preserves study schedules',
    );
    await group.selectOption('foundation');
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      await tool.evaluate((el) =>
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 95),
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
        'Page overflow ' + locale + '/' + width,
      );
      assert.deepEqual(
        await tool
          .locator('.visual-map,.visual-controls,.visual-step-text')
          .evaluateAll((es) =>
            es.filter((e) => e.scrollWidth > e.clientWidth + 2).map((e) => e.className),
          ),
        [],
      );
      await page.screenshot({ path: `artifacts/visual-recall-${locale}-${width}.png` });
      await actions.locator('button').first().click();
      await page.screenshot({ path: `artifacts/visual-recall-${locale}-${width}-self-test.png` });
      await actions.locator('button').first().click();
    }
    await page.setViewportSize({ width: 1500, height: 1100 });
    for (const theme of themes) {
      await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
      for (const selfTest of [false, true]) {
        if (
          (await actions.locator('button').first().getAttribute('aria-pressed')) !==
          String(selfTest)
        )
          await actions.locator('button').first().click();
        const a = await new AxeBuilder({ page })
          .include('.rich-handbook')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        report.push({
          locale,
          theme: theme.id,
          selfTest,
          violations: a.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/visual-recall-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  `Visual recall: all ${expected} canonical maps, filters/accents, hidden/revealed answers, keyboard, unchanged study data, VI/EN including later-loaded maps, mobile and nine themes passed.`,
);
