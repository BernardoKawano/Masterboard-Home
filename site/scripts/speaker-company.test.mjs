import assert from 'node:assert/strict';
import { loadTsModuleFromPath } from './load-ts-bundle.mjs';

const {
  resolveSpeakerCompany,
  isPersistableCompanyConfidence,
  logoHint,
} = loadTsModuleFromPath('../src/lib/speaker-company.ts');

const plain = (value) => JSON.parse(JSON.stringify(value));

// Alta confiança — parser de role_label
assert.deepEqual(
  plain(resolveSpeakerCompany({ roleLabel: 'CEO da VIASOFT' })),
  {
    company: 'VIASOFT',
    role: 'CEO',
    confidence: 'alta',
    source: 'role_label_parser',
    evidence: 'CEO da VIASOFT',
  },
);

assert.deepEqual(
  plain(resolveSpeakerCompany({ roleLabel: 'CEO Driva' })),
  {
    company: 'Driva',
    role: 'CEO',
    confidence: 'alta',
    source: 'role_label_parser',
    evidence: 'CEO Driva',
  },
);

assert.deepEqual(
  plain(resolveSpeakerCompany({ roleLabel: 'Founder: Cultura na Prática' })),
  {
    company: 'Cultura na Prática',
    role: 'Founder',
    confidence: 'alta',
    source: 'role_label_parser',
    evidence: 'Founder: Cultura na Prática',
  },
);

// Existente no banco tem prioridade
assert.deepEqual(
  plain(resolveSpeakerCompany({ company: 'VIASOFT', roleLabel: 'CEO' })),
  {
    company: 'VIASOFT',
    role: 'CEO',
    confidence: 'existente',
    source: 'speakers.company',
    evidence: 'Empresa já preenchida na base.',
  },
);

// Média confiança — marca no role_label
assert.deepEqual(
  plain(resolveSpeakerCompany({ roleLabel: 'LATAM Coca-Cola' })),
  {
    company: 'Coca-Cola',
    role: 'LATAM Coca-Cola',
    confidence: 'media',
    source: 'role_label_brand',
    evidence: 'LATAM Coca-Cola',
  },
);

// Média confiança — logo filename
assert.deepEqual(
  plain(
    resolveSpeakerCompany({
      roleLabel: 'Aviação',
      role: 'Aviação',
      companyLogoUrl: 'https://example.com/LOGO_AZUL_LINHAS_AEREAS.png',
    }),
  ),
  {
    company: 'Azul Linhas Aéreas',
    role: 'Aviação',
    confidence: 'media',
    source: 'logo_filename',
    evidence: 'LOGO_AZUL_LINHAS_AEREAS',
  },
);

// CEO genérico — sem empresa inventada
assert.deepEqual(
  plain(resolveSpeakerCompany({ roleLabel: 'CEO', role: 'CEO' })),
  {
    confidence: 'nenhuma',
    source: 'needs_manual_review',
    evidence: 'CEO',
    role: 'CEO',
  },
);

// Screenshot de logo ignorado
assert.equal(
  resolveSpeakerCompany({
    roleLabel: 'CEO',
    companyLogoUrl: 'https://example.com/Captura de tela 2025-07-22.png',
  }).confidence,
  'nenhuma',
);

// LinkedIn company URL
assert.deepEqual(
  plain(
    resolveSpeakerCompany({
      roleLabel: 'CEO',
      role: 'CEO',
      linkedinUrl: 'https://www.linkedin.com/company/microsoft/',
    }),
  ),
  {
    company: 'Microsoft',
    role: 'CEO',
    confidence: 'pesquisa',
    source: 'linkedin_url',
    evidence: 'https://www.linkedin.com/company/microsoft/',
  },
);

// Pesquisa externa confirmada
assert.deepEqual(
  plain(
    resolveSpeakerCompany({
      roleLabel: 'CEO',
      researchedCompany: 'Empresa Confirmada',
      researchedRole: 'CEO',
    }),
  ),
  {
    company: 'Empresa Confirmada',
    role: 'CEO',
    confidence: 'pesquisa',
    source: 'web_search',
    evidence: 'Empresa Confirmada',
  },
);

assert.equal(isPersistableCompanyConfidence('alta'), true);
assert.equal(isPersistableCompanyConfidence('nenhuma'), false);
assert.equal(logoHint('https://cdn/a/b/heineken.svg'), 'heineken');

console.log('speaker-company.test.mjs: all assertions passed');
