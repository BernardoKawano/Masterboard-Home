export const prerender = false;

import type { APIRoute } from 'astro';
import { mapBrasilApiCnpj, normalizeCnpj } from '../../../lib/cnpj-lookup.mjs';

const BRASIL_API_CNPJ = 'https://brasilapi.com.br/api/cnpj/v1';
const RECEITAWS_CNPJ  = 'https://receitaws.com.br/v1/cnpj';
const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function mapReceitaWs(data: Record<string, unknown>) {
  if (!data || data.status === 'ERROR') return null;
  const razaoSocial  = typeof data.nome === 'string'      ? data.nome.trim()      : '';
  const nomeFantasia = typeof data.fantasia === 'string'  ? data.fantasia.trim()  : '';
  const municipio    = typeof data.municipio === 'string' ? data.municipio.trim() : '';
  const uf           = typeof data.uf === 'string'        ? data.uf.trim()        : '';
  const situacao     = typeof data.situacao === 'string'  ? data.situacao.trim()  : '';
  const empresa      = nomeFantasia || razaoSocial;
  const city         = municipio && uf ? `${municipio} — ${uf}` : municipio || uf || '';
  return { razaoSocial, nomeFantasia, empresa, municipio, uf, city, situacaoCadastral: situacao };
}

export const GET: APIRoute = async ({ params }) => {
  const cnpj = normalizeCnpj(params.cnpj ?? '');

  if (!cnpj) {
    return new Response(JSON.stringify({ error: 'CNPJ inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Tenta BrasilAPI primeiro; fallback para ReceitaWS se falhar
  let mapped = null;

  try {
    const res1 = await fetchWithTimeout(`${BRASIL_API_CNPJ}/${cnpj}`, TIMEOUT_MS);
    if (res1.ok) {
      const data = await res1.json();
      mapped = mapBrasilApiCnpj(data);
    } else if (res1.status === 404) {
      return new Response(JSON.stringify({ error: 'CNPJ não encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    // BrasilAPI falhou — segue para o fallback
  }

  if (!mapped?.empresa) {
    try {
      const res2 = await fetchWithTimeout(`${RECEITAWS_CNPJ}/${cnpj}`, TIMEOUT_MS);
      if (res2.ok) {
        const data = await res2.json() as Record<string, unknown>;
        mapped = mapReceitaWs(data);
      }
    } catch {
      // fallback também falhou
    }
  }

  if (!mapped?.empresa) {
    return new Response(JSON.stringify({ error: 'Não foi possível consultar o CNPJ' }), {
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
};
