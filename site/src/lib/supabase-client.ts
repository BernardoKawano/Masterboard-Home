import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import ws from 'ws';

type SupabaseClient = ReturnType<typeof createClient>;

const defaultAuth = {
  persistSession: false,
  autoRefreshToken: false,
} as const;

export function normalizeEnvValue(value: string): string {
  return value.replace(/^\uFEFF/, '').trim();
}

export function createServerSupabaseClient(
  url: string,
  key: string,
  options: SupabaseClientOptions = {},
): SupabaseClient {
  return createClient(normalizeEnvValue(url), normalizeEnvValue(key), {
    ...options,
    auth: { ...defaultAuth, ...options.auth },
    realtime: { transport: ws, ...options.realtime },
  });
}
