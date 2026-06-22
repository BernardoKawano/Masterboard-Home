export const prerender = false;

import type { APIRoute } from 'astro';
import {
  canManageLeads,
  getAdminSession,
  getServiceSupabaseClient,
  recordAdminAudit,
} from '../../../lib/admin/auth';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readDeletePayload(request: Request): Promise<{ id: string; action: string }> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { id?: string; action?: string; _action?: string };
    return {
      id: String(body.id ?? ''),
      action: String(body.action ?? body._action ?? ''),
    };
  }

  const data = await request.formData();
  return {
    id: String(data.get('id') ?? ''),
    action: String(data.get('_action') ?? data.get('action') ?? ''),
  };
}

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = await getAdminSession({ cookies });
  if (!session || !canManageLeads(session)) {
    return jsonResponse({ error: 'Não autorizado.' }, 403);
  }

  const { id, action } = await readDeletePayload(request);
  if (action !== 'delete') {
    return jsonResponse({ error: 'Ação inválida.' }, 400);
  }

  if (!id) {
    return jsonResponse({ error: 'Lead inválido.' }, 400);
  }

  const supabase = getServiceSupabaseClient();

  try {
    const { data: before, error: beforeError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (beforeError) throw new Error(beforeError.message);
    if (!before) return jsonResponse({ error: 'Lead não encontrado.' }, 404);

    const { error } = await (supabase.from('leads') as any).delete().eq('id', id);

    if (error) throw new Error(error.message);

    await recordAdminAudit({
      session,
      action: 'lead.deleted',
      resource: 'leads',
      resourceId: id,
      before,
    });

    return jsonResponse({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível excluir o lead.';
    return jsonResponse({ error: message }, 500);
  }
};
