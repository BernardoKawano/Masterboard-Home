import type { CompanyResolution } from './speaker-company';
import { normalizeSpeakerText } from './speaker-company';
import companyProfiles from '../data/company-profiles.json';

export interface SpeakerBioInput {
  name: string;
  role?: string | null;
  roleLabel?: string | null;
  bio?: string | null;
  topics?: string[] | null;
}

type PresentationArea =
  | 'ceo'
  | 'cfo'
  | 'cso'
  | 'cmo'
  | 'marketing'
  | 'vendas'
  | 'comercial'
  | 'tecnologia'
  | 'cx'
  | 'rh'
  | 'comunicacao'
  | 'founder'
  | 'franquias'
  | 'automotivo'
  | 'aviacao'
  | 'gestao'
  | 'mentor'
  | 'educacao'
  | 'eventos'
  | 'varejo'
  | 'industria'
  | 'executivo';

const companyPresentationFocus: Record<string, Partial<Record<PresentationArea, string>>> = {
  VIASOFT: {
    ceo: 'escala de produto, clientes e go-to-market de um ERP para agronegócio e indústria',
    tecnologia: 'arquitetura de software, inovação e entrega de produto em ERP',
  },
  "McDonald's": {
    ceo: 'operações, expansão de rede e gestão de uma das maiores marcas de food service do mundo',
  },
  'Coca-Cola': {
    marketing: 'estratégia de marca, LATAM e posicionamento em bebidas globais',
  },
  Heineken: {
    marketing: 'marketing de marca, consumo e crescimento no mercado de bebidas',
  },
  'Amazon Web Services': {
    vendas: 'cloud computing, vendas consultivas e transformação digital',
  },
  Salesforce: {
    vendas: 'CRM, automação comercial e ciclos de venda enterprise',
  },
  Microsoft: {
    executivo: 'estratégia corporativa, parcerias e inovação em nuvem e produtividade',
    tecnologia: 'tecnologia, produto digital e adoção de soluções Microsoft',
  },
  Wellhub: {
    cx: 'experiência do colaborador, retenção e bem-estar corporativo',
    tecnologia: 'produto digital, plataforma e inovação em well-being',
  },
  'Grupo Barigui': {
    automotivo: 'mercado automotivo, operações de concessionária e crescimento de rede',
  },
  'Azul Linhas Aéreas': {
    aviacao: 'aviação comercial, operação e competitividade no setor aéreo',
  },
  Ambev: {
    comercial: 'estratégia comercial, distribuição e performance de vendas na Ambev',
  },
  RPC: {
    comunicacao: 'comunicação integrada, mídia e conversão comercial no grupo RPC',
    vendas: 'comunicação com foco comercial, narrativa de marca e receita',
  },
  'RP Trader': {
    ceo: 'decisões de trading, distribuição e expansão da RP Trader',
    vendas: 'operacao comercial, relacionamento com clientes e metas de vendas',
  },
  Driva: {
    ceo: 'visão de produto, crescimento e operação comercial',
    tecnologia: 'tecnologia aplicada a operações comerciais e evolução de produto',
  },
  'Outback Steakhouse': {
    vendas: 'cultura de vendas, liderança de pessoas e operação de restaurantes',
  },
  'Super Festval': {
    marketing: 'marketing de varejo, proximidade com o cliente e crescimento regional',
  },
  'Hard Rock Curitiba': {
    ceo: 'experiência de entretenimento, hospitalidade e gestão da operação local',
  },
  'Fight Music Show': {
    ceo: 'produção de eventos, negócios de entretenimento e escala de audiência',
  },
  'Cultura na Prática': {
    founder: 'cultura organizacional, liderança humana e práticas de gestão de pessoas',
  },
  'Grupo Opet': {
    ceo: 'gestão educacional, expansão institucional e liderança de grupo',
  },
  'Surf Center': {
    ceo: 'retail, comunidade e crescimento de uma rede de surf',
  },
  Zettabuzz: {
    marketing: 'performance digital, mídia paga e crescimento de marcas',
  },
  Ondaskim: {
    comunicacao: 'comunicação de marca, lifestyle e posicionamento da Ondaskim',
  },
  'Artesian Móveis': {
    industria: 'indústria moveleira, produção e relação com o mercado corporativo',
  },
  Auda: {
    ceo: 'estratégia digital, produto e crescimento da Auda',
  },
  '+1 Café': {
    founder: 'franquias, operação de cafeterias e expansão de rede',
  },
  'IVS Franquias': {
    franquias: 'modelo de franquias, expansão e gestão de rede',
  },
  'VPx Company': {
    ceo: 'educação executiva, desenvolvimento de líderes e negócios de conhecimento',
  },
};

const areaPresentationFallback: Record<PresentationArea, string> = {
  ceo: 'decisões de crescimento, liderança executiva e bastidores de escala de negócios',
  cfo: 'finanças corporativas, controle de resultados e alocação de capital',
  cso: 'estratégia comercial, receita e alinhamento entre vendas e operação',
  cmo: 'marca, aquisição de clientes e posicionamento competitivo',
  marketing: 'marketing, posicionamento de marca e crescimento com foco em demanda',
  vendas: 'vendas, pipeline comercial e execução de metas de receita',
  comercial: 'estratégia comercial, relacionamento com clientes e expansão de mercado',
  tecnologia: 'tecnologia aplicada a negócios, produto digital e inovação',
  cx: 'experiência do cliente, retenção e jornadas de relacionamento',
  rh: 'gestão de pessoas, cultura organizacional e desenvolvimento de talentos',
  comunicacao: 'comunicação corporativa, narrativa de marca e reputação',
  founder: 'construção de negócio, produto, time e decisões de fundador',
  franquias: 'expansão por franquias, padronização operacional e crescimento de rede',
  automotivo: 'mercado automotivo, operações e visão de varejo de veículos',
  aviacao: 'aviação, mobilidade aérea e dinâmica do setor',
  gestao: 'gestão empresarial, priorização estratégica e execução',
  mentor: 'mentoria prática para empresários, com foco em decisões reais de mercado',
  educacao: 'educação, formação de líderes e desenvolvimento institucional',
  eventos: 'produção de eventos, entretenimento e monetização de audiência',
  varejo: 'operações de varejo, proximidade com o cliente e crescimento de lojas',
  industria: 'indústria, produção, supply chain e competitividade',
  executivo: 'visão executiva, liderança transversal e decisões de alto impacto',
};

function detectPresentationArea(roleLabel: string, role?: string): PresentationArea {
  const text = normalizeSpeakerText(`${roleLabel} ${role ?? ''}`);

  if (/\bcfo\b/.test(text)) return 'cfo';
  if (/\bcso\b/.test(text)) return 'cso';
  if (/\bcmo\b|\bcco\b/.test(text)) return 'cmo';
  if (/recursos humanos|\brh\b/.test(text)) return 'rh';
  if (/\bcx\b|experiencia do cliente/.test(text)) return 'cx';
  if (/comunicacao e vendas/.test(text)) return 'vendas';
  if (/comunicacao/.test(text)) return 'comunicacao';
  if (/vendas e pessoas/.test(text)) return 'vendas';
  if (/vendas|comercial/.test(text)) return text.includes('comercial') ? 'comercial' : 'vendas';
  if (/marketing|latam/.test(text)) return 'marketing';
  if (/tecnologia/.test(text)) return 'tecnologia';
  if (/automotivo|barigui/.test(text)) return 'automotivo';
  if (/aviacao|azul/.test(text)) return 'aviacao';
  if (/franquias|\bsocia\b/.test(text)) return 'franquias';
  if (/mentor/.test(text)) return 'mentor';
  if (/gestao|planejamento estrategico/.test(text)) return 'gestao';
  if (/founder|fundador|fundadora|co founder|co-founder|socio-fundador/.test(text)) return 'founder';
  if (/\bceo\b|presidente|vice presidente/.test(text)) return 'ceo';
  if (/executiv/.test(text)) return 'executivo';
  if (/diretor/.test(text)) return 'executivo';
  if (/empresa/.test(text)) return 'industria';

  return 'executivo';
}

function getCompanyPresentationFocus(company: string, area: PresentationArea): string | undefined {
  const profile = companyProfiles[company as keyof typeof companyProfiles];
  const focusMap = companyPresentationFocus[company];
  const focus = focusMap?.[area] ?? focusMap?.executivo ?? focusMap?.ceo;

  if (focus) return focus;

  if (profile) {
    const normalizedProfile = profile.toLowerCase();
    if (normalizedProfile.includes('erp') || normalizedProfile.includes('software')) {
      return 'software, produto e crescimento B2B';
    }
    if (normalizedProfile.includes('varejo') || normalizedProfile.includes('supermercado')) {
      return 'varejo, operação de lojas e proximidade com o consumidor';
    }
    if (normalizedProfile.includes('cervej') || normalizedProfile.includes('bebidas')) {
      return 'mercado de bebidas, distribuição e performance comercial';
    }
    if (normalizedProfile.includes('franqu')) {
      return 'franquias, expansão e padronização operacional';
    }
    if (normalizedProfile.includes('educa')) {
      return 'educação, instituições e formação de lideranças';
    }
  }

  return undefined;
}

function formatTopics(topics?: string[] | null): string | undefined {
  const cleaned = (topics ?? []).map((topic) => topic.trim()).filter(Boolean);
  if (cleaned.length === 0) return undefined;
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} e ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')} e ${cleaned.at(-1)}`;
}

/** Texto do bloco "Apresenta" — o que o speaker faz ou traz à mesa. */
export function buildSpeakerPresentation(
  speaker: SpeakerBioInput,
  resolution: CompanyResolution,
): string {
  const roleLabel = String(speaker.roleLabel ?? speaker.role ?? '').trim();
  const role = resolution.role?.trim() || speaker.role?.trim() || roleLabel || 'Líder convidado';
  const company = resolution.company?.trim();
  const area = detectPresentationArea(roleLabel, role);
  const topicsLine = formatTopics(speaker.topics);

  const companyFocus = company ? getCompanyPresentationFocus(company, area) : undefined;
  const areaFocus = areaPresentationFallback[area];

  const focus = companyFocus ?? areaFocus;

  if (topicsLine) {
    return `Apresenta ${topicsLine.toLowerCase()}, com foco em ${focus}.`;
  }

  if (company) {
    return `Apresenta ${focus} — ${company}.`;
  }

  return `Apresenta ${focus}.`;
}

/** Compat: bio persistida = bloco "Apresenta". */
export function buildSpeakerBio(
  speaker: SpeakerBioInput,
  resolution: CompanyResolution,
): string {
  const existingBio = String(speaker.bio ?? '').trim();
  if (existingBio && !existingBio.startsWith('Apresenta ')) {
    return existingBio;
  }

  return buildSpeakerPresentation(speaker, resolution);
}
