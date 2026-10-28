// Talent Hub regression suite (demo mode).
// The same spec runs against the untouched v1 ("hub-legacy") and against /hub/ on the new site,
// so behaviour before and after the migration is compared check for check.
// Known v1 defects are marked test.fail(): they are recorded, not hidden, and Playwright
// reports an unexpected pass once a defect is fixed so the marker can be removed.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const XSS = '<img src=x onerror="window.__xss=1">';

let hubUrl, legacy;
test.beforeEach(async ({ page }, info) => {
  ({ hubUrl, legacy } = info.project.metadata);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.__errors = errors;
  await page.addInitScript(() => { window.__DARA_TEST = true; });
});

async function signIn(page, email) {
  await page.goto(hubUrl);
  await page.fill('#a-email', email);
  await page.click('form[data-form="auth-email"] button[type=submit]');
  await page.fill('#a-code', '123456');
  await page.click('form[data-form="auth-code"] button[type=submit]');
}

async function fillValidProfile(page, extra = {}) {
  await page.fill('#f-name', extra.name || 'Ayu Lestari');
  await page.fill('#f-city', 'Jakarta');
  await page.selectOption('#f-status', 'career_switcher');
  await page.selectOption('#f-level', 'junior');
  await page.fill('#f-headline', extra.headline || 'Analyst moving into data');
  await page.fill('#f-linkedin', 'linkedin.com/in/ayu');
  await page.click('button[data-tg="interests"][data-v="Data & Analytics"]');
  for (const s of ['SQL', 'Excel', 'Power BI']) {
    await page.fill('#pk-skills', s);
    await page.press('#pk-skills', 'Enter');
  }
}

async function onboard(page, extra) {
  await signIn(page, 'tester@example.com');
  await page.waitForSelector('form[data-form="profile"]');
  await fillValidProfile(page, extra);
  await page.check('#f-consent');
  await page.click('form[data-form="profile"] button[type=submit]');
  await page.waitForSelector('.tabs');
}

test.describe('document', () => {
  test('renders in standards mode with lang, charset and viewport meta', async ({ page }) => {
    test.fail(legacy, 'v1 ships without <!doctype>, lang and viewport meta (audit §1)');
    await page.goto(hubUrl);
    const doc = await page.evaluate(() => ({
      mode: document.compatMode,
      lang: document.documentElement.lang,
      viewport: !!document.querySelector('meta[name=viewport]'),
      charset: !!document.querySelector('meta[charset]'),
    }));
    expect(doc).toEqual({ mode: 'CSS1Compat', lang: 'en', viewport: true, charset: true });
  });

  test('lays out at device width on a 390px phone', async ({ browser }) => {
    test.fail(legacy, 'v1 has no viewport meta, so phones lay it out at 980px (audit §2)');
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(hubUrl);
    await page.waitForSelector('form[data-form="auth-email"]');
    expect(await page.evaluate(() => document.documentElement.clientWidth)).toBeLessThanOrEqual(390);
    await ctx.close();
  });
});

test.describe('theme', () => {
  test('defaults to light even when the OS prefers dark, and the toggle persists', async ({ browser }) => {
    test.fail(legacy, 'v1 follows the OS colour scheme and has no toggle');
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto(hubUrl);
    await page.waitForSelector('form[data-form="auth-email"]');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const toggle = page.locator('[data-theme-toggle]');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await page.waitForSelector('form[data-form="auth-email"]');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-pressed', 'true');
    await ctx.close();
  });
});

test.describe('sign in (demo)', () => {
  test('rejects a wrong code and accepts the demo code', async ({ page }) => {
    await page.goto(hubUrl);
    await page.fill('#a-email', 'tester@example.com');
    await page.click('form[data-form="auth-email"] button[type=submit]');
    await page.fill('#a-code', '000000');
    await page.click('form[data-form="auth-code"] button[type=submit]');
    await expect(page.locator('.err')).toContainText('not right');
    await page.fill('#a-code', '123456');
    await page.click('form[data-form="auth-code"] button[type=submit]');
    await expect(page.locator('form[data-form="profile"]')).toBeVisible();
  });
});

test.describe('onboarding', () => {
  test('Talent Pool is opt-in (unchecked by default)', async ({ page }) => {
    test.fail(legacy, 'v1 defect: pool checkbox starts ticked (audit finding 2). Fixed in the Phase 5 Hub.');
    await signIn(page, 'tester@example.com');
    await expect(page.locator('#f-pool')).not.toBeChecked();
  });

  test('requires consent before joining', async ({ page }) => {
    await signIn(page, 'tester@example.com');
    await fillValidProfile(page);
    await page.click('form[data-form="profile"] button[type=submit]');
    await expect(page.locator('#form-err')).toContainText('agree');
  });

  test('rejects a javascript: LinkedIn URL', async ({ page }) => {
    await signIn(page, 'tester@example.com');
    await fillValidProfile(page);
    await page.fill('#f-linkedin', 'javascript:alert(1)');
    await page.check('#f-consent');
    await page.click('form[data-form="profile"] button[type=submit]');
    await expect(page.locator('#form-err')).toContainText('LinkedIn link does not look right');
  });
});

test.describe('member flow', () => {
  test('profile, tabs, directory, roles, candidates and Mading work; XSS is inert', async ({ page }) => {
    await onboard(page, { name: 'Ayu ' + XSS, headline: 'Analyst ' + XSS });

    await expect(page.locator('section.list .job').first()).toBeVisible();

    for (const t of ['mading', 'pool', 'postings', 'profile', 'home']) {
      await page.click(`.tab[data-v="${t}"]`);
      await expect(page.locator(`.tab[data-v="${t}"]`)).toHaveAttribute('aria-current', 'page');
    }

    await page.click('.tab[data-v="pool"]');
    await page.click('.seg-b[data-v="members"]');
    await expect(page.locator('#members-results .person').first()).toBeVisible();

    // Post a role: unsafe link rejected, then saved with a safe one.
    await page.locator('button[data-act="post-job"]').first().click();
    await page.fill('#j-title', 'Role ' + XSS);
    await page.fill('#j-company', 'Acme');
    await page.fill('#pk-req', 'SQL');
    await page.press('#pk-req', 'Enter');
    await page.fill('#j-link', 'javascript:alert(1)');
    await page.click('form[data-form="job"] button[type=submit]');
    await expect(page.locator('#form-err')).toContainText('does not look right');
    await page.fill('#j-link', 'acme.example/jobs');
    await page.click('form[data-form="job"] button[type=submit]');
    await expect(page.locator('#modal-root .modal')).toHaveCount(0);

    await page.click('.tab[data-v="postings"]');
    await page.locator('.job', { hasText: 'Acme' }).first().click();
    await expect(page.locator('#cand-list .person').first()).toBeVisible();
    await page.keyboard.press('Escape');

    // Mading event post.
    await page.click('.tab[data-v="mading"]');
    await page.locator('button[data-act="post-menu"]').first().click();
    await page.click('button[data-act="post-kind"][data-v="event"]');
    await page.fill('#p-title', 'Event ' + XSS);
    await page.fill('#p-desc', 'Details for the meetup ' + XSS);
    await page.click('form[data-form="post"] button[type=submit]');
    await expect(page.locator('.post', { hasText: 'Event <img' })).toBeVisible();

    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(await page.evaluate(() => [...document.querySelectorAll('a')].filter(a => a.protocol === 'javascript:').length)).toBe(0);
    expect(page.__errors).toEqual([]);
  });

  test('match engine scores aliases and fit correctly', async ({ page }) => {
    await page.goto(hubUrl);
    await page.waitForSelector('form[data-form="auth-email"]');
    const r = await page.evaluate(() => {
      const { matchScore } = window.__DARA_TEST;
      const m = { skills: ['js', 'React'], interests: ['Software Engineering'], level: 'junior', work_modes: ['remote'], job_types: ['full_time'], city: 'Jakarta' };
      return {
        perfect: matchScore(m, { req_skills: ['JavaScript', 'react'], nice_skills: [], category: 'Software Engineering', level: 'junior', work_mode: 'remote', job_type: 'full_time' }).total,
        none: matchScore({ skills: [], interests: [], level: 'intern', work_modes: [], job_types: [] }, { req_skills: ['Go'], nice_skills: [], category: 'QA & Security', level: 'senior', work_mode: 'onsite', job_type: 'contract', location: 'Bali' }).total,
      };
    });
    expect(r).toEqual({ perfect: 100, none: 0 });
  });
});

test.describe('admin (demo)', () => {
  test('admin sees the participant table and can export CSV', async ({ page }) => {
    await signIn(page, 'admin@example.com');
    await page.locator('[data-act="nav"][data-v="admin"]').first().click();
    await expect(page.locator('#admin-table tbody tr').first()).toBeVisible();
    const download = page.waitForEvent('download');
    await page.click('button[data-act="export-csv"]');
    expect((await download).suggestedFilename()).toBe('dara-in-tech-participants.csv');
  });
});

test.describe('navigation (Phase 5)', () => {
  test('each tab has its own address, Back works, and deep links open the right view', async ({ page }) => {
    test.skip(legacy, 'v1 has no routing');
    await onboard(page);
    await expect(page).toHaveURL(/#\/home$/);
    await page.click('.tab[data-v="mading"]');
    await expect(page).toHaveURL(/#\/mading$/);
    await expect(page).toHaveTitle(/^Mading · Member Hub/);
    await expect(page.locator('#main')).toBeFocused();
    await page.click('.tab[data-v="pool"]');
    await expect(page).toHaveURL(/#\/talent-pool$/);
    await page.goBack();
    await expect(page.locator('.tab[data-v="mading"]')).toHaveAttribute('aria-current', 'page');
    await page.goto(hubUrl + '#/profile');
    await expect(page.locator('.tab[data-v="profile"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('form[data-form="profile"]')).toBeVisible();
  });

  test('Tab stays inside an open dialog', async ({ page }) => {
    test.skip(legacy, 'v1 has no focus trap');
    await onboard(page);
    await page.click('.tab[data-v="pool"]');
    await page.locator('button[data-act="post-job"]').first().click();
    for (let i = 0; i < 40; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('#modal-root .modal'))).toBe(true);
  });
});

test.describe('accessibility (axe, WCAG 2 A/AA)', () => {
  for (const theme of ['light', 'dark']) {
    test(`sign-in, home, Talent Pool, Mading and profile have no violations in ${theme} mode`, async ({ page }) => {
      test.skip(legacy, 'v1 is the unchanged baseline');
      await page.addInitScript((t) => localStorage.setItem('dit-theme', t), theme);
      const check = async (label) => {
        // Measure after the toast has gone: mid-fade it is partly transparent and axe reads a false low contrast.
        // (Once hidden, the toast clears its text, so nothing invisible is left to measure.)
        await expect(page.locator('#toast')).toHaveText('', { timeout: 6000 });
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(violations.map((v) => `${label} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      };
      await page.goto(hubUrl);
      await page.waitForSelector('form[data-form="auth-email"]');
      await check('sign-in');
      await onboard(page);
      await check('home');
      for (const v of ['pool', 'mading', 'profile']) {
        await page.click(`.tab[data-v="${v}"]`);
        await expect(page.locator(`.tab[data-v="${v}"]`)).toHaveAttribute('aria-current', 'page');
        await check(v);
      }
    });
  }
});

test.describe('Dala reacts in the Hub (Phase 5)', () => {
  test('pose follows what just happened', async ({ page }) => {
    test.skip(legacy, 'v1 has no reacting mascot');
    const pose = () => page.locator('#toast img').getAttribute('data-pose');

    await onboard(page);
    expect(await pose()).toBe('excited');                     // welcome

    await page.click('.tab[data-v="profile"]');
    await page.click('form[data-form="profile"] button[type=submit]');
    await expect(page.locator('#toast')).toContainText('Profile saved');
    expect(await pose()).toBe('thumbs-up');                   // saved

    // Complete every item of the profile checklist → trophy.
    for (const s of ['Python']) { await page.fill('#pk-skills', s); await page.press('#pk-skills', 'Enter'); }
    await page.click('button[data-tg="job_types"][data-v="full_time"]');
    await page.click('button[data-tg="work_modes"][data-v="remote"]');
    await page.fill('#f-bio', 'Building a data portfolio.');
    await page.click('form[data-form="profile"] button[type=submit]');
    await expect(page.locator('#toast')).toContainText('100% complete');
    expect(await pose()).toBe('trophy');

    await page.click('.tab[data-v="mading"]');
    await page.locator('button[data-act="post-menu"]').first().click();
    await page.click('button[data-act="post-kind"][data-v="tip"]');
    await page.fill('#p-title', 'A tip');
    await page.fill('#p-desc', 'Write down every decision you make.');
    await page.click('form[data-form="post"] button[type=submit]');
    await expect(page.locator('#toast')).toContainText('Posted to Mading');
    expect(await pose()).toBe('cheer');                       // posted

    await page.click('.tab[data-v="pool"]');
    await page.fill('#f-q', 'no-such-role-anywhere');
    await expect(page.locator('#results .empty img')).toHaveAttribute('data-pose', 'comfort'); // nothing found
  });
});
