import { normalizeSpeakerText } from './speaker-company';

/** 6 colunas × 2,5 linhas (layout desktop de referência). */
export const MEMBER_PROFILE_VISIBLE_COUNT = 15;

/** 3 colunas × 2,5 linhas no fallback de empresas. */
export const MEMBER_COMPANY_VISIBLE_COUNT = 8;

export const MEMBER_VISIBLE_ROWS = 2.5;

interface BrandScore {
  score: number;
  pattern: RegExp;
}

const featuredBrands: BrandScore[] = [
  { score: 140, pattern: /\bmicrosoft\b|\bmsft\b/ },
  { score: 138, pattern: /\bamazon web services\b|\baws\b/ },
  { score: 136, pattern: /\bsalesforce\b/ },
  { score: 135, pattern: /\bmcdonald/ },
  { score: 134, pattern: /\bcoca\s*cola\b/ },
  { score: 133, pattern: /\bheineken\b/ },
  { score: 132, pattern: /\bambev\b|\bab inbev\b/ },
  { score: 131, pattern: /\bazul\b.*\baereas\b|\bazul linhas\b/ },
  { score: 128, pattern: /\bford\b|\bbarigui\b/ },
  { score: 126, pattern: /\bwellhub\b|\bgympass\b/ },
  { score: 124, pattern: /\boutback\b/ },
  { score: 122, pattern: /\brpc\b/ },
  { score: 120, pattern: /\bviasoft\b/ },
  { score: 118, pattern: /\bhard rock\b/ },
  { score: 116, pattern: /\bdriva\b/ },
  { score: 114, pattern: /\bfight music show\b/ },
  { score: 112, pattern: /\bgrupo opet\b|\buniopet\b/ },
  { score: 110, pattern: /\bartesian\b/ },
  { score: 108, pattern: /\bapex\b/ },
  { score: 106, pattern: /\broca\b/ },
  { score: 104, pattern: /\bsimplecon\b/ },
  { score: 102, pattern: /\bkurytiba\b/ },
  { score: 100, pattern: /\bbom gourmet\b/ },
  { score: 98, pattern: /\bsurf center\b/ },
  { score: 96, pattern: /\brp trader\b/ },
  { score: 94, pattern: /\bsuper festval\b|\bfestval\b/ },
  { score: 92, pattern: /\bopet\b/ },
  { score: 90, pattern: /\bgrupo\b|\bholding\b|\bindustrias\b|\bindustria\b/ },
  { score: 72, pattern: /\btech\b|\btecnologia\b|\bsoftware\b|\bdigital\b/ },
  { score: 68, pattern: /\bconsultoria\b|\badvisory\b/ },
];

const executiveRoleBonus = /\b(ceo|cfo|cto|coo|cmo|presidente|founder|fundador|diretor|vp|vice)\b/;

export function getMemberCompanyScore(company?: string | null, role?: string | null): number {
  const normalizedCompany = normalizeSpeakerText(String(company ?? ''));
  if (!normalizedCompany) return 0;

  let score = 0;

  for (const brand of featuredBrands) {
    if (brand.pattern.test(normalizedCompany)) {
      score = Math.max(score, brand.score);
    }
  }

  if (score === 0) {
    score = 40;
  }

  const normalizedRole = normalizeSpeakerText(String(role ?? ''));
  if (executiveRoleBonus.test(normalizedRole)) {
    score += 12;
  }

  return score;
}

export interface MemberLike {
  company?: string | null;
  role?: string | null;
  roleLabel?: string | null;
  companyLogo?: string | null;
  name?: string | null;
}

export interface CompanyLike {
  name?: string | null;
  logo?: string | null;
  revenue?: string | null;
  size?: string | null;
}

export function compareMembersByCompanyPrestige(a: MemberLike, b: MemberLike): number {
  const scoreDiff =
    getMemberCompanyScore(b.company, b.role ?? b.roleLabel) -
    getMemberCompanyScore(a.company, a.role ?? a.roleLabel);

  if (scoreDiff !== 0) return scoreDiff;

  if (b.companyLogo && !a.companyLogo) return 1;
  if (a.companyLogo && !b.companyLogo) return -1;

  return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'pt-BR');
}

export function compareCompaniesByPrestige(a: CompanyLike, b: CompanyLike): number {
  const scoreDiff = getMemberCompanyScore(b.name) - getMemberCompanyScore(a.name);
  if (scoreDiff !== 0) return scoreDiff;

  if (b.logo && !a.logo) return 1;
  if (a.logo && !b.logo) return -1;

  if (b.revenue && !a.revenue) return 1;
  if (a.revenue && !b.revenue) return -1;

  return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'pt-BR');
}

export function sortMembersByCompanyPrestige<T extends MemberLike>(members: T[]): T[] {
  return [...members].sort(compareMembersByCompanyPrestige);
}

export function sortCompaniesByPrestige<T extends CompanyLike>(companies: T[]): T[] {
  return [...companies].sort(compareCompaniesByPrestige);
}
