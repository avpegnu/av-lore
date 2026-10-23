import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const themeIds = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8')).map(
  (theme) => theme.id,
);
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
  expect(await page.locator('.sidebar [data-active=true]').count()).toBe(2);
  for (const e of await page.locator('.sidebar [data-active=true]').all())
    await expect(e).toHaveAttribute('open', '');
  await expect(page.locator('.breadcrumb')).toContainText('Case Studies');
  await expect(page.locator('.breadcrumb')).not.toContainText('Notes & Interview');
  await expect(
    page.locator('.sidebar [data-nav-id=system-design-ai] [data-nav-id=system-design-cases]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-nav-id=handbook]')).not.toHaveAttribute('open');
  await expect(page.locator('.breadcrumb li').last()).toHaveText(
    JSON.parse(fs.readFileSync('src/content/handbook/url-shortener.json', 'utf8')).title.vi,
  );
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
    'System Design & AI case branch, dedicated bilingual catalog, breadcrumb and fold persistence',
  );
  for (const locale of ['', 'en/']) {
    await page.goto(origin + '/' + locale + 'handbook/system-design/news-feed/');
    if (locale)
      await page.waitForFunction(() => document.documentElement.dataset.languageReady === 'true');
    await page.addStyleTag({ content: '* { scroll-behavior:auto!important; }' });
    const activeToc = page.locator('.page-toc nav a.current');
    await page.locator('#interview').evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
    await expect(activeToc).toHaveAttribute('href', '#interview');
    await page.locator('.feed-publication').evaluate((el) =>
      window.scrollTo({
        top: el.getBoundingClientRect().top + scrollY - 100,
        behavior: 'instant',
      }),
    );
    await expect(activeToc).toHaveAttribute('href', '#capacity');
    await expect(activeToc).toHaveAttribute('aria-current', 'location');
    await page.locator('.architecture-heading h3').evaluate((el) =>
      window.scrollTo({
        top: el.getBoundingClientRect().top + scrollY - 108,
        behavior: 'instant',
      }),
    );
    await expect(activeToc).toHaveAttribute('href', '#architecture');
    await page.locator('.page-toc nav a[href="#fanout"]').click();
    await expect(activeToc).toHaveAttribute('href', '#fanout');
    await expect(page).toHaveURL(/#fanout$/);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(activeToc).toHaveAttribute('href', '#mental-model');
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    );
    await expect(activeToc).toHaveAttribute('href', '#interview');
    await page.goto(origin + '/' + locale + 'handbook/system-design/news-feed/#privacy');
    await expect(activeToc).toHaveAttribute('href', '#privacy');
  }
  report.checks.push(
    'Long-section reverse jumps, unlisted headings, anchors and hash restoration in both locales',
  );
  await page.goto(origin + '/handbook/system-design/url-shortener/', { waitUntil: 'networkidle' });
  for (const theme of themeIds) {
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
    'All selected themes persist, removed homepage counters, mobile drawer and overflow',
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
