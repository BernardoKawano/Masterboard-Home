export const prerender = false;

import type { APIRoute } from 'astro';
import { mapBrasilApiCnpj, normalizeCnpj } from '../../../lib/cnpj-lookup.mjs';

const BRASIL_API_CNPJ = 'https://brasilapi.com.br/api/cnpj/v1';
const TIMEOUT_MS = 8000;

export const GET: APIRoute = async ({ params }) => {
  const cnpj = normalizeCnpj(params.cnpj ?? '');

  if (!cnpj) {
    return new Response(JSON.stringify({ error: 'CNPJ inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BRASIL_API_CNPJ}/${cnpj}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (response.status === 404) {
      return new Response(JSON.stringify({ error: 'CNPJ não encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Não foi possível consultar o CNPJ' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const mapped = mapBrasilApiCnpj(data);

    if (!mapped?.empresa) {
      return new Response(JSON.stringify({ error: 'Dados do CNPJ indisponíveis' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        cnpj,
        razaoSocial: mapped.razaoSocial,
        nomeFantasia: mapped.nomeFantasia,
        empresa: mapped.empresa,
        municipio: mapped.municipio,
        uf: mapped.uf,
        city: mapped.city,
        situacaoCadastral: mapped.situacaoCadastral,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=300',
        },
      },
    );
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    console.error('[Erro na consulta CNPJ]', err);
    return new Response(
      JSON.stringify({ error: aborted ? 'Consulta ao CNPJ expirou' : 'Erro ao consultar CNPJ' }),
      { status: aborted ? 504 : 500, headers: { 'Content-Type': 'application/json' } },
    );
  } finally {
    clearTimeout(timeout);
  }
};
