export const prerender = false;

import type { APIRoute } from 'astro';
import { dataSource } from '../../../lib/data-source';
import { getGalleryUrl } from '../../../types/domain';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
};

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 120;

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export const OPTIONS: APIRoute = async () => new Response(null, {
  status: 204,
  headers: CORS_HEADERS,
});

export const GET: APIRoute = async ({ params, url }) => {
  const slug = params.slug?.trim();
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug da galeria é obrigatório' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const page = parsePositiveInt(url.searchParams.get('page'), 1, 10_000);
  const limit = parsePositiveInt(url.searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
  const offset = (page - 1) * limit;

  try {
    const gallery = await dataSource.getGalleryById?.(slug) ?? null;
    if (!gallery) {
      return new Response(JSON.stringify({ error: 'Galeria não encontrada' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const [photos, total] = await Promise.all([
      dataSource.listGalleryPhotos?.(slug, { limit, offset }) ?? [],
      dataSource.countGalleryPhotos?.(slug) ?? gallery.photoCount ?? 0,
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return new Response(JSON.stringify({
      gallery: {
        id: gallery.id,
        name: gallery.name,
        sortOrder: gallery.sortOrder ?? null,
        photoCount: total,
        coverImage: gallery.coverImage ?? null,
        url: getGalleryUrl(gallery),
      },
      photos: photos.map((photo) => ({
        id: photo.id,
        name: photo.name,
        fileUrl: photo.fileUrl,
        sortOrder: photo.sortOrder ?? null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar galeria';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  }
};
