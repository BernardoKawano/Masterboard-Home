import assert from 'node:assert/strict';
import { mapBlogPostToRow, parseEnvLine } from './import-blog-posts-to-supabase.mjs';

assert.deepEqual(parseEnvLine('SUPABASE_URL="https://example.supabase.co"'), [
  'SUPABASE_URL',
  'https://example.supabase.co',
]);
assert.equal(parseEnvLine('# ignored'), null);

const row = mapBlogPostToRow(
  {
    slug: 'networking-de-alto-nivel',
    title: 'Networking de alto nível: como ir além da troca de cartões',
    excerpt: 'Conexões reais nascem de contexto.',
    content: '<p>Conteúdo completo.</p>',
    date: '2025-07-22T09:00:00-03:00',
    author: 'Equipe Masterboard',
    category: 'Networking',
    image: '/images/blog/networking.jpg',
    tags: [' networking ', 'conexões'],
    seoTitle: 'Networking de alto nível | Masterboard',
    seoDescription: 'Descubra como criar networking estratégico.',
  },
  '2026-06-10T18:00:00.000Z',
);

assert.deepEqual(row, {
  slug: 'networking-de-alto-nivel',
  title: 'Networking de alto nível: como ir além da troca de cartões',
  excerpt: 'Conexões reais nascem de contexto.',
  content_html: '<p>Conteúdo completo.</p>',
  date: '2025-07-22',
  author: 'Equipe Masterboard',
  category: 'Networking',
  cover_image_url: 'https://masterboard.com.br/images/blog/networking.jpg',
  tags: ['networking', 'conexões'],
  is_published: true,
  seo_title: 'Networking de alto nível | Masterboard',
  seo_description: 'Descubra como criar networking estratégico.',
  source: 'local-json',
  source_id: 'networking-de-alto-nivel',
  updated_at: '2026-06-10T18:00:00.000Z',
});

assert.throws(() => mapBlogPostToRow({ slug: 'sem-titulo' }), /Post de blog invalido/);

console.log('import-blog-posts-to-supabase: ok');
