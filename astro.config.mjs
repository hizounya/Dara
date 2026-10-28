import { defineConfig } from 'astro/config';

// Demo mode keeps member data in the visitor's browser with a fixed sign-in code.
// It must never reach the production site, so a Vercel production build with it switched on fails here.
if (process.env.VERCEL_ENV === 'production' && process.env.PUBLIC_DEMO_MODE === 'true') {
  throw new Error('PUBLIC_DEMO_MODE=true is not allowed in a production deployment. Remove it from the Vercel production environment.');
}

// Static output; Vercel serves dist/ with no adapter.
// `site` (the public URL) is set once the production domain is confirmed; it is needed for canonical URLs and the sitemap.
export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
});
