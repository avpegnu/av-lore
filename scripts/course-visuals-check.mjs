import fs from 'node:fs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const courses = fs
  .readdirSync('src/content/courses')
  .map((file) => JSON.parse(fs.readFileSync('src/content/courses/' + file, 'utf8')));
const themes = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'));
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const report = { pages: [], contrast: [], errors: [] };
page.on('pageerror', (error) => report.errors.push({ url: page.url(), error: error.message }));
fs.mkdirSync('artifacts', { recursive: true });
async function inspect(course, locale = '') {
  const route = locale + '/learn/' + course.track + '/' + course.slug + '/';
  const response = await page.goto(origin + route, { waitUntil: 'load' });
  expect(response.status(), route).toBe(200);
  if (locale) await expect(page.locator('html')).toHaveAttribute('data-language-ready', 'true');
  const result = await page.evaluate(() => {
    const expectations = {
      '.bigo-row': 'grid',
      '.viz-array': 'flex',
      '.compare': 'grid',
      '.card-grid': 'grid',
      '.flow': 'flex',
      '.jvm-flow .stages': 'grid',
      '.comprehension-viz .steps': 'grid',
      '.pipeline': 'flex',
      '.gil-track': 'grid',
      '.asyncio-loop .loop-grid': 'grid',
    };
    const unstyled = [];
    for (const [selector, display] of Object.entries(expectations))
      for (const element of document.querySelectorAll('.legacy-prose ' + selector))
        if (getComputedStyle(element).display !== display)
          unstyled.push({ selector, actual: getComputedStyle(element).display, expected: display });
    const emptyBars = [...document.querySelectorAll('.bigo-bar')].filter((bar) => {
      const b = bar.getBoundingClientRect();
      return b.width < 1 || b.height < 1;
    }).length;
    return { overflow: document.documentElement.scrollWidth - innerWidth, unstyled, emptyBars };
  });
  report.pages.push({ route, width: page.viewportSize().width, ...result });
}
try {
  for (const locale of ['', '/en']) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (let i = 0; i < courses.length; i++) {
        await inspect(courses[i], locale);
        if ((i + 1) % 40 === 0) console.log(locale || '/vi', width, i + 1, '/', courses.length);
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin + '/learn/dsa/chapter-01/', { waitUntil: 'networkidle' });
  const rows = page.locator('.bigo-row');
  await expect(rows).toHaveCount(9);
  const geometry = await rows.evaluateAll((rows) =>
    rows.map((row) => {
      const label = row.querySelector('.bigo-label').getBoundingClientRect(),
        name = row.querySelector('.bigo-name').getBoundingClientRect(),
        bar = row.querySelector('.bigo-bar').getBoundingClientRect();
      return {
        barWidth: bar.width,
        verticalOffset: Math.abs(label.y + label.height / 2 - (name.y + name.height / 2)),
      };
    }),
  );
  for (let i = 0; i < geometry.length; i++) {
    expect(geometry[i].verticalOffset).toBeLessThan(2);
    if (i) expect(geometry[i].barWidth).toBeGreaterThan(geometry[i - 1].barWidth);
  }
  for (const theme of themes) {
    await page.locator('#theme-toggle').click();
    await page.locator('#theme-menu [data-theme-choice="' + theme.id + '"]').click();
    const result = await new AxeBuilder({ page })
      .include('.bigo-chart')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    report.contrast.push({
      theme: theme.id,
      violations: result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    });
  }
  await page.locator('#theme-toggle').click();
  await page.locator('#theme-menu [data-theme-choice="github-dark"]').click();
  await page.locator('.bigo-chart').screenshot({ path: 'artifacts/bigo-restored-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.bigo-chart').screenshot({ path: 'artifacts/bigo-restored-mobile.png' });
  const failures = report.pages.filter((p) => p.overflow > 1 || p.unstyled.length || p.emptyBars);
  console.log('Failures:', JSON.stringify(failures, null, 2));
  expect(failures).toEqual([]);
  expect(report.contrast.filter((p) => p.violations.length)).toEqual([]);
  expect(report.errors).toEqual([]);
  console.log(
    'Course visual checks passed:',
    report.pages.length,
    'page/viewport checks; nine chart themes.',
  );
} finally {
  fs.writeFileSync('artifacts/course-visuals-report.json', JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}
