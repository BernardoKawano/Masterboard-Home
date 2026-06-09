import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const envPath = path.join(projectRoot, '.env');

const BASE_URLS = [
  {
    label: 'producao',
    url: 'https://app.masterboard.com.br/api/1.1/obj',
  },
  {
    label: 'test',
    url: 'https://app.masterboard.com.br/version-test/api/1.1/obj',
  },
];

const ENDPOINTS = [
  'Conteudo',
  'Galeria',
  'Galeria - Downloads',
  'Foto',
  'Chat',
  'ADM_Status',
  'ADM_Qualificacao',
];

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const equalsIndex = trimmed.indexOf('=');
  if (equalsIndex === -1) return null;

  const key = trimmed.slice(0, equalsIndex).trim();
  let value = trimmed.slice(equalsIndex + 1).trim();

  const isQuoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));

  if (isQuoted) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

async function loadEnvFile() {
  const env = { ...process.env };
  const source = await readFile(envPath, 'utf8');

  for (const line of source.split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) continue;

    const [key, value] = entry;
    env[key] ??= value;
  }

  return env;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '');
}

function getRecordCount(responsePayload) {
  const response = responsePayload?.response;
  if (!response) return 0;

  const count = Number(response.count ?? 0);
  const remaining = Number(response.remaining ?? 0);

  return count + remaining;
}

function getRecords(responsePayload) {
  const results = responsePayload?.response?.results;
  return Array.isArray(results) ? results : [];
}

async function inspectEndpoint(base, endpoint, env) {
  const token = env.BUBBLE_API_TOKEN || undefined;
  const url = new URL(`${normalizeBaseUrl(base.url)}/${endpoint}`);

  url.searchParams.set('limit', '1');
  url.searchParams.set('cursor', '0');

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    console.log(`${endpoint} (${base.label}): nao encontrado (${response.status})`);
    return;
  }

  const payload = await response.json();
  const records = getRecords(payload);
  const firstRecord = records[0];
  const fields = firstRecord ? Object.keys(firstRecord).sort() : [];

  console.log(`\n${endpoint}`);
  console.log(`URL com sucesso: ${url.origin}${url.pathname} (${base.label})`);
  console.log(`Registros retornados: ${getRecordCount(payload)}`);
  console.log('Campos do primeiro registro:');

  if (fields.length === 0) {
    console.log('(sem registros)');
    return;
  }

  for (const field of fields) {
    console.log(`- ${field}`);
  }
}

async function main() {
  const env = await loadEnvFile();

  for (const endpoint of ENDPOINTS) {
    for (const base of BASE_URLS) {
      await inspectEndpoint(base, endpoint, env);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
