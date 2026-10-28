import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The untouched Talent Hub v1, used as the "before" baseline.
// LEGACY_HUB overrides the path (used once to test v1 at its original location).
const legacyHub = pathToFileURL(resolve(process.env.LEGACY_HUB || 'legacy/talent-hub-v1/index.html')).href;

// Two builds of the new site, each with its environment pinned so a local .env cannot leak in:
// "demo" (PUBLIC_DEMO_MODE=true) and "unconfigured" (no Supabase values, demo off), which must fail closed.
const DEMO_PORT = 4322;
const UNCONFIGURED_PORT = 4323;
const build = (name, port, env) => ({
  command: `npx astro build --outDir .test-builds/${name} && node tests/static-server.mjs .test-builds/${name} ${port}`,
  url: `http://127.0.0.1:${port}/`,
  env: { PUBLIC_SUPABASE_URL: '', PUBLIC_SUPABASE_ANON_KEY: '', PUBLIC_GOOGLE_LOGIN: 'false', ...env },
  reuseExistingServer: false,
  timeout: 120_000,
});

export default defineConfig({
  testDir: 'tests/e2e',
  reporter: [['list']],
  fullyParallel: true,
  // Two workers and a 60s budget: launching the system Chrome counts towards the first test in each
  // worker and can take well over 30s on a busy laptop.
  workers: 2,
  timeout: 60_000,
  // One retry for the occasional slow Chrome launch; such tests are still reported as "flaky", never hidden.
  retries: 1,
  use: {
    // System Chrome, so contributors don't need a Playwright browser download.
    channel: 'chrome',
    headless: true,
  },
  webServer: [
    build('demo', DEMO_PORT, { PUBLIC_DEMO_MODE: 'true' }),
    build('unconfigured', UNCONFIGURED_PORT, { PUBLIC_DEMO_MODE: 'false' }),
  ],
  projects: [
    { name: 'hub-legacy', testMatch: 'hub.spec.js', metadata: { hubUrl: legacyHub, legacy: true } },
    { name: 'hub', testMatch: 'hub.spec.js', metadata: { hubUrl: `http://127.0.0.1:${DEMO_PORT}/hub/`, legacy: false } },
    { name: 'site', testMatch: 'site.spec.js', metadata: { siteUrl: `http://127.0.0.1:${DEMO_PORT}`, unconfiguredUrl: `http://127.0.0.1:${UNCONFIGURED_PORT}` } },
  ],
});
