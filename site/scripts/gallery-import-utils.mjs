/**
 * Utilitários para importar galerias/fotos do export CSV do Bubble.
 */

export const GALLERY_CSV_COLUMNS = [
  'Arquivo',
  'Galeria',
  'Nome',
  'Creation Date',
  'Modified Date',
  'Slug',
  'Creator',
];

export function cleanText(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

export function normalizeImageUrl(value) {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  if (cleaned.startsWith('//')) return `https:${cleaned}`;
  return cleaned;
}

export function safePathPart(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'galeria';
}

export function parseGalleryName(name) {
  const cleaned = cleanText(name);
  if (!cleaned) {
    return { sort_order: null, name: null, label: null };
  }

  const match = cleaned.match(/^(\d+)\.\s*(.+)$/);
  if (!match) {
    return { sort_order: null, name: cleaned, label: cleaned };
  }

  return {
    sort_order: Number.parseInt(match[1], 10),
    name: cleaned,
    label: match[2].trim(),
  };
}

export function gallerySlugFromName(name) {
  const parsed = parseGalleryName(name);
  return safePathPart(parsed.name ?? 'galeria');
}

export function extractBubbleSourceId(url) {
  const normalized = normalizeImageUrl(url);
  if (!normalized) return null;

  const match = normalized.match(/\/(f\d+x\d+)\//i);
  return match ? match[1] : null;
}

export function photoSortOrderFromName(name, fallbackIndex = 0) {
  const cleaned = cleanText(name);
  if (!cleaned) return fallbackIndex + 1;

  const match = cleaned.match(/(\d+)/);
  if (!match) return fallbackIndex + 1;

  return Number.parseInt(match[1], 10);
}

export function parseBubbleDate(value) {
  const cleaned = cleanText(value);
  if (!cleaned) return null;

  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

export function parseCsv(content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const rows = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = parseCsvLine(lines[lineIndex]);
    const row = {};

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      row[headers[columnIndex]] = values[columnIndex] ?? '';
    }

    rows.push(row);
  }

  return rows;
}

export function mapCsvRowToPhotoInput(row) {
  const galleryName = cleanText(row.Galeria);
  const name = cleanText(row.Nome) ?? cleanText(row.Arquivo)?.split('/').pop() ?? 'foto';
  const sourceUrl = normalizeImageUrl(row.Arquivo);
  const sourceId = extractBubbleSourceId(sourceUrl);

  if (!galleryName || !sourceUrl) {
    return {
      valid: false,
      reason: 'missing_gallery_or_file',
      galleryName,
      name,
      sourceUrl,
    };
  }

  return {
    valid: true,
    galleryName,
    gallerySlug: gallerySlugFromName(galleryName),
    name,
    sourceUrl,
    sourceId: sourceId ?? sourceUrl,
    bubbleCreator: cleanText(row.Creator),
    createdAt: parseBubbleDate(row['Creation Date']),
    modifiedAt: parseBubbleDate(row['Modified Date']),
    slug: cleanText(row.Slug),
  };
}

export function buildGalleryImportPlan(csvRows, now = new Date().toISOString()) {
  const galleriesBySlug = new Map();
  const photos = [];
  const skipped = [];

  for (const row of csvRows) {
    const mapped = mapCsvRowToPhotoInput(row);
    if (!mapped.valid) {
      skipped.push(mapped);
      continue;
    }

    if (!galleriesBySlug.has(mapped.gallerySlug)) {
      const parsed = parseGalleryName(mapped.galleryName);
      galleriesBySlug.set(mapped.gallerySlug, {
        name: parsed.name,
        slug: mapped.gallerySlug,
        sort_order: parsed.sort_order,
        is_published: true,
        source: 'bubble',
        source_id: mapped.gallerySlug,
        updated_at: now,
      });
    }

    photos.push(mapped);
  }

  const photosByGallery = new Map();
  for (const photo of photos) {
    if (!photosByGallery.has(photo.gallerySlug)) {
      photosByGallery.set(photo.gallerySlug, []);
    }
    photosByGallery.get(photo.gallerySlug).push(photo);
  }

  const galleryPhotos = [];
  for (const [gallerySlug, galleryPhotoRows] of photosByGallery.entries()) {
    galleryPhotoRows.forEach((photo, index) => {
      galleryPhotos.push({
        gallery_slug: gallerySlug,
        name: photo.name,
        file_url: photo.sourceUrl,
        source_url: photo.sourceUrl,
        sort_order: photoSortOrderFromName(photo.name, index),
        bubble_creator: photo.bubbleCreator,
        source: 'bubble',
        source_id: photo.sourceId,
        created_at: photo.createdAt,
        updated_at: now,
      });
    });
  }

  return {
    galleries: [...galleriesBySlug.values()].sort((a, b) => {
      const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB || a.name.localeCompare(b.name, 'pt-BR');
    }),
    photos: galleryPhotos,
    skipped,
  };
}

export function parseImportArgs(argv) {
  const csvArg = argv.find((arg) => arg.startsWith('--csv='));
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const batchArg = argv.find((arg) => arg.startsWith('--batch='));

  return {
    execute: argv.includes('--execute'),
    csvPath: csvArg ? csvArg.split('=').slice(1).join('=') : null,
    limit: limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : Number.POSITIVE_INFINITY,
    batchSize: batchArg ? Number.parseInt(batchArg.split('=')[1], 10) : 200,
  };
}

export function chunkArray(items, size) {
  if (size < 1) throw new RangeError('batch size must be at least 1');

  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
