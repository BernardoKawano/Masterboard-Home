export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import {
  buildCandidaturaPayload,
  isDraftLead,
  toDraftLeadRow,
  validateDraftEmail,
  validateStep,
} from '../../../lib/candidatura-payload.mjs';

function getSupabase() {
  return createClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type DraftLead = { id: string; email: string; status: string; notes?: string | null };

async function findDraftByEmail(
  supabase: ReturnType<typeof getSupabase>,
  email: string,
): Promise<DraftLead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, email, status, notes')
    .ilike('email', email)
    .order('submitted_at', { ascending: false })
    .limit(10);

  if (error) throw new Error(`[Supabase] ${error.message}`);
  return (data as DraftLead[] | null)?.find((row) => isDraftLead(row)) ?? null;
}

async function findDraftById(
  supabase: ReturnType<typeof getSupabase>,
  leadId: string,
): Promise<DraftLead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, email, status, notes')
    .eq('id', leadId)
    .maybeSingle();

  if (error) throw new Error(`[Supabase] ${error.message}`);
  if (!data || !isDraftLead(data)) return null;
  return data as DraftLead;
}

async function recordActivity(
  supabase: ReturnType<typeof getSupabase>,
  leadId: string,
  type: string,
  description: string,
  metadata: Record<string, unknown>,
) {
  await supabase.from('lead_activities').insert({
    lead_id: leadId,
    type,
    description,
    metadata,
  } as never);
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
      formStep: 0,
    });

    const missing = validateDraftEmail(payload);
    if (missing.length > 0) {
      return jsonResponse({ error: `Campos inválidos: ${missing.join(', ')}` }, 400);
    }

    const supabase = getSupabase();
    const existing = await findDraftByEmail(supabase, payload.email);
    const row = toDraftLeadRow(payload, 0);

    if (existing?.id) {
      const { data: updated, error } = await supabase
        .from('leads')
        .update(row)
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) throw new Error(`[Supabase] ${error.message}`);

      await recordActivity(supabase, updated.id, 'step_completed', 'Rascunho atualizado (e-mail)', {
        step: 0,
        source: payload.source,
      });

      return jsonResponse({ leadId: updated.id, status: 'draft' }, 200);
    }

    const { data: inserted, error } = await supabase
      .from('leads')
      .insert(row)
      .select('id')
      .single();

    if (error) throw new Error(`[Supabase] ${error.message}`);

    await recordActivity(supabase, inserted.id, 'created', 'Rascunho de aplicação iniciado', {
      step: 0,
      source: payload.source,
    });

    return jsonResponse({ leadId: inserted.id, status: 'draft' }, 201);
  } catch (err) {
    console.error('[Erro no draft POST]', err);
    return jsonResponse({ error: 'Erro interno. Tente novamente.' }, 500);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const data = await request.formData();

    if (data.get('_gotcha')) {
      return new Response(null, { status: 200 });
    }

    const formStep = Number.parseInt(String(data.get('form_step') ?? ''), 10);
    if (!Number.isFinite(formStep) || formStep < 1 || formStep > 5) {
      return jsonResponse({ error: 'form_step inválido' }, 400);
    }

    const payload = buildCandidaturaPayload(data, {
      referrer: request.headers.get('referer') ?? '',
      timestamp: new Date().toISOString(),
      formStep,
    });

    if (!payload.leadId) {
      return jsonResponse({ error: 'lead_id ausente' }, 400);
    }

    const missing = validateStep(formStep, payload);
    if (missing.length > 0) {
      return jsonResponse({ error: `Campos inválidos: ${missing.join(', ')}` }, 400);
    }

    const supabase = getSupabase();
    const lead = await findDraftById(supabase, payload.leadId);

    if (!lead) {
      return jsonResponse({ error: 'Rascunho não encontrado' }, 404);
    }

    if (lead.email.toLowerCase() !== payload.email.toLowerCase()) {
      return jsonResponse({ error: 'E-mail não corresponde ao rascunho' }, 403);
    }

    const row = toDraftLeadRow(payload, formStep);

    const { data: updated, error } = await supabase
      .from('leads')
      .update(row)
      .eq('id', payload.leadId)
      .select('id')
      .single();

    if (error) throw new Error(`[Supabase] ${error.message}`);

    await recordActivity(supabase, updated.id, 'step_completed', `Passo ${formStep} salvo`, {
      step: formStep,
      source: payload.source,
      score: row.score,
      priority: row.priority,
    });

    return jsonResponse({ leadId: updated.id, status: 'draft' }, 200);
  } catch (err) {
    console.error('[Erro no draft PATCH]', err);
    return jsonResponse({ error: 'Erro interno. Tente novamente.' }, 500);
  }
};
