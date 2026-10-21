import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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
  }),
  page = await context.newPage(),
  errors = [],
  report = { themes: [], checks: [] };
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(origin + '/handbook/system-design/url-shortener/', { waitUntil: 'networkidle' });
  await expect(page.locator('.sidebar a[aria-current=page]')).toHaveCount(1);
  await expect(page.locator('.sidebar a[aria-current=page]')).toContainText('URL Shortener');
  expect(await page.locator('.sidebar [data-active=true]').count()).toBe(1);
  for (const e of await page.locator('.sidebar [data-active=true]').all())
    await expect(e).toHaveAttribute('open', '');
  await expect(page.locator('.breadcrumb')).toContainText('Case Studies');
  await expect(page.locator('.breadcrumb')).not.toContainText('Notes & Interview');
  await expect(page.locator('.sidebar nav > [data-nav-id=system-design-cases]')).toHaveCount(1);
  await expect(page.locator('[data-nav-id=handbook]')).not.toHaveAttribute('open');
  await expect(page.locator('.breadcrumb li').last()).toHaveText('URL Shortener');
  await page.locator('[data-nav-id=system-design-cases]>summary').click();
  await expect(page.locator('[data-nav-id=system-design-cases]')).not.toHaveAttribute('open');
  await page.reload();
  await expect(page.locator('[data-nav-id=system-design-cases]')).not.toHaveAttribute('open');
  await page.locator('[data-nav-id=system-design-cases]>summary').click();
  await page.locator('.sidebar a[href$="/handbook/system-design/chat/"]').click();
  await expect(page.locator('.sidebar a[aria-current=page]')).toContainText('Chat');
  await page.locator('[data-nav-id=system-design-cases] .nav-overview').click();
  await expect(page).toHaveURL(origin + '/case-studies/');
  await expect(page.locator('.case-study-grid a')).toHaveCount(26);
  await expect(page.locator('.sidebar a[aria-current=page]')).toContainText('Tất cả case studies');
  await page.locator('#language-menu>summary').click();
  await page.locator('[data-language=en]').click();
  await expect(page).toHaveURL(origin + '/en/case-studies/');
  await expect(page.locator('main h1')).toHaveText('From requirements to design decisions.');
  await expect(page.locator('.case-study-grid a')).toHaveCount(26);
  await expect(page.locator('.sidebar a[aria-current=page]')).toContainText('All case studies');
  await page.goto(origin + '/handbook/system-design/url-shortener/', { waitUntil: 'networkidle' });
  report.checks.push(
    'Top-level case navigation, dedicated bilingual catalog, breadcrumb and fold persistence',
  );
  for (const theme of ['dark', 'latte', 'github-dimmed', 'midnight', 'light']) {
    await page.locator('#theme-toggle').click();
    await page.locator(`[data-theme-choice=${theme}]`).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    report.themes.push({
      theme,
      violations: result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    });
  }
  await page.locator('#theme-toggle').click();
  await page.locator('[data-theme-choice=dark]').click();
  await page.goto(origin + '/', { waitUntil: 'networkidle' });
  await expect(page.locator('main .stats-strip')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/home-dark-modern.png', fullPage: true });
  await page.goto(origin + '/handbook/system-design/url-shortener/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'artifacts/navigation-dark-modern.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.sidebar a[aria-current=page]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  report.checks.push(
    'Five persisted themes, removed homepage counters, mobile drawer and overflow',
  );
  expect(
    report.themes.filter((r) => r.violations.length),
    JSON.stringify(report.themes),
  ).toEqual([]);
  expect(errors).toEqual([]);
  console.log('Navigation, appearance and homepage checks passed.');
} finally {
  fs.writeFileSync(
    'artifacts/navigation-report.json',
    JSON.stringify({ ...report, errors }, null, 2),
  );
  await browser.close();
}
