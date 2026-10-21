import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts', { recursive: true });
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  }),
  errors = [],
  report = [];
page.on('pageerror', (e) => errors.push(e.message));
const go = async (route) => {
  const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
  expect(response.status()).toBe(200);
};
try {
  await go('/handbook/system-design/url-shortener/#failure');
  const originalCode = await page.locator('main pre').first().textContent();
  await page.locator('#language-menu>summary').click();
  await page.locator('[data-language=en]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(page.url()).toContain('/en/handbook/system-design/url-shortener/#failure');
  await expect(page.locator('main h1')).toContainText('Design');
  await expect(page.locator('main h1')).not.toContainText('Thiết');
  await expect(page.locator('main pre').first()).toHaveText(originalCode);
  await expect(page.locator('.sidebar a[aria-current=page]')).toContainText('URL Shortener');
  report.push('Language switch preserves route/hash, active case and code');
  await go('/en/handbook/react/');
  const lab = page.locator('[data-lab]');
  await lab.scrollIntoViewIfNeeded();
  await expect(lab.getByRole('button', { name: 'Chạy event +3' })).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-language-ready', 'true');
  await lab.locator('button').first().click();
  await expect(lab.locator('.metric strong')).toHaveText('1');
  await expect(lab).not.toContainText('Cả ba lời gọi');
  report.push('English React controls and interpolated feedback after hydration');
  await go('/en/handbook/sql/');
  const sql = page.locator('[data-lab]');
  await sql.scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveAttribute('data-language-ready', 'true');
  await expect(sql.locator('tbody tr')).toHaveCount(4);
  await sql.locator('input[type=checkbox]').nth(1).check();
  await expect(sql.locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('.note-section').first().locator('[data-save]')).toHaveText('+ Save');
  await page.locator('.note-section').first().locator('[data-save]').click();
  await expect(page.locator('.note-section').first().locator('[data-save]')).toHaveText('✓ Saved');
  const firstKey = await page
    .locator('.note-section')
    .first()
    .locator('[data-save]')
    .getAttribute('data-save');
  await go('/saved/');
  await expect(page.locator('.saved-list')).toBeVisible();
  expect(
    await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem('it-basic-notes-interview-v1')).bookmarks.includes(key),
      firstKey,
    ),
  ).toBe(true);
  report.push('English SQL behavior, bookmark labels and shared Vietnamese study state');
  await go('/en/practice/');
  await expect(page.locator('html')).toHaveAttribute('data-language-ready', 'true');
  await expect(page.locator('.practice-card')).not.toContainText('lập trình');
  await page.locator('.practice-card>button').first().click();
  await expect(page.locator('.practice-card .callout')).toBeVisible();
  await expect(page.locator('.practice-card')).not.toContainText('Gợi ý');
  report.push('English question bank and answer reveal');
  await go('/en/search/');
  await expect(page.locator('html')).toHaveAttribute('data-language-ready', 'true');
  await page.getByRole('searchbox').fill('transaction');
  await expect(page.locator('.search-results li').first()).toBeVisible({ timeout: 15000 });
  expect(await page.locator('.search-results a').first().getAttribute('href')).toContain(
    new URL(origin).pathname.replace(/\/$/, '') + '/en/',
  );
  await page.locator('.search-results a').first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  report.push('Separate English search index and localized result URLs');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/en/',
      '/en/handbook/sql/',
      '/en/handbook/system-design/url-shortener/',
      '/en/learn/ai/chapter-02/',
    ]) {
      await go(route);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        route + ' ' + width,
      ).toBe(false);
    }
  }
  await page.screenshot({ path: 'artifacts/english-preview.png' });
  report.push('English responsive layouts');
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJS.newPage();
  await staticPage.goto(origin + '/en/handbook/sql/');
  await expect(staticPage.locator('main h1')).not.toContainText('bài tập');
  await expect(staticPage.locator('.note-section').first()).not.toContainText('Dễ hiểu nhầm');
  await staticPage.locator('.question').first().locator('summary').click();
  await expect(staticPage.locator('.question-answer').first()).toBeVisible();
  await noJS.close();
  report.push('English notes and interview answers are readable without JavaScript');
  expect(errors).toEqual([]);
  console.log('Language checks passed:', report.length, 'groups.');
} finally {
  fs.writeFileSync(
    'artifacts/language-report.json',
    JSON.stringify({ checks: report, errors }, null, 2),
  );
  await browser.close();
}
