import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

// Build-time values (.env files plus the real environment, which wins).
const env = { ...loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), 'PUBLIC_'), ...process.env };

// Demo mode keeps member data in the visitor's browser with a fixed sign-in code and lets any "admin…" email see
// the admin screens. It is for local development only: never on a Vercel deployment (production or preview) and
// never mixed with real Supabase settings. The Hub also refuses to run demo mode outside localhost.
if (env.PUBLIC_DEMO_MODE === 'true') {
  if (['production', 'preview'].includes(process.env.VERCEL_ENV ?? '')) {
    throw new Error('PUBLIC_DEMO_MODE=true is not allowed on Vercel deployments. Remove it from the project environment.');
  }
  if (env.PUBLIC_SUPABASE_URL) {
    throw new Error('PUBLIC_DEMO_MODE=true cannot be combined with PUBLIC_SUPABASE_URL. Use one or the other.');
  }
}

// The only third party the browser talks to is the Supabase project (REST, Auth, Storage).
const supabase = env.PUBLIC_SUPABASE_URL ? new URL(env.PUBLIC_SUPABASE_URL).origin : '';

// Static output; Vercel serves dist/ with no adapter.
// `site` (the public URL) is set once the production domain is confirmed; it is needed for canonical URLs and the sitemap.
export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  security: {
    // Content Security Policy as a <meta> tag on every page. Astro adds hashes for its own scripts and styles,
    // so no inline script runs unless it was part of the build. Headers that a <meta> CSP cannot carry
    // (frame-ancestors, etc.) are set in vercel.json.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        `connect-src 'self'${supabase ? ` ${supabase}` : ''}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-src 'none'",
        "worker-src 'none'",
        'upgrade-insecure-requests',
      ],
      // Inline style="" attributes (e.g. match-score bar widths) are allowed; inline <style>/<script> elements still need a hash.
      styleDirective: { resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
});
