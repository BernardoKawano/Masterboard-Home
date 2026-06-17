/**
 * Normaliza CNPJ para apenas dígitos (14 chars) ou retorna string vazia se inválido.
 */
export function normalizeCnpj(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length === 14 ? digits : '';
}

/**
 * Formata CNPJ para exibição: 00.000.000/0000-00
 */
export function formatCnpj(digits) {
  const normalized = normalizeCnpj(digits);
  if (!normalized) return '';

  return normalized.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
}

/**
 * Mapeia resposta da BrasilAPI para campos do formulário.
 */
export function mapBrasilApiCnpj(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const razaoSocial = typeof data.razao_social === 'string' ? data.razao_social.trim() : '';
  const nomeFantasia = typeof data.nome_fantasia === 'string' ? data.nome_fantasia.trim() : '';
  const municipio = typeof data.municipio === 'string' ? data.municipio.trim() : '';
  const uf = typeof data.uf === 'string' ? data.uf.trim() : '';
  const situacao =
    typeof data.descricao_situacao_cadastral === 'string'
      ? data.descricao_situacao_cadastral.trim()
      : '';

  const empresa = nomeFantasia || razaoSocial;
  const city = municipio && uf ? `${municipio} — ${uf}` : municipio || uf || '';

  return {
    razaoSocial,
    nomeFantasia,
    empresa,
    municipio,
    uf,
    city,
    situacaoCadastral: situacao,
  };
}
