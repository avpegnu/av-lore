import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore',
  key = 'it-basic-notes-interview-v1';
const themes = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'));
const rawCount =
  fs
    .readdirSync('src/content/topics')
    .filter((f) => f.endsWith('.json'))
    .reduce(
      (n, f) => n + JSON.parse(fs.readFileSync('src/content/topics/' + f, 'utf8')).questions.length,
      0,
    ) +
  fs
    .readdirSync('src/content/handbook')
    .filter((f) => f.endsWith('.json'))
    .reduce(
      (n, f) =>
        n +
        JSON.parse(fs.readFileSync('src/content/handbook/' + f, 'utf8')).sections.reduce(
          (m, s) => m + (s.questions?.length || 0),
          0,
        ),
      0,
    );
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
    page.setDefaultTimeout(25000);
    const en = locale === 'en',
      href = base + (en ? '/en' : '') + '/system-design/questions/';
    await page.goto(base + '/');
    const initial = {
      bookmarks: ['n/cache/keep'],
      known: ['q/unrelated/keep'],
      review: [],
      last: 'keep',
      session: { untouched: true },
    };
    await page.evaluate(
      ({ key, initial }) => {
        localStorage.setItem(key, JSON.stringify(initial));
        localStorage.setItem('av-lore-daily-review-v1', '{"unchanged":true}');
        localStorage.setItem('av-lore-mock-interview-v1', '{"unrelated":true}');
      },
      { key, initial },
    );
    await page.goto(href);
    const tool = page.locator('.question-bank');
    async function ready() {
      await tool.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document.querySelector('.question-bank')?.closest('astro-island')?.dataset.uiReady ===
          'true',
      );
      if (en)
        await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    }
    async function noVietnamese() {
      if (en)
        await page.waitForFunction(() => {
          const el = document.querySelector('.question-bank')?.cloneNode(true);
          el?.querySelectorAll('script,style,[translate=no]').forEach((n) => n.remove());
          return el && !/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.textContent);
        });
    }
    const label = (vi, english) => (en ? english : vi);
    const button = (vi, english) =>
      tool.getByRole('button', { name: label(vi, english), exact: true });
    const select = (vi, english) => tool.getByLabel(label(vi, english), { exact: false });
    async function study() {
      return JSON.parse(await page.evaluate((key) => localStorage.getItem(key), key));
    }
    await ready();
    await noVietnamese();
    const total = Number(await tool.locator('.bank-totals strong').first().textContent());
    assert.ok(total <= rawCount && total > 900); // Content models separately test exact-duplicate merging.
    assert.equal(await page.locator('.question-bank-transcript > section').count(), total);
    assert.equal(await tool.locator('.bank-list-item').count(), 12);
    await button('Xem thêm câu hỏi', 'Show more questions').click();
    assert.equal(await tool.locator('.bank-list-item').count(), 24);
    await tool.locator('.bank-list-item details summary').last().click();
    await noVietnamese();
    await select('Tìm câu hỏi và lời giải', 'Search questions and answers').fill('chunking');
    assert.ok(Number(await tool.locator('.bank-match-count strong').textContent()) > 0);
    await noVietnamese();
    assert.ok(
      (await tool.locator('.bank-list-item').allTextContents()).some((t) => /chunk|Chunk/.test(t)),
    );
    await select('Tìm câu hỏi và lời giải', 'Search questions and answers').fill(
      'zzznomatchingquestion',
    );
    assert.equal(await tool.locator('.bank-list-item').count(), 0);
    await button('Xóa bộ lọc câu hỏi', 'Clear question filters').click();
    await select('Bộ nội dung', 'Content collection').selectOption('topic');
    assert.equal(Number(await tool.locator('.bank-match-count strong').textContent()), 387);
    await select('Chủ đề liên quan', 'Related topic').selectOption('react');
    assert.ok(await tool.locator('.bank-list-item').count());
    for (const id of await tool
      .locator('.bank-list-item')
      .evaluateAll((es) => es.map((e) => e.dataset.questionId)))
      assert.ok(id.startsWith('topic:react:'));
    await button('Xóa bộ lọc câu hỏi', 'Clear question filters').click();
    await select('Trạng thái câu hỏi', 'Question status').selectOption('unseen');
    await select('Số thẻ mỗi lượt', 'Cards per session').selectOption('10');
    await button('Lấy bộ lọc để luyện', 'Practice the current filters').click();
    const card = tool.locator('.bank-flashcard'),
      firstId = await card.getAttribute('data-question-id');
    assert.match(firstId, /^topic:/);
    assert.equal(await card.locator('.bank-answer').count(), 0);
    assert.equal(await button('Đã hiểu', 'Understood').count(), 0);
    await card.focus();
    await page.keyboard.press('Enter');
    await card.locator('.bank-answer').waitFor();
    await button('Cần ôn lại', 'Review again').click();
    assert.equal(await card.getAttribute('data-question-id'), firstId);
    assert.equal((await study()).review.length, 1);
    assert.equal(Number(await tool.locator('.bank-match-count strong').textContent()), total - 1);
    await button('+ Lưu câu hỏi', '+ Save question').click();
    assert.ok((await study()).bookmarks.includes('n/cache/keep'));
    assert.equal((await study()).bookmarks.length, 2);
    await card.focus();
    await page.keyboard.press('ArrowRight');
    assert.notEqual(await card.getAttribute('data-question-id'), firstId);
    assert.equal(await card.locator('.bank-answer').count(), 0);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await card.getAttribute('data-question-id'), firstId);
    await button('Mở lời giải thẻ', 'Reveal flashcard answer').click();
    await button('Đã hiểu', 'Understood').click();
    assert.equal((await study()).review.length, 0);
    assert.equal((await study()).known.length, 2);
    await select('Bộ nội dung', 'Content collection').selectOption('handbook');
    assert.equal(await card.getAttribute('data-question-id'), firstId);
    assert.equal(await tool.locator('.bank-snapshot-notice').count(), 1);
    await button('Lấy bộ lọc để luyện', 'Practice the current filters').click();
    assert.match(await card.getAttribute('data-question-id'), /^handbook:/);
    await button('Mở lời giải thẻ', 'Reveal flashcard answer').click();
    await noVietnamese();
    const handbookTitle = await card.locator('h4').textContent();
    await button('Cần ôn lại', 'Review again').click();
    await button('+ Lưu câu hỏi', '+ Save question').click();
    const savedState = await study();
    assert.equal(savedState.last, 'keep');
    assert.deepEqual(savedState.session, { untouched: true });
    assert.ok(savedState.known.includes('q/unrelated/keep'));
    assert.equal(
      await page.evaluate(() => localStorage.getItem('av-lore-daily-review-v1')),
      '{"unchanged":true}',
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem('av-lore-mock-interview-v1')),
      '{"unrelated":true}',
    );
    // Marks and bookmarks must resolve to the same full lesson in Study Desk.
    const desk = await context.newPage();
    await desk.goto(base + (en ? '/en' : '') + '/saved/');
    if (en)
      await desk.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    await desk.locator('.saved-list').waitFor();
    assert.ok((await desk.locator('.saved-list').innerText()).includes(handbookTitle));
    await desk.close();
    // Lists are live, while the active practice deck retains its snapshot after marks change.
    const other = await context.newPage();
    await other.goto(base + '/');
    await other.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key));
      state.bookmarks.push('n/other/external');
      localStorage.setItem(key, JSON.stringify(state));
    }, key);
    await page.waitForFunction(() =>
      document
        .querySelector('.bank-status')
        ?.textContent.includes(
          document.documentElement.lang === 'en' ? 'Marks are shared' : 'Đánh dấu dùng chung',
        ),
    );
    await button('Bỏ tự đánh giá', 'Clear self-assessment').click();
    assert.ok((await study()).bookmarks.includes('n/other/external'));
    await other.close();
    await noVietnamese();
    for (const state of ['answer', 'list']) {
      if (state === 'list') {
        await button('Đọc danh sách', 'Read a list').click();
        await tool.locator('.bank-list-item summary').first().click();
      }
      for (const theme of themes) {
        await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme.id);
        const result = await new AxeBuilder({ page })
          .include('.question-bank')
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
      for (const width of [1500, 390]) {
        await page.setViewportSize({ width, height: 1100 });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
        );
        await tool.scrollIntoViewIfNeeded();
        await page.evaluate(() => scrollBy(0, -95));
        await page.screenshot({ path: `artifacts/questions-${locale}-${state}-${width}.png` });
      }
      await page.setViewportSize({ width: 1500, height: 1100 });
    }
    // A mark created before the spacing correction still resolves through the pinned identity.
    const previousQuestionKey =
      'q/handbook/staff-signals/staff-interview-drill/d3d0b21542b3dfe15b01df58';
    await page.evaluate(
      ({ key, previousQuestionKey }) => {
        const state = JSON.parse(localStorage.getItem(key));
        state.known.push(previousQuestionKey);
        localStorage.setItem(key, JSON.stringify(state));
      },
      { key, previousQuestionKey },
    );
    await page.reload();
    await ready();
    await select('Tìm câu hỏi và lời giải', 'Search questions and answers').fill('35%');
    await select('Trạng thái câu hỏi', 'Question status').selectOption('known');
    assert.equal(await tool.locator('.bank-list-item').count(), 1);
    assert.equal(
      await tool.locator('.bank-list-item').getAttribute('data-question-id'),
      'handbook:staff-signals:staff-interview-drill:d3d0b21542b3dfe15b01df58',
    );
    assert.ok((await study()).known.includes(previousQuestionKey));
    // Corrupt existing storage is preserved and exportable; no automatic reset or wipe.
    await page.evaluate((key) => localStorage.setItem(key, '{broken study file'), key);
    await page.reload();
    await ready();
    await button('Xuất nguyên bản dữ liệu đang lưu', 'Export original stored data').waitFor();
    assert.equal((await tool.locator('.bank-list-item button:disabled').count()) > 0, true);
    const downloadEvent = page.waitForEvent('download');
    await button('Xuất nguyên bản dữ liệu đang lưu', 'Export original stored data').click();
    const download = await downloadEvent;
    assert.equal(fs.readFileSync(await download.path(), 'utf8'), '{broken study file');
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), key),
      '{broken study file',
    );
    await button('Lấy bộ lọc để luyện', 'Practice the current filters').click();
    await button('Mở lời giải thẻ', 'Reveal flashcard answer').click();
    assert.equal(await card.locator('.bank-answer').count(), 1);
    await noVietnamese();
    await context.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(
    'artifacts/question-bank-browser-report.json',
    JSON.stringify({ report, errors }, null, 2),
  );
}
assert.deepEqual(errors, []);
console.log(
  'Question bank: complete transcript, bilingual search/facets, list/flashcard snapshots, keyboard, marks/bookmarks/Study Desk, cross-tab and corrupt-data preservation, VI/EN/mobile and nine themes passed.',
);
