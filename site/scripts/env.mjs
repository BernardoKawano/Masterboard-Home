import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(scriptDir, '..');
export const envPath = path.join(projectRoot, '.env');

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const equalsIndex = trimmed.indexOf('=');
  if (equalsIndex === -1) return null;

  const key = trimmed.slice(0, equalsIndex).trim();
  let value = trimmed.slice(equalsIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

export async function loadEnvFile() {
  const env = { ...process.env };

  try {
    const source = await readFile(envPath, 'utf8');
    for (const line of source.split(/\r?\n/)) {
      const entry = parseEnvLine(line);
      if (!entry) continue;
      const [key, value] = entry;
      env[key] ??= value;
    }
  } catch {
    // .env opcional em CI
  }

  return env;
}

export async function createServiceSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  const env = await loadEnvFile();
  const supabaseUrl = env.SUPABASE_URL?.replace(/\/+$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'xxxx') {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente no .env.');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}
