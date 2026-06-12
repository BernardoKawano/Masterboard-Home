/**
 * Separa cargo e empresa de labels vindos do Bubble/Supabase.
 */
const roleComplements = new Set([
  'administrativo',
  'administrativa',
  'comercial',
  'executivo',
  'executiva',
  'financeiro',
  'financeira',
  'geral',
  'marketing',
  'operacoes',
  'operacional',
  'produto',
  'proprietario',
  'proprietaria',
  'vendas',
]);

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function parseRoleLabel(label: string): { role?: string; company?: string } {
  const cleaned = label.replace(/\s+/g, ' ').trim();
  if (!cleaned) return {};

  const patterns = [
    /^(.+?)\s+d(?:a|o|as|os)\s+(.+)$/i, // "CEO da VIASOFT"
    /^(.+?)\s+-\s+(.+)$/,               // "CEO - VIASOFT"
    /^(.+?)\s+\|\s+(.+)$/,              // "CEO | VIASOFT"
    /^(.+?)\s*:\s+(.+)$/,               // "Founder: Cultura na Prática"
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return { role: match[1].trim(), company: match[2].trim() };
    }
  }

  const prefixMatch = cleaned.match(
    /^(ceo|cfo|cto|coo|cmo|cco|cso|cro|vp|vice-presidente|presidente|founder|co-?founder|fundador|fundadora|s[oó]ci[oa]|diretor|diretora)\s+(.+)$/i,
  );

  if (prefixMatch) {
    const company = prefixMatch[2].trim();
    const normalizedCompany = normalize(company);
    const firstCompanyToken = normalizedCompany.split(/\s+/)[0] ?? '';

    if (
      !/^(d[aeo]s?|e)\b/i.test(company) &&
      !roleComplements.has(normalizedCompany) &&
      !roleComplements.has(firstCompanyToken)
    ) {
      return { role: prefixMatch[1].trim(), company };
    }
  }

  return { role: cleaned };
}
