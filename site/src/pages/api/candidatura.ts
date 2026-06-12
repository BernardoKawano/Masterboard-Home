export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import {
  buildCandidaturaPayload,
  toLeadRow,
  validateCandidaturaPayload,
} from '../../lib/candidatura-payload.mjs';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.formData();

    if (data.get('_gotcha')) {
      return new Response(null, { status: 200 });
    }

    const payload = buildCandidaturaPayload(data, {
      referrer: request.headers.get('referer') ?? '',
      timestamp: new Date().toISOString(),
    });

    const missing = validateCandidaturaPayload(payload);
    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ error: `Campos obrigatórios ausentes: ${missing.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const row = toLeadRow(payload);

    const { data: insertedLead, error } = await supabase
      .from('leads')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      throw new Error(`[Supabase] ${error.message}`);
    }

    if (insertedLead?.id) {
      await supabase.from('lead_activities').insert({
        lead_id: insertedLead.id,
        type: 'created',
        description: 'Candidatura recebida pelo site',
        metadata: { source: payload.source, score: row.score, priority: row.priority },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Erro na candidatura]', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
