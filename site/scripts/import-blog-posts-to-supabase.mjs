import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const envPath = path.join(projectRoot, '.env');
const postsPath = path.join(projectRoot, 'src', 'data', 'blog-posts.json');
const SITE_URL = 'https://masterboard.com.br';

export function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const equalsIndex = trimmed.indexOf('=');
  if (equalsIndex === -1) return null;

  const key = trimmed.slice(0, equalsIndex).trim();
  let value = trimmed.slice(equalsIndex + 1).trim();
  const isQuoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));

  if (isQuoted) value = value.slice(1, -1);

  return [key, value];
}

async function loadEnvFile() {
  const env = { ...process.env };
  const source = await readFile(envPath, 'utf8');

  for (const line of source.split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) continue;
    const [key, value] = entry;
    env[key] ??= value;
  }

  return env;
}

function requireSupabaseEnv(env) {
  const url = env.SUPABASE_URL?.replace(/\/+$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.includes('xxxx')) {
    throw new Error('SUPABASE_URL ausente ou ainda com placeholder no .env.');
  }

  if (!serviceRoleKey || serviceRoleKey === 'xxxx') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente ou ainda com placeholder no .env.');
  }

  return { url, serviceRoleKey };
}

const cleanText = (value) => {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

const toDateOnly = (value) => {
  const cleaned = cleanText(value);
  return cleaned ? cleaned.slice(0, 10) : null;
};

const toAbsoluteImageUrl = (value) => {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  return cleaned.startsWith('http') ? cleaned : `${SITE_URL}${cleaned.startsWith('/') ? '' : '/'}${cleaned}`;
};

export function mapBlogPostToRow(post, now = new Date().toISOString()) {
  const slug = cleanText(post.slug);
  const title = cleanText(post.title);
  const date = toDateOnly(post.date);
  const author = cleanText(post.author);

  if (!slug || !title || !date || !author) {
    throw new Error(`Post de blog invalido para importacao: ${JSON.stringify({ slug, title, date, author })}`);
  }

  return {
    slug,
    title,
    excerpt: cleanText(post.excerpt),
    content_html: cleanText(post.content),
    date,
    author,
    category: cleanText(post.category),
    cover_image_url: toAbsoluteImageUrl(post.image),
    tags: Array.isArray(post.tags) ? post.tags.map(cleanText).filter(Boolean) : [],
    is_published: true,
    seo_title: cleanText(post.seoTitle),
    seo_description: cleanText(post.seoDescription),
    source: 'local-json',
    source_id: slug,
    updated_at: now,
  };
}

class SupabaseRestClient {
  constructor({ url, serviceRoleKey }) {
    this.baseUrl = `${url}/rest/v1`;
    this.headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    };
  }

  async request(pathname, options = {}) {
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${options.method ?? 'GET'} ${pathname} falhou: ${response.status} ${body}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async selectBySlug(slug) {
    const encoded = encodeURIComponent(slug);
    const rows = await this.request(`/content_posts?slug=eq.${encoded}&select=id,slug&limit=1`);
    return rows[0] ?? null;
  }

  async upsertBySlug(slug, row) {
    const existing = await this.selectBySlug(slug);

    if (existing) {
      const rows = await this.request(`/content_posts?slug=eq.${encodeURIComponent(slug)}&select=id,slug`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(row),
      });

      return { action: 'updated', row: rows[0] };
    }

    const rows = await this.request('/content_posts?select=id,slug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    });

    return { action: 'inserted', row: rows[0] };
  }
}

async function loadRows() {
  const source = await readFile(postsPath, 'utf8');
  const posts = JSON.parse(source);

  if (!Array.isArray(posts)) {
    throw new Error('src/data/blog-posts.json precisa conter um array.');
  }

  const now = new Date().toISOString();
  return posts.map((post) => mapBlogPostToRow(post, now));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const rows = await loadRows();

  if (dryRun) {
    console.log(`Dry-run: ${rows.length} posts seriam importados para content_posts.`);
    for (const row of rows) {
      console.log(`- ${row.slug} | ${row.title}`);
    }
    return;
  }

  const env = await loadEnvFile();
  const supabase = new SupabaseRestClient(requireSupabaseEnv(env));
  const stats = { inserted: 0, updated: 0 };

  for (const row of rows) {
    const { action } = await supabase.upsertBySlug(row.slug, row);
    stats[action] += 1;
  }

  console.log(
    `Posts importados: ${rows.length} (${stats.inserted} inseridos, ${stats.updated} atualizados)`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
