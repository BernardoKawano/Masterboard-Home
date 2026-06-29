export const prerender = false;

import type { APIRoute } from 'astro';
import { dataSource } from '../../../lib/data-source';
import { getGalleryUrl } from '../../../types/domain';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

export const OPTIONS: APIRoute = async () => new Response(null, {
  status: 204,
  headers: CORS_HEADERS,
});

export const GET: APIRoute = async () => {
  try {
    const galleries = await dataSource.listGalleries?.() ?? [];

    return new Response(JSON.stringify({
      galleries: galleries.map((gallery) => ({
        id: gallery.id,
        name: gallery.name,
        sortOrder: gallery.sortOrder ?? null,
        photoCount: gallery.photoCount ?? 0,
        coverImage: gallery.coverImage ?? null,
        url: getGalleryUrl(gallery),
      })),
    }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar galerias';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  }
};
