import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// @astrojs/sitemap tem bug conhecido com output:'hybrid' (astro:routes:resolved não dispara).
// O sitemap.xml é servido diretamente de public/sitemap.xml.
// Atualize public/sitemap.xml ao adicionar novos eventos/posts.

export default defineConfig({
  site: 'https://masterboard.com.br',

  // Hybrid: páginas estáticas + rota /api/candidatura server-rendered
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),

  integrations: [
    tailwind({ applyBaseStyles: false }),
  ],

  compressHTML: true,
});
