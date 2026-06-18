const __modules = {};
__mod_0 = { exports: {} };
__mod_1 = { exports: {} };
(function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRoleLabel = parseRoleLabel;
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
const normalize = (value) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
function parseRoleLabel(label) {
    const cleaned = label.replace(/\s+/g, ' ').trim();
    if (!cleaned)
        return {};
    const patterns = [
        /^(.+?)\s+d(?:a|o|as|os)\s+(.+)$/i, // "CEO da VIASOFT"
        /^(.+?)\s+-\s+(.+)$/, // "CEO - VIASOFT"
        /^(.+?)\s+\|\s+(.+)$/, // "CEO | VIASOFT"
        /^(.+?)\s*:\s+(.+)$/, // "Founder: Cultura na Prática"
    ];
    for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) {
            return { role: match[1].trim(), company: match[2].trim() };
        }
    }
    const prefixMatch = cleaned.match(/^(ceo|cfo|cto|coo|cmo|cco|cso|cro|vp|vice-presidente|presidente|founder|co-?founder|fundador|fundadora|s[oó]ci[oa]|diretor|diretora)\s+(.+)$/i);
    if (prefixMatch) {
        const company = prefixMatch[2].trim();
        const normalizedCompany = normalize(company);
        const firstCompanyToken = normalizedCompany.split(/\s+/)[0] ?? '';
        if (!/^(d[aeo]s?|e)\b/i.test(company) &&
            !roleComplements.has(normalizedCompany) &&
            !roleComplements.has(firstCompanyToken)) {
            return { role: prefixMatch[1].trim(), company };
        }
    }
    return { role: cleaned };
}

})(__mod_1.exports, __mod_1);
__mod_2 = { exports: {} };
const parseRoleLabel = __mod_1.exports.parseRoleLabel;
(function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSpeakerText = normalizeSpeakerText;
exports.logoHint = logoHint;
exports.findAllBrandHints = findAllBrandHints;
exports.resolveSpeakerCompanies = resolveSpeakerCompanies;
exports.resolveSpeakerCompany = resolveSpeakerCompany;
exports.isPersistableCompanyConfidence = isPersistableCompanyConfidence;
const brandHints = [
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
function normalizeSpeakerText(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9+]+/g, ' ')
        .trim();
}
function logoHint(url) {
    const filename = decodeURIComponent(String(url ?? '').split('/').pop() ?? '');
    return filename.replace(/\.[^.]+$/, '').trim();
}
function isUsefulLogoHint(hint) {
    const trimmed = hint.trim();
    if (!trimmed)
        return false;
    if (SCREENSHOT_HINT.test(trimmed))
        return false;
    if (/^logo$/i.test(trimmed))
        return false;
    return true;
}
function findBrandHint(input) {
    const roleLabel = String(input.roleLabel ?? '');
    const logoFileHint = logoHint(input.companyLogoUrl);
    const evidenceParts = [roleLabel, input.companyLogoUrl, logoFileHint].filter(Boolean);
    const evidence = evidenceParts.join(' ');
    const normalizedEvidence = normalizeSpeakerText(evidence);
    const match = brandHints.find((hint) => hint.pattern.test(evidence) || hint.pattern.test(normalizedEvidence));
    if (!match)
        return undefined;
    const roleLabelMatched = hintPatternMatches(match.pattern, roleLabel) ||
        hintPatternMatches(match.pattern, normalizeSpeakerText(roleLabel));
    if (roleLabelMatched) {
        return { company: match.company, source: 'role_label_brand', evidence: roleLabel };
    }
    if (isUsefulLogoHint(logoFileHint)) {
        return { company: match.company, source: 'logo_filename', evidence: logoFileHint };
    }
    return undefined;
}
function hintPatternMatches(pattern, value) {
    return pattern.test(value);
}
/** Todas as marcas identificáveis no label/logo — sem inventar nomes novos. */
function findAllBrandHints(input) {
    const roleLabel = String(input.roleLabel ?? '');
    const logoFileHint = logoHint(input.companyLogoUrl);
    const evidenceParts = [
        roleLabel,
        input.company,
        input.companyLogoUrl,
        logoFileHint,
    ].filter(Boolean);
    const evidence = evidenceParts.join(' ');
    const normalizedEvidence = normalizeSpeakerText(evidence);
    const matches = [];
    for (const hint of brandHints) {
        if (hint.pattern.test(evidence) || hint.pattern.test(normalizedEvidence)) {
            matches.push(hint.company);
        }
    }
    return matches;
}
const companyListSeparators = /\s+(?:e|\/|\|)\s+|\s*,\s*/i;
function dedupeCompanies(companies) {
    const seen = new Set();
    const result = [];
    for (const company of companies) {
        const trimmed = company.trim();
        if (!trimmed)
            continue;
        const key = normalizeSpeakerText(trimmed);
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(trimmed);
    }
    return result;
}
function splitCompanyCandidates(value) {
    const raw = String(value ?? '').trim();
    if (!raw)
        return [];
    if (!companyListSeparators.test(raw)) {
        return [raw];
    }
    return raw
        .split(companyListSeparators)
        .map((part) => part.trim())
        .filter(Boolean);
}
function looksLikeCompanyName(value) {
    const normalized = normalizeSpeakerText(value);
    if (!normalized || normalized.length < 2)
        return false;
    if (/^(empresa|marketing|vendas|comercial|tecnologia|gestao|comunicacao|cx|automotivo|aviacao)$/.test(normalized)) {
        return false;
    }
    return true;
}
/** Empresas verificáveis associadas ao speaker (primária + extras do label/logo). */
function resolveSpeakerCompanies(input, resolution) {
    const candidates = [];
    if (resolution.company) {
        candidates.push(...splitCompanyCandidates(resolution.company));
    }
    candidates.push(...splitCompanyCandidates(input.company));
    candidates.push(...findAllBrandHints(input));
    const parsed = parseRoleLabel(input.roleLabel || input.role || '');
    if (parsed.company) {
        candidates.push(...splitCompanyCandidates(parsed.company));
    }
    return dedupeCompanies(candidates.filter(looksLikeCompanyName));
}
function extractLinkedInCompany(url) {
    const raw = String(url ?? '').trim();
    if (!raw)
        return undefined;
    const pathMatch = raw.match(/linkedin\.com\/company\/([^/?#]+)/i);
    if (pathMatch?.[1]) {
        return decodeURIComponent(pathMatch[1])
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }
    return undefined;
}
/** Resolve empresa e cargo com base em evidências verificáveis — nunca inventa. */
function resolveSpeakerCompany(input) {
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
function isPersistableCompanyConfidence(confidence) {
    return confidence === 'existente' || confidence === 'alta' || confidence === 'media' || confidence === 'pesquisa';
}

})(__mod_2.exports, __mod_2);
__mod_3 = { exports: {} };
const memberPhotoOverrides = {};
const normalizeSpeakerText = __mod_2.exports.normalizeSpeakerText;
(function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePersonNameKey = normalizePersonNameKey;
exports.isUsableMemberPhotoUrl = isUsableMemberPhotoUrl;
exports.resolveMemberPhoto = resolveMemberPhoto;
exports.buildSpeakerPhotoLookup = buildSpeakerPhotoLookup;
const unusablePhotoPattern = /(?:logo|logotipo|marca|brand|captura de tela|screenshot|placeholder|default|avatar-default|textura|texture|pattern|banner|cover|favicon|icon|sprite|emoji|silhueta)/i;
const overrides = memberPhotoOverrides;
function normalizePersonNameKey(name) {
    return normalizeSpeakerText(name);
}
function isUsableMemberPhotoUrl(photo, companyLogo) {
    const url = String(photo ?? '').trim();
    if (!url)
        return false;
    if (!/^https?:\/\//i.test(url))
        return false;
    if (unusablePhotoPattern.test(url))
        return false;
    const logo = String(companyLogo ?? '').trim();
    if (logo && url === logo)
        return false;
    try {
        const photoPath = new URL(url).pathname.toLowerCase();
        if (unusablePhotoPattern.test(photoPath))
            return false;
        if (logo) {
            const logoPath = new URL(logo).pathname.toLowerCase();
            if (photoPath === logoPath)
                return false;
        }
    }
    catch {
        return false;
    }
    return true;
}
function lookupOverride(input) {
    const nameKey = normalizePersonNameKey(input.name);
    const byName = overrides[nameKey];
    if (byName && isUsableMemberPhotoUrl(byName))
        return byName;
    const bySource = input.sourceId ? overrides[input.sourceId] : undefined;
    if (bySource && isUsableMemberPhotoUrl(bySource))
        return bySource;
    return undefined;
}
function lookupSpeakerPhoto(input, speakers) {
    const nameKey = normalizePersonNameKey(input.name);
    const speaker = speakers.find((item) => normalizePersonNameKey(item.name) === nameKey);
    if (!speaker?.photo)
        return undefined;
    if (!isUsableMemberPhotoUrl(speaker.photo, input.companyLogo))
        return undefined;
    return speaker.photo;
}
/** Resolve a melhor foto disponível sem inventar URL genérica. */
function resolveMemberPhoto(input, speakers = []) {
    const override = lookupOverride(input);
    if (override)
        return override;
    const speakerPhoto = lookupSpeakerPhoto(input, speakers);
    if (speakerPhoto)
        return speakerPhoto;
    if (isUsableMemberPhotoUrl(input.photo, input.companyLogo)) {
        return input.photo ?? undefined;
    }
    return undefined;
}
function buildSpeakerPhotoLookup(speakers) {
    return speakers.map((speaker) => ({
        name: speaker.name,
        photo: speaker.photo,
    }));
}

})(__mod_3.exports, __mod_3);
module.exports = __mod_3.exports;