import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4322/av-lore';
const themes = JSON.parse(fs.readFileSync('src/lib/themes.json', 'utf8'));
const report = { checks: [], accessibility: [], errors: [] };
fs.mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1680, height: 1050 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
page.on('pageerror', (error) => report.errors.push(error.message));
async function audit(label) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  report.accessibility.push({
    label,
    violations: result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  });
  fs.writeFileSync('artifacts/theme-studio-report.json', JSON.stringify(report, null, 2));
  console.log(label, result.violations.length);
}
try {
  // Retired preferences must fall back to the new default, including its actual colors.
  for (const retired of ['github-dimmed', 'midnight', 'everforest-light', 'unknown-theme']) {
    await page.goto(origin + '/themes/', { waitUntil: 'networkidle' });
    await page.evaluate((id) => localStorage.setItem('it-basic-theme-v3', id), retired);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'github-dark');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      'rgb(13, 17, 23)',
    );
  }
  report.checks.push('Removed and unknown stored themes fall back to GitHub Dark');
  for (const locale of ['', '/en']) {
    await page.goto(origin + locale + '/themes/', { waitUntil: 'networkidle' });
    if (locale) await expect(page.locator('html')).toHaveAttribute('data-language-ready', 'true');
    const cards = page.locator('[data-theme-card]');
    await expect(cards).toHaveCount(9);
    if (!locale) await expect(page.locator('html')).toHaveAttribute('data-theme', 'github-dark');
    await page.locator('[data-theme-filter="dark"]').click();
    await expect(page.locator('[data-theme-card]:visible')).toHaveCount(4);
    await page.locator('[data-theme-filter="light"]').click();
    await expect(page.locator('[data-theme-card]:visible')).toHaveCount(5);
    await page.locator('[data-theme-filter="all"]').click();
    await page.locator('#theme-query').fill('dracula');
    await expect(page.locator('[data-theme-card]:visible')).toHaveCount(1);
    await expect(page.locator('#theme-visible')).toHaveText('1');
    await page.locator('#theme-query').fill('no-such-theme');
    await expect(page.locator('#theme-no-results')).toBeVisible();
    await page.locator('#theme-query').fill('');
    await expect(page.locator('#theme-no-results')).toBeHidden();
    await page.locator('.theme-gallery [data-theme-choice="dracula"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
    await expect(page.locator('[data-theme-choice="dracula"][aria-pressed="true"]')).toHaveCount(2);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
    await page.locator('.theme-gallery [data-theme-choice="github-dark"]').click();
    await audit('gallery' + (locale || '/vi'));
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.screenshot({
      path: 'artifacts/theme-gallery' + (locale ? '-en' : '-vi') + '.png',
      fullPage: true,
    });
    await page.locator('#theme-toggle').click();
    await expect(page.locator('#theme-menu [data-theme-choice]')).toHaveCount(9);
    await page.locator('#theme-menu [data-theme-choice="rose-pine-dawn"]').scrollIntoViewIfNeeded();
    await expect(page.locator('.theme-library-link')).toBeVisible();
    await audit('menu' + (locale || '/vi'));
    await page.keyboard.press('Escape');
    await expect(page.locator('#theme-menu')).not.toHaveAttribute('open', '');
    await expect(page.locator('#theme-toggle')).toBeFocused();
    report.checks.push(
      `${locale || '/vi'}: 9 previews, dark/light/search/empty filters, apply/persist/sync, menu scroll and Escape`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const locale of ['', '/en']) {
    await page.goto(origin + locale + '/themes/', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'artifacts/theme-gallery-mobile' + (locale ? '-en' : '-vi') + '.png',
      fullPage: true,
    });
    await page.locator('#theme-toggle').click();
    const bounds = await page.locator('.theme-popup').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
    await page.locator('#theme-menu [data-theme-choice="rose-pine-dawn"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'rose-pine-dawn');
  }
  report.checks.push(
    '390px VI/EN: no horizontal overflow, theme menu within screen and final option selectable',
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const theme of process.argv.includes('--gallery-only') ? [] : themes) {
    await page.evaluate((id) => localStorage.setItem('it-basic-theme-v3', id), theme.id);
    for (const route of ['/practice/', '/handbook/system-design/url-shortener/']) {
      await page.goto(origin + route, { waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme.id);
      const actualBackground = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      );
      const previewBackground = await page
        .locator(`#theme-menu [data-theme='${theme.id}']`)
        .evaluate((swatch) => getComputedStyle(swatch).getPropertyValue('--bg'));
      const expectedBackground = await page.evaluate((color) => {
        const el = document.createElement('span');
        el.style.color = color;
        document.body.append(el);
        const rgb = getComputedStyle(el).color;
        el.remove();
        return rgb;
      }, previewBackground);
      expect(actualBackground, theme.id + ' palette must reach the page, not just the swatch').toBe(
        expectedBackground,
      );
      await audit(theme.id + route);
    }
  }
  if (!process.argv.includes('--gallery-only'))
    report.checks.push(
      'All 9 palettes persist across Practice and a Case Study, with WCAG AA automated checks',
    );
  expect(
    report.accessibility.filter((entry) => entry.violations.length),
    JSON.stringify(
      report.accessibility.filter((entry) => entry.violations.length),
      null,
      2,
    ),
  ).toEqual([]);
  expect(report.errors).toEqual([]);
} finally {
  fs.writeFileSync('artifacts/theme-studio-report.json', JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}
console.log(report.checks.join('\n'));
