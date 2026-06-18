export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '../../lib/supabase-client';
import {
  buildCandidaturaPayload,
  isDraftLead,
  toLeadRow,
  validateCandidaturaPayload,
} from '../../lib/candidatura-payload.mjs';

function getSupabase() {
  return createServerSupabaseClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.formData();

    if (data.get('_gotcha')) {
      return new Response(null, { status: 200 });
    }

    const payload = buildCandidaturaPayload(data, {
      referrer: request.headers.get('referer') ?? '',
      timestamp: new Date().toISOString(),
      formStep: 6,
    });

    const missing = validateCandidaturaPayload(payload);
    if (missing.length > 0) {
      return jsonResponse({ error: `Campos obrigatórios ausentes: ${missing.join(', ')}` }, 400);
    }

    const supabase = getSupabase();
    const row = toLeadRow(payload);
    const leadId = payload.leadId;

    if (leadId) {
      const { data: existing, error: fetchError } = await supabase
        .from('leads')
        .select('id, email, status, notes')
        .eq('id', leadId)
        .maybeSingle();

      if (fetchError) throw new Error(`[Supabase] ${fetchError.message}`);

      if (!existing) {
        return jsonResponse({ error: 'Aplicação não encontrada' }, 404);
      }

      if (existing.email.toLowerCase() !== payload.email.toLowerCase()) {
        return jsonResponse({ error: 'E-mail não corresponde à aplicação' }, 403);
      }

      if (!isDraftLead(existing)) {
        return jsonResponse({ error: 'Aplicação já foi enviada' }, 409);
      }

      const { data: updatedLead, error } = await supabase
        .from('leads')
        .update(row)
        .eq('id', leadId)
        .select('id')
        .single();

      if (error) throw new Error(`[Supabase] ${error.message}`);

      await supabase.from('lead_activities').insert({
        lead_id: updatedLead.id,
        type: 'completed',
        description: 'Aplicação finalizada pelo site',
        metadata: { source: payload.source, score: row.score, priority: row.priority },
      });

      return jsonResponse({ success: true, leadId: updatedLead.id }, 200);
    }

    const { data: insertedLead, error } = await supabase
      .from('leads')
      .insert(row)
      .select('id')
      .single();

    if (error) throw new Error(`[Supabase] ${error.message}`);

    if (insertedLead?.id) {
      await supabase.from('lead_activities').insert({
        lead_id: insertedLead.id,
        type: 'created',
        description: 'Aplicação recebida pelo site',
        metadata: { source: payload.source, score: row.score, priority: row.priority },
      });
    }

    return jsonResponse({ success: true, leadId: insertedLead?.id }, 201);
  } catch (err) {
    console.error('[Erro na aplicação]', err);
    return jsonResponse({ error: 'Erro interno. Tente novamente.' }, 500);
  }
};
