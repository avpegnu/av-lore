import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore',
  key = 'av-lore-mock-interview-v1',
  legacyKey = 'it-basic-notes-interview-v1',
  reviewKey = 'av-lore-daily-review-v1';
const lesson = JSON.parse(fs.readFileSync('src/content/handbook/mock.json', 'utf8')),
  config = lesson.sections.find((s) => s.mock).mock,
  themes = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'));
const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  }),
  report = [],
  errors = [];
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
    await page.clock.install({ time: new Date('2026-10-23T00:00:00Z') });
    await page.goto(base + '/');
    await page.evaluate(
      ({ a, b }) => {
        localStorage.setItem(
          a,
          JSON.stringify({ bookmarks: [], known: [], review: [], last: null, session: null }),
        );
        localStorage.setItem(b, JSON.stringify({ keep: 'unrelated schedule' }));
      },
      { a: legacyKey, b: reviewKey },
    );
    const untouched = await page.evaluate(
        ({ a, b }) => [localStorage.getItem(a), localStorage.getItem(b)],
        { a: legacyKey, b: reviewKey },
      ),
      href = base + (locale === 'en' ? '/en' : '') + '/system-design/mock/';
    await page.goto(href);
    const tool = page.locator('.mock-interview');
    async function ready() {
      await tool.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document.querySelector('.mock-interview')?.closest('astro-island')?.dataset.uiReady ===
          'true',
      );
      if (locale === 'en')
        await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
      await page.waitForFunction((k) => !!localStorage.getItem(k), key);
    }
    async function saved() {
      return await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
    }
    async function persisted({ minElapsed, history, scope }) {
      await page.waitForFunction(
        ({ k, minElapsed, history, scope }) => {
          const s = JSON.parse(localStorage.getItem(k));
          return (
            s &&
            (minElapsed === undefined || s.current?.elapsedMs >= minElapsed) &&
            (history === undefined || s.history.length === history) &&
            (scope === undefined || s.current?.notes.scope === scope)
          );
        },
        { k: key, minElapsed, history, scope },
      );
    }
    async function scan(screen) {
      await page.setViewportSize({ width: 1500, height: 1100 });
      for (const theme of themes) {
        await page.evaluate((id) => (document.documentElement.dataset.theme = id), theme.id);
        const a = await new AxeBuilder({ page })
          .include('.rich-handbook')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        report.push({
          locale,
          screen,
          theme: theme.id,
          violations: a.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        });
      }
      await page.evaluate(() => (document.documentElement.dataset.theme = 'github-dark'));
    }
    async function screens(screen) {
      for (const width of [1500, 390]) {
        await page.setViewportSize({ width, height: 1100 });
        await tool.evaluate((e) =>
          window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 95),
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
          screen + '/' + locale + '/' + width,
        );
        await page.clock.runFor(64);
        await page.screenshot({ path: `artifacts/mock-${locale}-${screen}-${width}.png` });
      }
      await page.setViewportSize({ width: 1500, height: 1100 });
    }
    async function inputFile(name, body) {
      await tool
        .locator('.mock-backups input[type=file]')
        .setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(body) });
    }
    await ready();
    assert.equal(await tool.locator('.mock-prompt-picker option').count(), config.prompts.length);
    assert.equal(await page.locator('.mock-transcript>section').count(), config.prompts.length);
    await tool.locator('.mock-controls select').first().selectOption('advanced');
    assert.ok((await tool.locator('.mock-prompt-picker option').count()) > 0);
    assert.equal(await tool.locator('.mock-run').count(), 0);
    await tool.locator('.mock-controls select').first().selectOption('all');
    await tool.locator('.mock-setup .mock-actions button').first().click();
    assert.equal(
      await tool.locator('.mock-run').count(),
      0,
      'Drawing a prompt does not start timing',
    );
    await tool.locator('.mock-prompt-picker select').selectOption('short-links');
    await tool.locator('.mock-controls select').last().selectOption('30');
    await screens('setup');
    await scan('setup');
    await tool.locator('.mock-setup .mock-actions button').last().focus();
    await page.keyboard.press('Enter');
    await page.clock.fastForward(7000);
    await persisted({ minElapsed: 7000 });
    await tool.locator('.mock-clock button').click();
    const paused = await tool.locator('[role=timer]').textContent();
    await page.clock.fastForward(20000);
    assert.equal(
      await tool.locator('[role=timer]').textContent(),
      paused,
      'Pause freezes elapsed time',
    );
    await tool.locator('.mock-clock button').click();
    await page.clock.fastForward(300000);
    assert.equal(await tool.locator('.mock-phases [aria-current=step]').count(), 1);
    assert.equal(
      await tool.locator('.mock-phases button').nth(1).getAttribute('aria-current'),
      'step',
      'Elapsed delta crosses phase boundary despite skipped ticks',
    );
    await tool.locator('.mock-clock button').click();
    await tool
      .locator('.mock-scratchpad textarea')
      .fill('Scope: preserve access; <script>window.mockExecuted=1</script>');
    await tool.locator('.mock-phases button').nth(4).click();
    await tool.locator('.mock-scratchpad textarea').fill('Depth: check commit before timeout.');
    await tool.locator('.mock-phases button').first().click();
    assert.ok(
      (await tool.locator('.mock-scratchpad textarea').inputValue()).startsWith('Scope: preserve'),
    );
    for (let i = 0; i < 3; i++) await tool.locator('.mock-curveballs button').click();
    assert.equal(await tool.locator('.mock-curveballs li').count(), 3);
    assert.ok(await tool.locator('.mock-curveballs button').isDisabled());
    assert.equal(await page.evaluate(() => window.mockExecuted), undefined);
    await tool.locator('.mock-reference>button').click();
    await page.waitForFunction(() => !!document.querySelector('.mock-reference a'));
    assert.ok(
      (await tool.locator('.mock-reference a').getAttribute('href')).includes(
        locale === 'en' ? '/en/' : '/handbook/',
      ),
    );
    await screens('run');
    await scan('run');
    await tool.locator('.mock-run>.mock-actions button').first().click();
    await tool.locator('.mock-prompt-picker select').selectOption('dashboard');
    await tool.locator('.mock-setup .mock-actions button').last().click();
    await page.clock.fastForward(1000);
    await persisted({ history: 1 });
    assert.ok((await saved()).history[0].notes.depth.includes('commit'));
    assert.equal(
      await tool.locator('.mock-scratchpad textarea').inputValue(),
      '',
      'A new prompt has separate notes',
    );
    await tool.locator('.mock-scratchpad textarea').fill('Dashboard draft to restore.');
    await page.clock.fastForward(6000);
    await persisted({ scope: 'Dashboard draft to restore.' });
    await page.reload();
    await ready();
    assert.equal(
      await tool.locator('.mock-scratchpad textarea').inputValue(),
      'Dashboard draft to restore.',
    );
    const restored = await tool.locator('[role=timer]').textContent();
    await page.clock.fastForward(15000);
    assert.equal(await tool.locator('[role=timer]').textContent(), restored, 'Restores are paused');
    await tool.locator('.mock-run>.mock-actions button').last().click();
    assert.equal(await tool.locator('.mock-self-review fieldset').count(), 7);
    await tool.locator('.mock-self-review fieldset select').first().selectOption('evidence');
    await tool
      .locator('.mock-self-review fieldset textarea')
      .first()
      .fill('Explicit loading, error and access requirements.');
    await tool.locator('.mock-self-review>.mock-actions button').first().click();
    await page.clock.fastForward(1000);
    await persisted({ history: 2 });
    await tool.locator('.mock-self-review>.mock-actions button').first().click();
    await page.clock.fastForward(1000);
    assert.equal((await saved()).history.length, 2, 'Same session save is idempotent');
    if (locale === 'en')
      await page.waitForFunction(() => {
        const el = document.querySelector('.mock-interview').cloneNode(true);
        el.querySelectorAll('pre,textarea').forEach((e) => e.remove());
        return !/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.textContent);
      });
    await screens('review');
    await scan('review');
    const downloadPromise = page.waitForEvent('download');
    await tool.locator('.mock-backups button').first().click();
    const download = await downloadPromise,
      exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.equal(exported.version, 1);
    assert.ok(exported.history[0].notes.scope.includes('preserve access'));
    const before = await saved();
    await inputFile('bad.json', '{"bad":true}');
    await page.waitForFunction(
      () =>
        document.querySelector('.mock-status')?.textContent.includes('Invalid file') ||
        document.querySelector('.mock-status')?.textContent.includes('File không hợp lệ'),
    );
    assert.deepEqual(await saved(), before);
    assert.equal(await tool.locator('.mock-import-preview').count(), 0);
    await inputFile('too-large.json', ' '.repeat(5_000_001));
    await page.waitForFunction(() =>
      document.querySelector('.mock-status')?.textContent.includes('5 MB'),
    );
    assert.deepEqual(await saved(), before);
    const incoming = structuredClone(exported);
    incoming.current.prompt.title = {
      vi: 'Phiên nhập chưa có trong từ điển',
      en: 'Historical imported practice',
    };
    incoming.current.prompt.lessonId = 'historical-removed-lesson';
    delete incoming.current.prompt.topicId;
    incoming.current.mode = 'paused';
    incoming.current.endedAt = null;
    incoming.current.elapsedMs = incoming.current.durationMinutes * 60000 - 900;
    await inputFile('mock-import.json', JSON.stringify(incoming));
    await tool.locator('.mock-import-preview').waitFor();
    assert.equal(
      await tool.locator('.mock-import-preview strong').textContent(),
      'mock-import.json',
    );
    assert.deepEqual(await saved(), before, 'Preflight does not replace data');
    await tool.locator('.mock-import-preview button').first().click();
    await page.waitForFunction(
      ({ k, title }) => JSON.parse(localStorage.getItem(k)).current.prompt.title.en === title,
      { k: key, title: 'Historical imported practice' },
    );
    assert.equal(
      await tool.locator('.mock-session-head h4').textContent(),
      incoming.current.prompt.title[locale],
      'Historical pairs render in selected locale without dictionary dependence',
    );
    assert.ok(
      (await tool.locator('.mock-clock button').textContent()).includes(
        locale === 'en' ? 'Resume' : 'Tiếp tục',
      ),
    );
    await tool.locator('.mock-reference>button').click();
    await page.waitForFunction(
      () =>
        document.querySelector('.mock-reference')?.textContent.includes('absent from') ||
        document.querySelector('.mock-reference')?.textContent.includes('Không có bài liên quan'),
    );
    await tool.locator('.mock-clock button').click();
    await page.clock.fastForward(2000);
    assert.equal(await tool.locator('[role=timer]').textContent(), '00:00');
    assert.ok(await tool.locator('.mock-clock button').isDisabled());
    assert.deepEqual(
      await page.evaluate(({ a, b }) => [localStorage.getItem(a), localStorage.getItem(b)], {
        a: legacyKey,
        b: reviewKey,
      }),
      untouched,
      'Mock does not mutate other study stores',
    );
    const other = await context.newPage();
    await other.goto(href);
    await other.locator('.mock-interview').scrollIntoViewIfNeeded();
    await other.waitForFunction(
      () =>
        document.querySelector('.mock-interview')?.closest('astro-island')?.dataset.uiReady ===
        'true',
    );
    const external = await other.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k));
      s.current.notes.scope = 'external-tab-change';
      const value = JSON.stringify(s);
      localStorage.setItem(k, value);
      return value;
    }, key);
    await page.waitForFunction(
      () =>
        document.querySelector('.mock-status')?.textContent.includes('Another tab') ||
        document.querySelector('.mock-status')?.textContent.includes('tab khác'),
    );
    await page.clock.fastForward(6000);
    assert.equal(
      await page.evaluate((k) => localStorage.getItem(k), key),
      external,
      'Detected external changes are not overwritten',
    );
    await other.close();
    const recovery = structuredClone(incoming);
    recovery.current.notes.scope = 'Explicit replacement after another-tab conflict';
    await inputFile('conflict-recovery.json', JSON.stringify(recovery));
    await tool.locator('.mock-import-preview').waitFor();
    await tool.locator('.mock-import-preview button').first().click();
    await page.clock.fastForward(1000);
    assert.equal(
      (await saved()).current.notes.scope,
      recovery.current.notes.scope,
      'Explicitly applying a validated replacement resolves the prior write conflict',
    );
    await page.reload();
    await ready();
    assert.equal(
      await tool.locator('.mock-scratchpad textarea').inputValue(),
      recovery.current.notes.scope,
    );
    assert.equal(
      await tool
        .locator('.mock-clock button')
        .textContent()
        .then((t) => /Resume|Tiếp tục/.test(t)),
      true,
    );
    const quotaImport = structuredClone(recovery);
    quotaImport.current.notes.scope = 'Replacement after storage becomes writable';
    await inputFile('quota-recovery.json', JSON.stringify(quotaImport));
    await tool.locator('.mock-import-preview').waitFor();
    await page.evaluate((key) => {
      window.mockOriginalWrite = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === key) throw new DOMException('Fixture quota', 'QuotaExceededError');
        return window.mockOriginalWrite.call(this, k, v);
      };
    }, key);
    await tool.locator('.mock-import-preview button').first().click();
    assert.equal(
      await tool.locator('.mock-import-preview').count(),
      1,
      'A failed write retains the pending import',
    );
    assert.equal((await saved()).current.notes.scope, recovery.current.notes.scope);
    assert.equal(
      await tool.locator('.mock-scratchpad textarea').inputValue(),
      recovery.current.notes.scope,
    );
    await page.evaluate(() => {
      Storage.prototype.setItem = window.mockOriginalWrite;
      delete window.mockOriginalWrite;
    });
    await tool.locator('.mock-import-preview button').first().click();
    assert.equal((await saved()).current.notes.scope, quotaImport.current.notes.scope);
    await page.evaluate((k) => localStorage.setItem(k, 'broken-json'), key);
    await page.reload();
    await tool.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelector('.mock-interview')?.closest('astro-island')?.dataset.uiReady ===
        'true',
    );
    await page.waitForFunction(
      () =>
        document.querySelector('.mock-save-state')?.textContent.includes('off') ||
        document.querySelector('.mock-save-state')?.textContent.includes('đang tắt'),
    );
    await page.clock.fastForward(6000);
    assert.equal(
      await page.evaluate((k) => localStorage.getItem(k), key),
      'broken-json',
      'Malformed stored data is preserved',
    );
    await context.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/mock-interview-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
assert.ok(
  report.every((r) => !r.violations.length),
  JSON.stringify(report.filter((r) => r.violations.length)),
);
console.log(
  'Mock: prompt filters, explicit lifecycle/elapsed phases, pause/restore, separate notes, curveball exhaustion, references, evidence history/dedup, import/export/preflight/invalid files, historical bilingual snapshots, cross-tab/corrupt storage, VI/EN/mobile and nine themes passed.',
);
