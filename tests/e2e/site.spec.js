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
  await expect(page.locator('h1')).toHaveText('A new generation of women. A new era of tech.');
  await expect(page.locator('.hero')).toContainText('Hi, we’re Dara in Tech');
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

test.describe('homepage structure and navigation', () => {
  test('introduces the community before any call to action section', async ({ page }) => {
    await page.goto(siteUrl + '/');
    const headings = await page.locator('main h2').allTextContents();
    expect(headings[0]).toContain('Find your people');
    expect(headings.indexOf('Be part of Dara')).toBe(headings.length - 1);
  });

  test('"Explore Talent Hub" explains the Hub on the page instead of jumping to a login', async ({ page }) => {
    await page.goto(siteUrl + '/');
    await page.getByRole('link', { name: 'Explore Talent Hub' }).click();
    await expect(page).toHaveURL(/\/#talent-hub$/);
    await expect(page.locator('#talent-hub h2')).toBeInViewport();
    await expect(page.locator('#talent-hub').getByRole('link', { name: 'Sign up for the Member Hub' })).toHaveAttribute('href', '/signup');
    await expect(page.locator('#talent-hub').getByRole('link', { name: 'Member login' })).toHaveAttribute('href', '/hub/');
  });

  test('every internal link leads somewhere that exists', async ({ page, request }) => {
    for (const path of ['/', '/styleguide']) {
      await page.goto(siteUrl + path);
      const hrefs = await page.$$eval('a[href]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
      for (const href of hrefs.filter((h) => h.startsWith('/') || h.startsWith('#'))) {
        const url = new URL(href, siteUrl + path);
        if (url.hash) {
          await page.goto(url.origin + url.pathname);
          expect(await page.locator(url.hash).count(), `${path} → ${href}`).toBe(1);
        } else {
          expect((await request.get(url.href)).status(), `${path} → ${href}`).toBe(200);
        }
      }
    }
  });

  test('skip link moves focus to the main content', async ({ page }) => {
    await page.goto(siteUrl + '/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });
});

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('opens, closes with Escape (focus returns), and closes after choosing a link', async ({ page }) => {
    await page.goto(siteUrl + '/');
    const button = page.getByRole('button', { name: 'Menu' });
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('link', { name: 'About' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();

    await button.click();
    await nav.getByRole('link', { name: 'Talent Hub' }).click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(page).toHaveURL(/#talent-hub$/);
  });

  test('menu has no accessibility violations when open', async ({ page }) => {
    await page.goto(siteUrl + '/');
    await page.getByRole('button', { name: 'Menu' }).click();
    const { violations } = await new AxeBuilder({ page }).include('header').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('sign up page', () => {
  test('explains the steps, links back to sign in, and is linked from the page and footer', async ({ page }) => {
    await page.goto(siteUrl + '/');
    // Navbar keeps at most two actions; sign up is reached from the Talent Hub section and the footer.
    await expect(page.locator('.dit-hdr__ctas a')).toHaveCount(2);
    await expect(page.locator('#talent-hub').getByRole('link', { name: 'Sign up for the Member Hub' })).toHaveAttribute('href', '/signup');
    await expect(page.locator('footer').getByRole('link', { name: 'Sign up for the Member Hub' })).toHaveAttribute('href', '/signup');
    await page.goto(siteUrl + '/signup');
    await expect(page.locator('h1')).toHaveText('Join the Member Hub.');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page).toHaveTitle(/^Sign up · Member Hub/);
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/hub/');
  });

  test('sign-in page offers the way to sign up', async ({ page }) => {
    await page.goto(siteUrl + '/hub/');
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup');
  });

  test('signing up (demo) confirms the email, then continues to profile setup in the Hub', async ({ page }) => {
    await page.goto(siteUrl + '/signup');
    await page.fill('#a-email', 'new.member@example.com');
    await page.click('form[data-form="auth-email"] button[type=submit]');
    await page.fill('#a-code', '123456');
    await page.click('form[data-form="auth-code"] button[type=submit]');
    await page.waitForURL(/\/hub\/$/);
    await expect(page.locator('form[data-form="profile"]')).toBeVisible();
    await expect(page.locator('#f-pool')).not.toBeChecked();
  });

  test('unconfigured build: sign up fails closed too', async ({ page }) => {
    await page.goto(unconfiguredUrl + '/signup');
    await expect(page.locator('[data-hub-unconfigured]')).toContainText('not available yet');
    await expect(page.locator('form[data-form="auth-email"]')).toHaveCount(0);
  });
});

test.describe('interactive Dala (hero)', () => {
  test('is a button that cycles messages, closes with Escape and returns focus', async ({ page }) => {
    await page.goto(siteUrl + '/');
    const dala = page.getByRole('button', { name: /Say hi to Dala/ });
    const bubble = page.locator('#dala-bubble');
    await expect(bubble).toBeHidden();
    await expect(page.locator('[data-dala-hint]')).toBeVisible();

    await dala.click();
    await expect(dala).toHaveAttribute('aria-expanded', 'true');
    await expect(bubble).toContainText('Hi, I’m Dala!');
    await expect(page.locator('[data-dala-hint]')).toHaveCount(0);
    await dala.click();
    await expect(bubble).toContainText('Curious about tech?');

    await page.keyboard.press('Escape');
    await expect(bubble).toBeHidden();
    await expect(dala).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(bubble).toContainText('Looking for your next role?');
    await bubble.getByRole('link', { name: /Explore Talent Hub/ }).click();
    await expect(page).toHaveURL(/#talent-hub$/);
    await expect(bubble).toBeHidden();
  });

  test('no accessibility violations with the bubble open', async ({ page }) => {
    await page.goto(siteUrl + '/');
    await page.getByRole('button', { name: /Say hi to Dala/ }).click();
    const { violations } = await new AxeBuilder({ page }).include('.hero').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });
});
