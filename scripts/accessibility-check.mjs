import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const themeIds = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8')).map(
  (theme) => theme.id,
);
fs.mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const report = [];
try {
  for (const theme of themeIds)
    for (const route of [
      '/',
      '/handbook/sql/',
      '/handbook/system-design/url-shortener/',
      '/learn/fullstack/a1-javascript-nang-cao/',
      '/practice/',
      '/saved/',
      '/search/',
    ]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: 'reduce',
      });
      await context.addInitScript((t) => localStorage.setItem('it-basic-theme-v3', t), theme);
      const page = await context.newPage();
      await page.goto((process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore') + route, {
        waitUntil: 'networkidle',
      });
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      report.push({
        route,
        theme,
        violations: result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
      });
      console.log(theme, route, result.violations.length);
      fs.writeFileSync('artifacts/accessibility-report.json', JSON.stringify(report, null, 2));
      await context.close();
    }
  expect(
    report.filter((x) => x.violations.length),
    JSON.stringify(
      report.filter((x) => x.violations.length),
      null,
      2,
    ),
  ).toEqual([]);
} finally {
  await browser.close();
}
