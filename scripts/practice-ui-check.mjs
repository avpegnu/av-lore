import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const themeIds = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8')).map(
  (theme) => theme.id,
);

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
fs.mkdirSync('artifacts', { recursive: true });
const report = { checks: [], themes: [], errors: [] };
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  await page.goto(origin + '/practice/', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'github-dark');
  const select = page.getByRole('combobox');
  await expect(select).toHaveValue('Tất cả');
  await select.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(select).toHaveValue('Tất cả');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(select).toHaveValue('Frontend');
  await expect(page.locator('.practice-card')).toContainText('Web, DNS & HTTP');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox')).toBeFocused();
  report.checks.push(
    'Default GitHub Dark; keyboard selection, Escape cancellation, filtering and Tab',
  );

  for (const theme of themeIds) {
    await page.locator('#theme-toggle').click();
    await page.locator(`[data-theme-choice="${theme}"]`).click();
    await select.click();
    const bounds = await select.boundingBox();
    const first = await page.locator('option').first().boundingBox();
    expect(first.y).toBeGreaterThanOrEqual(bounds.y + bounds.height);
    const axe = await new AxeBuilder({ page })
      .include('.practice-controls')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    report.themes.push({
      theme,
      violations: axe.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    });
    await page.screenshot({ path: `artifacts/practice-dropdown-${theme}.png` });
    await page.keyboard.press('Escape');
  }
  await select.click();
  await page.locator('main h1').click();
  expect(await select.evaluate((el) => el.matches(':open'))).toBe(false);
  report.checks.push('All themed pickers align below the trigger and dismiss on outside click');

  await page.goto(origin + '/en/practice/', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-language-ready', 'true');
  await page.getByRole('combobox').selectOption('Frontend');
  await page.getByRole('combobox').selectOption('Tất cả');
  await expect(page.locator('option:checked')).toHaveText('All');
  await expect(page.locator('.practice-card h2')).toHaveText(
    'Does static typing eliminate runtime errors?',
  );
  await expect(page.locator('.practice-panel > .muted').first()).toContainText('387');
  report.checks.push(
    'English option labels retain stable filter values when switching back to All',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('combobox').scrollIntoViewIfNeeded();
  await page.getByRole('combobox').click();
  for (const option of await page.locator('option').all()) {
    const box = await option.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: 'artifacts/practice-dropdown-mobile.png' });
  report.checks.push('English mobile picker fits the viewport without horizontal overflow');
  await context.close();

  const saved = await browser.newContext();
  await saved.addInitScript(() => localStorage.setItem('it-basic-theme-v3', 'light'));
  const savedPage = await saved.newPage();
  await savedPage.goto(origin + '/');
  await expect(savedPage.locator('html')).toHaveAttribute('data-theme', 'light');
  await saved.close();
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const noJSPage = await noJS.newPage();
  await noJSPage.goto(origin + '/');
  await expect(noJSPage.locator('html')).toHaveAttribute('data-theme', 'github-dark');
  expect(await noJSPage.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgb(13, 17, 23)',
  );
  await noJS.close();
  report.checks.push('Saved theme preference preserved; no-JavaScript default uses GitHub Dark');
  expect(
    report.themes.filter((t) => t.violations.length),
    JSON.stringify(report.themes),
  ).toEqual([]);
  expect(report.errors).toEqual([]);
  console.log(
    `Practice UI checks passed: ${report.checks.length} groups, ${themeIds.length} themes.`,
  );
} finally {
  fs.writeFileSync('artifacts/practice-ui-report.json', JSON.stringify(report, null, 2));
  await browser.close();
}
