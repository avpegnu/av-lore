import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts', { recursive: true });
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const page = await context.newPage(),
  errors = [],
  report = { routes: [], checks: [] };
page.on('pageerror', (e) => errors.push(e.message));
const topics = fs
  .readdirSync('src/content/topics')
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync('src/content/topics/' + f, 'utf8')));
async function go(path) {
  const response = await page.goto(origin + path, { waitUntil: 'networkidle' });
  expect(response.status()).toBe(200);
  await expect(page.locator('main h1')).toBeVisible();
}
try {
  await go('/');
  await page.screenshot({ path: 'artifacts/home-desktop.png', fullPage: true });
  for (const t of topics) {
    await go(`/handbook/${t.id}/`);
    const lab = page.locator('[data-lab]');
    await lab.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const el = document.querySelector('astro-island[component-export="default"]');
      return el && !el.hasAttribute('ssr');
    });
    expect(await page.locator('.note-section').count()).toBe(t.notes.length);
    expect(await page.locator('.question').count()).toBe(t.questions.length);
    const next = lab.getByRole('button', { name: 'Chạy bước tiếp →', exact: true });
    if (await lab.locator('.trace-list').count()) {
      for (let i = 0; i < 3; i++) await next.click();
      await expect(lab.locator('.lab-result')).toBeVisible();
      await lab.getByRole('checkbox').check();
      for (let i = 0; i < 3; i++) await next.click();
      await expect(lab.locator('.lab-result')).toBeVisible();
    }
    report.routes.push(t.id);
  }
  report.checks.push('31 handbook routes + hydration; all trace labs normal/fault paths');
  console.log('31 topic labs passed.');
  await go('/handbook/cache/');
  const cache = page.locator('[data-lab]');
  await cache.scrollIntoViewIfNeeded();
  await cache.getByRole('button', { name: 'GET item', exact: true }).click();
  await expect(cache.locator('.console-output')).toContainText('MISS → v1');
  await cache.getByRole('button', { name: 'Đổi dữ liệu DB' }).click();
  await cache.getByRole('button', { name: 'GET item', exact: true }).click();
  await expect(cache.locator('.console-output')).toContainText('HIT → v1');
  for (let i = 0; i < 5; i++)
    await cache.getByRole('button', { name: '+1 giây', exact: true }).click();
  await cache.getByRole('button', { name: 'GET item', exact: true }).click();
  await expect(cache.locator('.console-output')).toContainText('MISS → v2');
  report.checks.push('Cache source update, stale HIT, TTL expiry, refill');
  await go('/handbook/sql/');
  const sql = page.locator('[data-lab]');
  await sql.scrollIntoViewIfNeeded();
  await expect(sql.locator('tbody tr')).toHaveCount(4);
  await sql.getByRole('checkbox', { name: 'Thêm WHERE' }).check();
  await expect(sql.locator('tbody tr')).toHaveCount(2);
  report.checks.push('SQL LEFT JOIN and null-rejecting WHERE');
  await go('/handbook/react/');
  const react = page.locator('[data-lab]');
  await react.scrollIntoViewIfNeeded();
  await react.getByRole('button', { name: 'Chạy event +3' }).click();
  await expect(react.locator('.metric strong')).toHaveText('1');
  await react.getByRole('checkbox').check();
  await react.getByRole('button', { name: 'Chạy event +3' }).click();
  await expect(react.locator('.metric strong')).toHaveText('4');
  report.checks.push('React batching snapshot vs functional update');
  await go('/handbook/javascript/');
  const event = page.locator('[data-lab]');
  await event.scrollIntoViewIfNeeded();
  for (let i = 0; i < 4; i++) await event.getByRole('button', { name: 'Chạy bước tiếp →' }).click();
  await expect(event.locator('.console-output p')).toHaveCount(4);
  report.checks.push('Event loop stepped output');
  await go('/handbook/database/');
  const race = page.locator('[data-lab]');
  await race.scrollIntoViewIfNeeded();
  await expect(race.locator('.lab-result')).toContainText('2');
  await race.getByRole('checkbox').check();
  await expect(race.locator('.lab-result strong').first()).toHaveText('1');
  await go('/handbook/messaging/');
  const queue = page.locator('[data-lab]');
  await queue.scrollIntoViewIfNeeded();
  await expect(queue.locator('.lab-result strong')).toHaveText('2');
  await queue.getByRole('checkbox', { name: 'Ghi event_id' }).check();
  await expect(queue.locator('.lab-result strong')).toHaveText('1');
  report.checks.push('Race conditional write and queue transactional dedup');
  await go('/handbook/sql/');
  const save = page.locator('.note-section').first().locator('[data-save]');
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('.note-section').first().locator('[data-save]')).toHaveText('✓ Đã lưu');
  const question = page.locator('.question').first();
  await question.locator('summary').click();
  await question.getByRole('button', { name: 'Cần ôn lại', exact: true }).click();
  await go('/saved/');
  await expect(page.locator('.saved-list li')).toHaveCount(1);
  await page.getByRole('button', { name: /Cần ôn lại \(/ }).click();
  await expect(page.locator('.saved-list li')).toHaveCount(1);
  const legacy = {
    version: 1,
    bookmarks: ['n/cache/aside'],
    known: [],
    review: [],
    last: null,
    session: null,
  };
  await page.locator('input[type=file]').setInputFiles({
    name: 'legacy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await expect(page.locator('.study-desk [role=status]')).toContainText('Đã gộp');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất dữ liệu JSON' }).click();
  const file = await download;
  await file.saveAs('artifacts/export.json');
  const exported = JSON.parse(fs.readFileSync('artifacts/export.json'));
  expect(exported.bookmarks).toContain('n/cache/aside');
  expect(exported.bookmarks.length).toBe(2);
  report.checks.push('Bookmark persistence, review, legacy import merge and JSON export');
  await go('/practice/');
  await page.getByRole('button', { name: 'Xem gợi ý trả lời' }).click();
  await expect(page.locator('.practice-card .callout')).toBeVisible();
  await page.getByRole('button', { name: 'Đã hiểu →', exact: true }).click();
  await expect(page.locator('.practice-card')).toContainText('2 TRÊN');
  await page.getByRole('combobox').selectOption('Frontend');
  await expect(page.locator('.practice-card')).toContainText('Web, DNS & HTTP');
  report.checks.push('Practice reveal, rating, role filtering');
  await go('/search/');
  await page.getByRole('searchbox').fill('transaction');
  await expect(page.locator('.search-results li').first()).toBeVisible({ timeout: 15000 });
  const href = await page.locator('.search-results a').first().getAttribute('href');
  expect(href).toContain(new URL(origin).pathname.replace(/\/$/, '') + '/');
  await page.locator('.search-results a').first().click();
  await expect(page.locator('main h1')).toBeVisible();
  report.checks.push('Pagefind full-text search and project base URL');
  await go('/learn/fullstack/a1-javascript-nang-cao/');
  const opt = page.locator('[data-quiz-group] .opt').first();
  await opt.click();
  await expect(page.locator('[data-quiz-group] .explain').first()).toBeVisible();
  const progress = page.locator('[data-chapter]');
  await progress.click();
  await page.reload();
  await expect(page.locator('[data-chapter]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#theme-toggle').click();
  await page.locator('[data-theme-choice=light]').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  report.checks.push('Migrated Fullstack quiz, chapter completion and theme persistence');
  console.log('Behavior checks passed; testing responsive layouts.');
  // Representative layouts and narrow widths.
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/',
      '/learn/',
      '/handbook/',
      '/handbook/sql/',
      '/handbook/system-design/url-shortener/',
      '/learn/python/chapter-01/',
      '/learn/fullstack/g1-react-core/',
      '/practice/',
      '/saved/',
    ]) {
      await go(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      expect(overflow, `${width}px ${route}`).toBe(false);
      report.routes.push(`${width}:${route}`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await go('/');
  await page.getByRole('button', { name: 'Mở điều hướng' }).click();
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'false');
  await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });
  await page.evaluate(() => localStorage.setItem('it-basic-theme', 'dark'));
  await go('/handbook/system-design/url-shortener/');
  await page.screenshot({ path: 'artifacts/case-study.png', fullPage: true });
  const noJS = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const staticPage = await noJS.newPage();
  await staticPage.goto(origin + '/handbook/sql/');
  await expect(staticPage.locator('.note-section')).toHaveCount(
    topics.find((t) => t.id === 'sql').notes.length,
  );
  await staticPage.locator('.question').first().locator('summary').click();
  await expect(staticPage.locator('.question-answer').first()).toBeVisible();
  await noJS.close();
  report.checks.push('Mobile drawer/Escape and reading answers without JavaScript');
  report.errors = errors;
  fs.writeFileSync('artifacts/browser-report.json', JSON.stringify(report, null, 2));
  expect(errors).toEqual([]);
  console.log(
    `Browser checks passed: ${report.routes.length} route/viewport checks, ${report.checks.length} behavior groups.`,
  );
} finally {
  fs.writeFileSync('artifacts/browser-report.json', JSON.stringify({ ...report, errors }, null, 2));
  await browser.close();
}
