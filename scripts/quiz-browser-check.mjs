import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { readCache } from './localization.mjs';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore',
  dictionary = readCache(),
  themes = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'));
const questions = fs
    .readdirSync('src/content/quiz')
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(fs.readFileSync('src/content/quiz/' + f, 'utf8'))),
  byId = new Map(questions.map((q) => [q.id, q]));
const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  }),
  report = [],
  errors = [];
fs.mkdirSync('artifacts', { recursive: true });
const normalize = (s) => s.replace(/\s+/g, ' ').trim();
try {
  for (const locale of ['vi', 'en']) {
    const en = locale === 'en',
      context = await browser.newContext({
        viewport: { width: 1500, height: 1100 },
        reducedMotion: 'reduce',
      }),
      page = await context.newPage();
    page.setDefaultTimeout(25000);
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.clock.install({ time: new Date('2026-10-23T00:00:00Z') });
    await page.goto(base + '/');
    const original = {
      'it-basic-notes-interview-v1':
        '{"bookmarks":["n/cache/keep"],"known":[],"review":[],"last":"keep","session":{"keep":true}}',
      'av-lore-daily-review-v1': '{"unrelated":"schedule"}',
      'av-lore-mock-interview-v1': '{"unrelated":"history"}',
      'it-basic-chapters-v1': '["keep-chapter"]',
    };
    await page.evaluate(
      (data) => Object.entries(data).forEach(([key, value]) => localStorage.setItem(key, value)),
      original,
    );
    const href = base + (en ? '/en' : '') + '/system-design/quiz/';
    await page.goto(href);
    const tool = page.locator('.knowledge-quiz');
    async function ready() {
      await tool.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document.querySelector('.knowledge-quiz')?.closest('astro-island')?.dataset.uiReady ===
          'true',
      );
      if (en)
        await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    }
    const label = (vi) => (en ? dictionary[vi] || vi : vi);
    const button = (vi) => tool.getByRole('button', { name: label(vi), exact: true });
    const select = (vi) => tool.getByLabel(label(vi), { exact: false });
    async function translated() {
      if (en)
        await page.waitForFunction(() => {
          const e = document.querySelector('.knowledge-quiz')?.cloneNode(true);
          e?.querySelectorAll('script,style,[translate=no]').forEach((n) => n.remove());
          return e && !/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(e.textContent);
        });
    }
    async function stateScreens(state) {
      await translated();
      for (const theme of themes) {
        await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme.id);
        const result = await new AxeBuilder({ page })
          .include('.knowledge-quiz')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        assert.deepEqual(
          result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          [],
          `${locale}/${state}/${theme.id}`,
        );
        report.push({ locale, state, theme: theme.id });
      }
      await page.evaluate(() => (document.documentElement.dataset.theme = 'github-dark'));
      const target =
        state === 'setup'
          ? tool
          : state === 'results'
            ? tool.locator('.quiz-results')
            : tool.locator('.quiz-question');
      for (const width of [1500, 390]) {
        await page.setViewportSize({ width, height: 1100 });
        await page.clock.runFor(64);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
          locale + '/' + state,
        );
        await target.evaluate((el) =>
          window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 95),
        );
        await page.screenshot({ path: `artifacts/quiz-${locale}-${state}-${width}.png` });
      }
      await page.setViewportSize({ width: 1500, height: 1100 });
    }
    await ready();
    await translated();
    assert.equal(await page.locator('.quiz-corpus-transcript > section').count(), questions.length);
    assert.equal(
      await select('Nhóm câu hỏi').locator('option').count(),
      new Set(questions.map((q) => q.category.id)).size + 1,
    );
    await stateScreens('setup');
    await select('Độ dài lượt luyện').selectOption('all');
    await button('Bắt đầu Quiz').click();
    const panel = tool.locator('.quiz-question'),
      options = panel.locator('.quiz-options button'),
      seen = new Set();
    await stateScreens('question');
    // Shortcuts are scoped to the question panel, not unrelated focused controls.
    await button('Bỏ qua và đọc giải thích').focus();
    await page.keyboard.press('1');
    assert.equal(await panel.locator('.quiz-feedback').count(), 0);
    for (let index = 0; index < questions.length; index++) {
      const id = await panel.getAttribute('data-quiz-id');
      assert.ok(!seen.has(id));
      seen.add(id);
      const q = byId.get(id);
      assert.ok(q);
      await page.waitForFunction(
        (expected) =>
          document.querySelector('.quiz-question h4')?.textContent.replace(/\s+/g, ' ').trim() ===
          expected,
        normalize(q.question[locale]),
      );
      const order = await options.evaluateAll((es) => es.map((e) => e.dataset.optionId));
      assert.equal(new Set(order).size, 4);
      for (let i = 0; i < order.length; i++) {
        const expected = q.options.find((o) => o.id === order[i]).text[locale];
        assert.equal(
          normalize(await options.nth(i).locator('span').first().innerText()),
          normalize(expected),
        );
      }
      if (index === 0) {
        // Two synchronous programmatic clicks still retain the first decision.
        await panel.evaluate((el, correct) => {
          const first = el.querySelector(`button[data-option-id="${correct}"]`),
            other = [...el.querySelectorAll('button[data-option-id]')].find(
              (b) => b.dataset.optionId !== correct,
            );
          first.click();
          other.click();
        }, q.correctId);
      } else if (index % 2) {
        await panel.focus();
        await page.keyboard.press(String(order.indexOf(q.correctId) + 1));
      } else await panel.locator(`button[data-option-id="${q.correctId}"]`).click();
      await panel.locator('.quiz-feedback').waitFor();
      await translated();
      assert.equal(
        await panel.locator('.quiz-options [aria-pressed=true]').getAttribute('data-option-id'),
        q.correctId,
      );
      assert.equal(await panel.locator('.quiz-options [aria-disabled=true]').count(), 4);
      await panel.locator('.quiz-choice-reasons > summary').click();
      for (const rationale of q.options.map((o) => o.rationale[locale]))
        assert.ok(
          normalize(await panel.locator('.quiz-choice-reasons').innerText()).includes(
            normalize(rationale),
          ),
          q.id,
        );
      if (index === 0) await stateScreens('feedback');
      if (index + 1 < questions.length) {
        await panel.focus();
        await page.keyboard.press('Enter');
      } else await button('Xem tổng kết lượt').click();
    }
    assert.equal(seen.size, questions.length);
    await tool.locator('.quiz-results').waitFor();
    await translated();
    assert.deepEqual((await tool.locator('.quiz-result-counts dd').allTextContents()).map(Number), [
      questions.length,
      0,
      0,
      0,
      0,
    ]);
    assert.equal(await tool.locator('.quiz-summary-visual > span').count(), 1);
    await stateScreens('results');
    await tool.getByLabel(label('Chỉ xem câu chưa đúng')).check();
    assert.equal(await tool.locator('.quiz-result-list > details').count(), 0);
    assert.ok(await tool.locator('.quiz-result-list > p').count());
    await tool.getByLabel(label('Chỉ xem câu chưa đúng')).uncheck();
    await tool.locator('.quiz-result-list > details').first().locator(':scope > summary').click();
    await translated();
    let downloading = page.waitForEvent('download');
    await button('Xuất kết quả lượt JSON').click();
    let download = await downloading;
    const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.equal(exported.version, 1);
    assert.equal(exported.items.length, questions.length);
    assert.equal(exported.summary.correct, questions.length);
    assert.equal(exported.questions.length, questions.length);
    for (const item of exported.items) {
      assert.equal(item.picked, byId.get(item.questionId).correctId);
      assert.equal(item.outcome, 'answered');
      assert.equal(item.order.length, 4);
    }
    // Correct/incorrect/skipped/expiry/unfinished are separate, with elapsed timing and pause.
    await button('Chọn lượt Quiz mới').click();
    await select('Độ dài lượt luyện').selectOption('5');
    await select('Thời gian mỗi câu').selectOption('30');
    await button('Bắt đầu Quiz').click();
    let q = byId.get(await panel.getAttribute('data-quiz-id'));
    await panel
      .locator(`button[data-option-id="${q.options.find((o) => o.id !== q.correctId).id}"]`)
      .click();
    await button('Câu tiếp theo →').click();
    await button('Bỏ qua và đọc giải thích').click();
    await button('Câu tiếp theo →').click();
    const timedId = await panel.getAttribute('data-quiz-id');
    await page.clock.fastForward(8000);
    await button('Tạm dừng thời gian câu').click();
    await translated();
    const paused = await tool.locator('[role=timer]').textContent();
    await page.clock.fastForward(120000);
    assert.equal(await tool.locator('[role=timer]').textContent(), paused);
    await button('Tiếp tục thời gian câu').click();
    await page.clock.fastForward(23000);
    await panel.locator('.quiz-feedback').waitFor();
    await translated();
    assert.equal(await panel.getAttribute('data-quiz-id'), timedId);
    q = byId.get(timedId);
    await panel.locator(`button[data-option-id="${q.correctId}"]`).evaluate((el) => {
      if (el instanceof HTMLButtonElement) el.click();
    });
    assert.equal(await panel.locator('.quiz-options [aria-pressed=true]').count(), 0);
    await button('Câu tiếp theo →').click();
    await page.clock.fastForward(500);
    await button('Kết thúc lượt tại đây').click();
    await translated();
    assert.deepEqual(
      (await tool.locator('.quiz-result-counts dd').allTextContents()).map(Number),
      [0, 1, 1, 1, 2],
    );
    downloading = page.waitForEvent('download');
    await button('Xuất kết quả lượt JSON').click();
    download = await downloading;
    const timed = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.deepEqual(
      timed.items.map((i) => i.outcome),
      ['answered', 'skipped', 'timed-out', 'unanswered', 'unanswered'],
    );
    assert.equal(timed.items[2].elapsedMs, 30000);
    assert.ok(timed.items[3].elapsedMs >= 500);
    // A small topic pool does not duplicate questions to reach the requested count; Notes links localize.
    await button('Chọn lượt Quiz mới').click();
    await select('Nhóm câu hỏi').selectOption('sql');
    await select('Thời gian mỗi câu').selectOption('off');
    await select('Độ dài lượt luyện').selectOption('20');
    await button('Bắt đầu Quiz').click();
    const sqlSeen = new Set();
    const sqlCount = questions.filter((q) => q.category.id === 'sql').length;
    for (let i = 0; i < sqlCount; i++) {
      const id = await panel.getAttribute('data-quiz-id');
      assert.ok(!sqlSeen.has(id));
      sqlSeen.add(id);
      await button('Bỏ qua và đọc giải thích').click();
      await translated();
      assert.ok(
        (await panel.locator('.quiz-explanation > a').getAttribute('href')).includes(
          (en ? '/en' : '') + '/handbook/sql/',
        ),
      );
      await button(i + 1 === sqlCount ? 'Xem tổng kết lượt' : 'Câu tiếp theo →').click();
    }
    assert.equal(sqlSeen.size, sqlCount);
    for (const [key, value] of Object.entries(original))
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), key), value, key);
    await page.reload();
    await ready();
    assert.equal(await tool.locator('.quiz-setup').count(), 1);
    assert.equal(await tool.locator('.quiz-results').count(), 0);
    for (const [key, value] of Object.entries(original))
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), key), value, key);
    await context.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/quiz-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
console.log(
  `Quiz: all${questions.length} questions/options/rationales in VI/EN, scoped keyboard, first-choice lock, shuffled identities, elapsed/pause/expiry, separate outcomes, exports, Notes links, unchanged study data, mobile and nine themes passed.`,
);
