export const prerender = false;

import { dataSource } from '../lib/data-source';
import { getEventUrl, getPostUrl } from '../types/domain';

const SITE_URL = 'https://masterboard.com.br';

interface SitemapEntry {
  loc: string;
  changefreq: 'weekly' | 'monthly';
  priority: string;
  lastmod?: string;
}

const toLastmod = (value?: string) => {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString().slice(0, 10);
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const renderUrl = (entry: SitemapEntry) => [
  '  <url>',
  `    <loc>${escapeXml(entry.loc)}</loc>`,
  entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
  `    <changefreq>${entry.changefreq}</changefreq>`,
  `    <priority>${entry.priority}</priority>`,
  '  </url>',
].filter(Boolean).join('\n');

export async function GET() {
  const [events, posts] = await Promise.all([
    dataSource.listEvents({ status: 'all', sortAscending: false }),
    dataSource.listPosts ? dataSource.listPosts() : Promise.resolve([]),
  ]);

  const entries: SitemapEntry[] = [
    { loc: `${SITE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}/eventos/`, changefreq: 'weekly', priority: '0.9' },
    ...events.map((event) => ({
      loc: `${SITE_URL}${getEventUrl(event)}`,
      lastmod: toLastmod(event.date),
      changefreq: 'weekly' as const,
      priority: event.status === 'upcoming' ? '0.85' : '0.7',
    })),
    { loc: `${SITE_URL}/blog/`, changefreq: 'weekly', priority: '0.8' },
    ...posts.map((post) => ({
      loc: `${SITE_URL}${getPostUrl(post)}`,
      lastmod: toLastmod(post.date),
      changefreq: 'monthly' as const,
      priority: '0.7',
    })),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(renderUrl),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
