import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

// @astrojs/sitemap tem bug conhecido com output:'hybrid' (astro:routes:resolved não dispara).
// O sitemap.xml é servido por src/pages/sitemap.xml.ts para refletir eventos/posts do Supabase.

export default defineConfig({
  site: 'https://masterboard.com.br',

  output: 'hybrid',
  adapter: vercel(),

  integrations: [
    tailwind({ applyBaseStyles: false }),
  ],

  compressHTML: true,
});
