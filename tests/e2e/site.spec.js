// Site-level checks: the homepage introduces the community (not the Hub), old sign-in links are
// forwarded to /hub/, and a build without Supabase config never pretends to sign anyone in.
import { test, expect } from '@playwright/test';

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
