import { defineConfig } from 'astro/config';

// Static output; Vercel serves dist/ with no adapter.
// `site` (the public URL) is set once the production domain is confirmed; it is needed for canonical URLs and the sitemap.
export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
});
