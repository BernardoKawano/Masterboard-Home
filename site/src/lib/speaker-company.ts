import { parseRoleLabel } from './speaker-role';

export type CompanyConfidence = 'existente' | 'alta' | 'media' | 'pesquisa' | 'nenhuma';

export interface SpeakerCompanyInput {
  company?: string | null;
  role?: string | null;
  roleLabel?: string | null;
  companyLogoUrl?: string | null;
  linkedinUrl?: string | null;
  /** Empresa confirmada por pesquisa externa (script de research). */
  researchedCompany?: string | null;
  researchedRole?: string | null;
}

export interface CompanyResolution {
  company?: string;
  role?: string;
  confidence: CompanyConfidence;
  source: string;
  evidence: string;
}

const brandHints: Array<{ company: string; pattern: RegExp }> = [
  { company: 'Azul Linhas Aéreas', pattern: /\bazul\b.*\blinhas\b|\blogo azul linhas aereas\b/i },
  { company: 'Coca-Cola', pattern: /coca\s*cola/i },
  { company: 'Heineken', pattern: /heineken/i },
  { company: 'Amazon Web Services', pattern: /amazon web services|\baws\b/i },
  { company: 'Salesforce', pattern: /salesforce/i },
  { company: 'Surf Center', pattern: /surf\s*center/i },
  { company: 'Microsoft', pattern: /microsoft|\bmsft\b/i },
  { company: 'Wellhub', pattern: /wellhub/i },
  { company: 'Zettabuzz', pattern: /zettabuzz/i },
  { company: 'Grupo Barigui', pattern: /barigui/i },
  { company: 'Ondaskim', pattern: /ondaskim/i },
  { company: 'Driva', pattern: /\bdriva\b|logodriva/i },
  { company: "McDonald's", pattern: /mcdonald/i },
  { company: 'Hard Rock Curitiba', pattern: /hard rock curitiba|hardrock curitiba/i },
  { company: 'RP Trader', pattern: /rp\s*trader/i },
  { company: 'RPC', pattern: /\brpc\b/i },
  { company: 'VPx Company', pattern: /\bvpx\b/i },
  { company: 'Artesian Móveis', pattern: /artesian/i },
  { company: 'Ambev', pattern: /ambev/i },
  { company: 'Outback Steakhouse', pattern: /outback/i },
  { company: 'Super Festval', pattern: /super\s*festval|superfestval|festval/i },
  { company: 'VIASOFT', pattern: /\bviasoft\b/i },
  { company: 'Auda', pattern: /\bauda\b/i },
  { company: '+1 Café', pattern: /\+1\s*caf[eé]/i },
  { company: 'IVS Franquias', pattern: /\bivs\b/i },
  { company: 'Fight Music Show', pattern: /fight music show/i },
  { company: 'Cultura na Prática', pattern: /cultura na pratica/i },
];

const SCREENSHOT_HINT = /^captura de tela/i;

export function normalizeSpeakerText(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}

export function logoHint(url?: string | null): string {
  const filename = decodeURIComponent(String(url ?? '').split('/').pop() ?? '');
  return filename.replace(/\.[^.]+$/, '').trim();
}

function isUsefulLogoHint(hint: string): boolean {
  const trimmed = hint.trim();
  if (!trimmed) return false;
  if (SCREENSHOT_HINT.test(trimmed)) return false;
  if (/^logo$/i.test(trimmed)) return false;
  return true;
}

function findBrandHint(input: SpeakerCompanyInput): {
  company: string;
  source: 'role_label_brand' | 'logo_filename';
  evidence: string;
} | undefined {
  const roleLabel = String(input.roleLabel ?? '');
  const logoFileHint = logoHint(input.companyLogoUrl);
  const evidenceParts = [roleLabel, input.companyLogoUrl, logoFileHint].filter(Boolean);
  const evidence = evidenceParts.join(' ');
  const normalizedEvidence = normalizeSpeakerText(evidence);

  const match = brandHints.find(
    (hint) => hint.pattern.test(evidence) || hint.pattern.test(normalizedEvidence),
  );

  if (!match) return undefined;

  const roleLabelMatched =
    hintPatternMatches(match.pattern, roleLabel) ||
    hintPatternMatches(match.pattern, normalizeSpeakerText(roleLabel));

  if (roleLabelMatched) {
    return { company: match.company, source: 'role_label_brand', evidence: roleLabel };
  }

  if (isUsefulLogoHint(logoFileHint)) {
    return { company: match.company, source: 'logo_filename', evidence: logoFileHint };
  }

  return undefined;
}

function hintPatternMatches(pattern: RegExp, value: string): boolean {
  return pattern.test(value);
}

function extractLinkedInCompany(url?: string | null): string | undefined {
  const raw = String(url ?? '').trim();
  if (!raw) return undefined;

  const pathMatch = raw.match(/linkedin\.com\/company\/([^/?#]+)/i);
  if (pathMatch?.[1]) {
    return decodeURIComponent(pathMatch[1])
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return undefined;
}

/** Resolve empresa e cargo com base em evidências verificáveis — nunca inventa. */
export function resolveSpeakerCompany(input: SpeakerCompanyInput): CompanyResolution {
  const currentCompany = String(input.company ?? '').trim();
  if (currentCompany) {
    const parsedRole = parseRoleLabel(input.roleLabel || input.role || '');
    return {
      company: currentCompany,
      role: input.role?.trim() || parsedRole.role || undefined,
      confidence: 'existente',
      source: 'speakers.company',
      evidence: 'Empresa já preenchida na base.',
    };
  }

  const researchedCompany = String(input.researchedCompany ?? '').trim();
  if (researchedCompany) {
    return {
      company: researchedCompany,
      role: input.researchedRole?.trim() || input.role?.trim() || undefined,
      confidence: 'pesquisa',
      source: 'web_search',
      evidence: researchedCompany,
    };
  }

  const label = input.roleLabel || input.role || '';
  const parsed = parseRoleLabel(label);

  if (parsed.company) {
    return {
      company: parsed.company,
      role: parsed.role,
      confidence: 'alta',
      source: 'role_label_parser',
      evidence: label,
    };
  }

  const brandHint = findBrandHint(input);
  if (brandHint) {
    return {
      company: brandHint.company,
      role: input.role?.trim() || parsed.role,
      confidence: 'media',
      source: brandHint.source,
      evidence: brandHint.evidence,
    };
  }

  const linkedInCompany = extractLinkedInCompany(input.linkedinUrl);
  if (linkedInCompany) {
    return {
      company: linkedInCompany,
      role: input.role?.trim() || parsed.role,
      confidence: 'pesquisa',
      source: 'linkedin_url',
      evidence: input.linkedinUrl ?? linkedInCompany,
    };
  }

  const fallbackEvidence = isUsefulLogoHint(logoHint(input.companyLogoUrl))
    ? logoHint(input.companyLogoUrl)
    : label;

  return {
    confidence: 'nenhuma',
    source: 'needs_manual_review',
    evidence: fallbackEvidence,
    role: input.role?.trim() || parsed.role,
  };
}

/** Confianças que permitem persistir empresa no banco. */
export function isPersistableCompanyConfidence(confidence: CompanyConfidence): boolean {
  return confidence === 'existente' || confidence === 'alta' || confidence === 'media' || confidence === 'pesquisa';
}
