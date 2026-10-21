import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts', { recursive: true });
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }),
  errors = [],
  report = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (let n = 1; n <= 10; n++) {
      const route = `/learn/ai/chapter-${String(n).padStart(2, '0')}/`;
      await page.goto(origin + route, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      report.push({ route, width, overflow });
      if (overflow > 1)
        console.log(
          'OVERFLOW',
          route,
          width,
          await page.evaluate(() =>
            [...document.querySelectorAll('main *')]
              .filter((e) => e.getBoundingClientRect().right > innerWidth + 2)
              .map((e) => ({
                tag: e.tagName,
                id: e.id,
                cls: e.className,
                right: e.getBoundingClientRect().right,
              }))
              .slice(0, 8),
          ),
        );
    }
  }
  await page.goto(origin + '/learn/ai/chapter-02/', {
    waitUntil: 'networkidle',
  });
  await page.locator('#cos-reset').click();
  await expect(page.locator('#out-cos')).not.toHaveText('—');
  await page.locator('#sm-temp').fill('2');
  await expect(page.locator('#sm-temp-val')).toHaveText('2.0');
  await page.screenshot({ path: 'artifacts/ai-demo.png', fullPage: true });
  for (let n = 1; n <= 10; n++) {
    await page.goto(`${origin}/learn/cli/chapter-${String(n).padStart(2, '0')}/`, {
      waitUntil: 'networkidle',
    });
    expect(await page.locator('.quiz-question').count()).toBeGreaterThan(0);
    await page.locator('.terminal-input').fill('pwd');
    await page.locator('.terminal-input').press('Enter');
    await expect(page.locator('.terminal-body')).toContainText('/Users/you');
    const q = page.locator('.quiz-question').first();
    await q.locator('[data-option]').first().click();
    await expect(q.locator('.quiz-explain')).toBeVisible();
  }
  expect(errors, JSON.stringify(errors)).toEqual([]);
  expect(report.filter((r) => r.overflow > 1)).toEqual([]);
  console.log('Legacy AI & CLI checks passed.');
} finally {
  fs.writeFileSync('artifacts/legacy-report.json', JSON.stringify({ report, errors }, null, 2));
  await browser.close();
}
