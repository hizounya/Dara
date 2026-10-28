import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The untouched Talent Hub v1, used as the "before" baseline.
// LEGACY_HUB overrides the path (used once to test v1 at its original location).
const legacyHub = pathToFileURL(resolve(process.env.LEGACY_HUB || 'legacy/talent-hub-v1/index.html')).href;

export default defineConfig({
  testDir: 'tests/e2e',
  reporter: [['list']],
  fullyParallel: true,
  use: {
    // System Chrome, so contributors don't need a Playwright browser download.
    channel: 'chrome',
    headless: true,
  },
  projects: [
    { name: 'hub-legacy', testMatch: 'hub.spec.js', metadata: { hubUrl: legacyHub, legacy: true } },
  ],
});
