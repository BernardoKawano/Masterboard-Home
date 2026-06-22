export const prerender = false;

import type { APIRoute } from 'astro';
import { canManageMembers, getAdminSession } from '../../../../lib/admin/auth';
import { filterAppUsers, toAppUserListItem } from '../../../../lib/admin/bubble-users.mjs';
import {
  getAllAppUsersMapped,
  isBubbleUsersConfigured,
} from '../../../../lib/admin/fetch-bubble-users';
import {
  applyUserFilters,
  buildUserFilterOptions,
  countActiveUserFilters,
  parseUserFilters,
} from '../../../../lib/admin/user-filters.mjs';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ cookies, url }) => {
  const session = await getAdminSession({ cookies });
  if (!session || !canManageMembers(session)) {
    return jsonResponse({ error: 'Não autorizado.' }, 403);
  }

  if (!isBubbleUsersConfigured()) {
    return jsonResponse(
      { error: 'BUBBLE_API_TOKEN não configurado. Adicione o token do Bubble no ambiente do site.' },
      503,
    );
  }

  const query = (url.searchParams.get('q') ?? '').trim();
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 100);
  const filters = parseUserFilters(url.searchParams);

  try {
    const allUsers = await getAllAppUsersMapped();
    const searched = filterAppUsers(allUsers, query);
    const filtered = applyUserFilters(searched, filters);
    const page = filtered.slice(offset, offset + limit).map(toAppUserListItem);

    return jsonResponse({
      users: page,
      total: filtered.length,
      globalTotal: allUsers.length,
      offset,
      limit,
      hasMore: offset + limit < filtered.length,
      query,
      filters,
      activeFilterCount: countActiveUserFilters(filters),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar usuários.';
    return jsonResponse({ error: message }, 500);
  }
};

export const POST: APIRoute = async ({ cookies }) => {
  const session = await getAdminSession({ cookies });
  if (!session || !canManageMembers(session)) {
    return jsonResponse({ error: 'Não autorizado.' }, 403);
  }

  if (!isBubbleUsersConfigured()) {
    return jsonResponse({ error: 'BUBBLE_API_TOKEN não configurado.' }, 503);
  }

  try {
    const allUsers = await getAllAppUsersMapped();
    return jsonResponse({
      options: buildUserFilterOptions(allUsers),
      globalTotal: allUsers.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar filtros.';
    return jsonResponse({ error: message }, 500);
  }
};
