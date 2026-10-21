import fs from 'node:fs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const routes = [
  'dsa/chapter-01',
  'dsa/chapter-02',
  'database/chapter-06',
  'fullstack/h1-tong-quan-contact-center',
  'java/chapter-01',
  'java/chapter-07',
  'python/chapter-03',
  'python/chapter-09',
  'python/chapter-11',
  'devops/chapter-04',
  'devops/chapter-06',
  'oop/chapter-05',
  'networking/chapter-01',
  'os/chapter-02',
  'ai/chapter-01',
];
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const report = [];
try {
  for (const theme of ['github-dark', 'light']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    await context.addInitScript((theme) => localStorage.setItem('it-basic-theme-v3', theme), theme);
    const page = await context.newPage();
    for (const route of routes) {
      await page.goto(origin + '/learn/' + route + '/', { waitUntil: 'networkidle' });
      const result = await new AxeBuilder({ page })
        .include('.legacy-prose')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      report.push({
        theme,
        route,
        violations: result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
      });
      console.log(theme, route, result.violations.length);
    }
    await context.close();
  }
  expect(
    report.filter((r) => r.violations.length),
    JSON.stringify(
      report.filter((r) => r.violations.length),
      null,
      2,
    ),
  ).toEqual([]);
} finally {
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/course-final-contrast-report.json', JSON.stringify(report, null, 2));
  await browser.close();
}
