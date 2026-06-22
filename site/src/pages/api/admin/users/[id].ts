export const prerender = false;

import type { APIRoute } from 'astro';
import { canManageMembers, getAdminSession } from '../../../../lib/admin/auth';
import { formatBubbleDateTime } from '../../../../lib/admin/bubble-users.mjs';
import { getAppUserById, isBubbleUsersConfigured } from '../../../../lib/admin/fetch-bubble-users';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ cookies, params }) => {
  const session = await getAdminSession({ cookies });
  if (!session || !canManageMembers(session)) {
    return jsonResponse({ error: 'Não autorizado.' }, 403);
  }

  if (!isBubbleUsersConfigured()) {
    return jsonResponse({ error: 'BUBBLE_API_TOKEN não configurado.' }, 503);
  }

  const id = String(params.id ?? '').trim();
  if (!id) return jsonResponse({ error: 'Usuário inválido.' }, 400);

  try {
    const user = await getAppUserById(id);
    if (!user) return jsonResponse({ error: 'Usuário não encontrado.' }, 404);

    return jsonResponse({
      user: {
        ...user,
        joinedAtLabel: formatBubbleDateTime(user.joinedAt, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        renewalAtLabel: formatBubbleDateTime(user.renewalAt, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        registeredAtLabel: formatBubbleDateTime(user.registeredAt),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar o usuário.';
    return jsonResponse({ error: message }, 500);
  }
};
