// Rota server-rendered: não pré-renderizar
export const prerender = false;

import type { APIRoute } from 'astro';

/**
 * Endpoint de recebimento de candidaturas.
 *
 * Para produção, integre aqui com:
 * - HubSpot / RD Station via API
 * - n8n / Make webhook
 * - Resend para e-mail transacional
 * - Supabase para persistência
 *
 * Nunca exponha chaves de API diretamente neste arquivo.
 * Use variáveis de ambiente: import.meta.env.MY_SECRET_KEY
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.formData();

    // Honeypot anti-spam
    if (data.get('_gotcha')) {
      return new Response(null, { status: 200 });
    }

    const payload = {
      nome: data.get('nome'),
      email: data.get('email'),
      telefone: data.get('telefone'),
      empresa: data.get('empresa'),
      cargo: data.get('cargo'),
      cidade: data.get('cidade'),
      intencao: data.get('intencao'),
      momento: data.get('momento'),
      lgpd: data.get('lgpd') === 'on',
      timestamp: new Date().toISOString(),
    };

    // Validação básica
    const required = ['nome', 'email', 'telefone', 'empresa', 'cargo'] as const;
    for (const field of required) {
      if (!payload[field]) {
        return new Response(
          JSON.stringify({ error: `Campo obrigatório ausente: ${field}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    // TODO: integrar com CRM/webhook aqui
    // Exemplo com webhook:
    // const webhookUrl = import.meta.env.LEAD_WEBHOOK_URL;
    // await fetch(webhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });

    console.log('[Candidatura recebida]', payload);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
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
