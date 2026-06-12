const DEFAULT_ALLOWED_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'em',
  'h2',
  'h3',
  'h4',
  'hr',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'ul',
]);

const VOID_TAGS = new Set(['br', 'hr']);

const ATTRIBUTE_ALLOWLIST = {
  a: new Set(['href', 'title', 'target', 'rel']),
};

export function slugify(value, fallback = 'post') {
  const slug = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || fallback;
}

export function splitTags(value) {
  return String(value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeHexColor(value, fallback) {
  const color = String(value ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(color)) return `#${color.toUpperCase()}`;
  return fallback;
}

function isSafeUrl(value) {
  const url = String(value ?? '').trim();
  return /^(https?:|mailto:|\/|#)/i.test(url) && !/[\u0000-\u001f]/.test(url);
}

function sanitizeAttributes(tagName, rawAttributes) {
  const allowed = ATTRIBUTE_ALLOWLIST[tagName];
  if (!allowed) return '';

  const attributes = [];
  const attrPattern = /([a-zA-Z0-9:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = attrPattern.exec(rawAttributes))) {
    const name = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';

    if (!allowed.has(name)) continue;
    if (name === 'href' && !isSafeUrl(value)) continue;

    if (name === 'target') {
      attributes.push('target="_blank"');
      attributes.push('rel="noopener noreferrer"');
      continue;
    }

    if (name === 'rel') continue;
    attributes.push(`${name}="${escapeHtml(value)}"`);
  }

  if (tagName === 'a' && attributes.some((attr) => attr === 'target="_blank"')) {
    return ` ${Array.from(new Set(attributes)).join(' ')}`;
  }

  return attributes.length ? ` ${attributes.join(' ')}` : '';
}

export function sanitizeHtml(input) {
  const withoutDangerousBlocks = String(input ?? '')
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|link|meta|base)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|link|meta|base)[^>]*\/?\s*>/gi, '');

  return withoutDangerousBlocks.replace(/<\s*(\/)?\s*([a-zA-Z0-9-]+)([^>]*)>/g, (_full, closing, rawTagName, rawAttributes = '') => {
    const tagName = rawTagName.toLowerCase();
    if (!DEFAULT_ALLOWED_TAGS.has(tagName)) return '';

    if (closing) {
      return VOID_TAGS.has(tagName) ? '' : `</${tagName}>`;
    }

    const attributes = sanitizeAttributes(tagName, rawAttributes);
    return VOID_TAGS.has(tagName) ? `<${tagName}${attributes}>` : `<${tagName}${attributes}>`;
  });
}

export function buildPostRowFromForm(data, now = new Date().toISOString()) {
  const title = String(data.get('title') ?? '').trim();
  const providedSlug = String(data.get('slug') ?? '').trim();
  const isPublished = data.get('is_published') === 'on';

  return {
    slug: slugify(providedSlug || title),
    title,
    excerpt: String(data.get('excerpt') ?? '').trim(),
    content_html: sanitizeHtml(data.get('content_html')),
    date: String(data.get('date') ?? '').trim() || now.slice(0, 10),
    author: String(data.get('author') ?? '').trim() || 'Equipe Masterboard',
    category: String(data.get('category') ?? '').trim() || 'Conteúdo',
    cover_image_url: String(data.get('cover_image_url') ?? '').trim() || null,
    tags: splitTags(data.get('tags')),
    is_published: isPublished,
    seo_title: String(data.get('seo_title') ?? '').trim() || null,
    seo_description: String(data.get('seo_description') ?? '').trim() || null,
    source: 'admin',
    updated_at: now,
  };
}

export function validatePostRow(row) {
  const missing = [];
  if (!row.title) missing.push('title');
  if (!row.slug) missing.push('slug');
  if (!row.excerpt) missing.push('excerpt');
  if (!row.date) missing.push('date');
  if (!row.author) missing.push('author');
  return missing;
}
