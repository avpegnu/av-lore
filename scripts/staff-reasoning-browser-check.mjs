import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore',
  lesson = JSON.parse(fs.readFileSync('src/content/handbook/staff-signals.json', 'utf8')),
  scenarios = lesson.sections.find((s) => s.workshop).workshop,
  themes = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'));
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
    page.setDefaultTimeout(20000);
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base + (locale === 'en' ? '/en' : '') + '/system-design/staff-signals/');
    const workshop = page.locator('.argument-workshop'),
      capacity = page.locator('.staff-capacity');
    for (const tool of [workshop, capacity]) {
      await tool.scrollIntoViewIfNeeded();
      await tool.locator('xpath=ancestor::astro-island[1]').evaluate(async (i) => {
        if (i.dataset.uiReady === 'true') return;
        await new Promise((r) => i.addEventListener('av-lore:island-ready', r, { once: true }));
      });
    }
    if (locale === 'en')
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    const storage = await page.evaluate(() => ({
      review: localStorage.getItem('av-lore-daily-review-v1'),
      study: localStorage.getItem('it-basic-notes-interview-v1'),
    }));
    assert.equal(await page.locator('.reasoning-transcript>section').count(), scenarios.length);
    assert.equal(await workshop.locator('.argument-evidence article').count(), 0);
    await workshop.locator('textarea').fill('My hypothesis: <script>window.fakeEffect=1</script>');
    await workshop.locator('.argument-facets button').first().focus();
    await page.keyboard.press('Space');
    assert.equal(await workshop.locator('.argument-evidence article').count(), 1);
    await page.keyboard.press('Space');
    assert.equal(await workshop.locator('.argument-evidence article').count(), 0);
    for (const scenario of scenarios) {
      await workshop.locator('select').selectOption(scenario.id);
      assert.equal(await workshop.locator('.argument-evidence article').count(), 0);
      for (let i = 0; i < scenario.claims.length; i++)
        await workshop.locator('.argument-actions button').first().click();
      assert.equal(
        await workshop.locator('.argument-evidence article').count(),
        scenario.claims.length,
      );
      assert.ok(await workshop.locator('.argument-actions button').first().isDisabled());
      await page.waitForFunction(
        ({ statement }) =>
          document.querySelector('.argument-evidence')?.innerText.includes(statement),
        { statement: scenario.claims.at(-1).statement[locale] },
      );
      const text = await workshop.locator('.argument-evidence').innerText();
      for (const c of scenario.claims)
        for (const field of ['statement', 'why', 'check'])
          assert.ok(text.includes(c[field][locale]), scenario.id + '/' + field);
    }
    await workshop.locator('select').selectOption(scenarios[0].id);
    assert.equal(
      await workshop.locator('textarea').inputValue(),
      'My hypothesis: <script>window.fakeEffect=1</script>',
    );
    assert.equal(await page.evaluate(() => window.fakeEffect), undefined);
    await workshop.locator('.argument-actions button').first().click();
    async function range(index, value) {
      const r = capacity.locator('input[type=range]').nth(index);
      await r.focus();
      const min = +(await r.getAttribute('min')),
        step = +(await r.getAttribute('step'));
      await page.keyboard.press('Home');
      for (let n = min; n < value; n += step) await page.keyboard.press('ArrowRight');
      assert.equal(+(await r.inputValue()), value);
    }
    assert.ok((await capacity.locator('.staff-runway-result').textContent()).includes('2.34'));
    await range(1, 0);
    await page.waitForFunction(
      () =>
        document.querySelector('.staff-runway-result')?.innerText.includes('No threshold') ||
        document.querySelector('.staff-runway-result')?.innerText.includes('Không có điểm'),
    );
    await range(1, 10);
    await range(0, 95);
    assert.ok((await capacity.locator('.staff-runway-result').textContent()).includes('0'));
    await range(0, 0);
    await page.waitForFunction(
      () =>
        document.querySelector('.staff-runway-result')?.innerText.includes('No threshold') ||
        document.querySelector('.staff-runway-result')?.innerText.includes('Không có điểm'),
    );
    await range(0, 60);
    await range(2, 70);
    await range(3, 35);
    assert.equal(
      await capacity.locator('.staff-survivor-result').getAttribute('data-fits'),
      'true',
    );
    assert.ok(
      (await capacity.locator('.staff-survivor-result strong').textContent()).includes('70%'),
    );
    await range(3, 50);
    assert.equal(
      await capacity.locator('.staff-survivor-result').getAttribute('data-fits'),
      'false',
    );
    assert.ok(
      (await capacity.locator('.staff-survivor-result strong').textContent()).includes('100%'),
    );
    await capacity.locator('select').first().selectOption('3');
    await capacity.locator('select').last().selectOption('2');
    assert.ok(
      (await capacity.locator('.staff-survivor-result strong').textContent()).includes('150%'),
    );
    await capacity.locator('select').first().selectOption('2');
    assert.equal(
      await capacity.locator('select').last().inputValue(),
      '1',
      'Region loss remains valid when region count decreases',
    );
    await capacity.locator('.staff-demand-table summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await capacity.locator('tbody tr').count(), 13);
    assert.deepEqual(
      await page.evaluate(() => ({
        review: localStorage.getItem('av-lore-daily-review-v1'),
        study: localStorage.getItem('it-basic-notes-interview-v1'),
      })),
      storage,
    );
    if (locale === 'en')
      await page.waitForFunction(
        () =>
          !/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(
            document.querySelector('.argument-workshop').innerText +
              document.querySelector('.staff-capacity').innerText,
          ),
      );
    await workshop
      .locator('textarea')
      .fill(
        'Goal: keep catalog reads within the agreed freshness window. Measure misses, fill races and dependency headroom.',
      );
    for (const width of [1500, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      for (const [name, tool] of [
        ['argument', workshop],
        ['capacity', capacity],
      ]) {
        await tool.evaluate((e) =>
          window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 95),
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
          name + '/' + locale + '/' + width,
        );
        await page.screenshot({ path: `artifacts/staff-${locale}-${name}-${width}.png` });
      }
    }
    await page.setViewportSize({ width: 1500, height: 1100 });
    for (const theme of themes) {
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
    await context.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/staff-reasoning-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  'Staff reasoning: all eight/six-dimension annotations, draft isolation, no execution/storage mutation, conditional runway and regional boundaries, keyboard, VI/EN, mobile and nine themes passed.',
);
