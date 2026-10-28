// Site-level checks: the homepage introduces the community (not the Hub), old sign-in links are
// forwarded to /hub/, and a build without Supabase config never pretends to sign anyone in.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

let siteUrl, unconfiguredUrl;
test.beforeEach(async ({}, info) => {
  ({ siteUrl, unconfiguredUrl } = info.project.metadata);
});

test('homepage introduces the community, not the Talent Hub', async ({ page }) => {
  await page.goto(siteUrl + '/');
  await expect(page.locator('h1')).toContainText('Dara in Tech');
  await expect(page.locator('form[data-form="auth-email"]')).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe('/');
});

test('old sign-in links on the homepage are forwarded to /hub/ with the token intact', async ({ page }) => {
  await page.goto(siteUrl + '/#access_token=test-token&type=magiclink');
  await page.waitForURL(/\/hub\//);
  expect(new URL(page.url()).hash).toBe('#access_token=test-token&type=magiclink');
});

test('a plain homepage visit is not forwarded', async ({ page }) => {
  await page.goto(siteUrl + '/#what-we-do');
  await expect(page.locator('h1')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
});

test('unconfigured build: Hub shows a configuration message and no sign-in or demo', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(unconfiguredUrl + '/hub/');
  await expect(page.locator('[data-hub-unconfigured]')).toContainText('not available yet');
  await expect(page.locator('form[data-form="auth-email"]')).toHaveCount(0);
  await expect(page.locator('.demo-chip, .demo-note')).toHaveCount(0);
  expect(errors.join(' ')).toContain('Not configured');
});

test('unconfigured build: no demo data is written to the browser', async ({ page }) => {
  await page.goto(unconfiguredUrl + '/hub/');
  await expect(page.locator('[data-hub-unconfigured]')).toBeVisible();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.filter(k => k.startsWith('dara_demo'))).toEqual([]);
});

test.describe('theme', () => {
  test('light by default even when the OS prefers dark; choice carries over to the Hub', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto(siteUrl + '/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(250, 248, 245)');
    await page.click('[data-theme-toggle]');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.goto(siteUrl + '/hub/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await ctx.close();
  });
});

test.describe('accessibility (axe, WCAG 2 A/AA)', () => {
  for (const path of ['/', '/styleguide']) {
    for (const theme of ['light', 'dark']) {
      test(`${path} has no violations in ${theme} mode`, async ({ page }) => {
        await page.addInitScript(t => localStorage.setItem('dit-theme', t), theme);
        await page.goto(siteUrl + path);
        await page.evaluate(() => document.fonts.ready);
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
      });
    }
  }
});

test.describe('responsive', () => {
  for (const path of ['/', '/styleguide']) {
    test(`${path} has no horizontal scroll at 390px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
      const page = await ctx.newPage();
      await page.goto(siteUrl + path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await ctx.close();
    });
  }
});
