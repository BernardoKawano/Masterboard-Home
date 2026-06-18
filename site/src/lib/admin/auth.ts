import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '../supabase-client';

export const ADMIN_SESSION_COOKIE = 'mb_admin_session';

export type AdminRole = 'admin' | 'editor';

export interface AdminSession {
  userId: string;
  email: string;
  role: AdminRole;
  name?: string;
}

interface CookieValue {
  value: string;
}

interface CookieJar {
  get(name: string): CookieValue | undefined;
}

interface AdminContext {
  cookies: CookieJar;
}

interface AdminUserRow {
  auth_user_id: string;
  email: string;
  role: AdminRole;
  name: string | null;
  is_active: boolean;
}

let serviceClient: SupabaseClient | null = null;

function getRequiredEnv(name: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (!value) throw new Error(`${name} precisa estar definido no ambiente.`);
  return value.replace(/^\uFEFF/, '').trim();
}

function getAdminEmailAllowlist(): Set<string> {
  const raw = (import.meta.env.ADMIN_EMAILS as string | undefined) ?? '';
  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getServiceSupabaseClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  serviceClient = createServerSupabaseClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  );

  return serviceClient;
}

export function getAuthSupabaseClient(): SupabaseClient {
  return createServerSupabaseClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_ANON_KEY'),
  );
}

export function canManageSettings(session: AdminSession): boolean {
  return session.role === 'admin';
}

export function canManageLeads(session: AdminSession): boolean {
  return session.role === 'admin';
}

async function resolveAdminProfile(userId: string, email: string): Promise<AdminSession | null> {
  const normalizedEmail = email.toLowerCase();
  const allowlist = getAdminEmailAllowlist();

  try {
    const { data, error } = await getServiceSupabaseClient()
      .from('admin_users')
      .select('auth_user_id, email, role, name, is_active')
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      const row = data as AdminUserRow;
      return {
        userId,
        email: row.email || email,
        role: row.role,
        name: row.name ?? undefined,
      };
    }

    if (error && error.code !== '42P01') {
      console.warn('[Admin Auth] Falha ao consultar admin_users:', error.message);
    }
  } catch (error) {
    console.warn('[Admin Auth] Falha inesperada ao resolver perfil:', error);
  }

  if (allowlist.has(normalizedEmail)) {
    return { userId, email, role: 'admin' };
  }

  return null;
}

export async function signInAdmin(email: string, password: string): Promise<{ token: string; session: AdminSession }> {
  const { data, error } = await getAuthSupabaseClient().auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session?.access_token || !data.user.email) {
    throw new Error('E-mail ou senha inválidos.');
  }

  const session = await resolveAdminProfile(data.user.id, data.user.email);
  if (!session) {
    throw new Error('Usuário sem permissão de admin.');
  }

  return { token: data.session.access_token, session };
}

export async function getAdminSession(context: AdminContext): Promise<AdminSession | null> {
  const token = context.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { data, error } = await getAuthSupabaseClient().auth.getUser(token);
    const user = data.user;

    if (error || !user?.email) return null;
    return resolveAdminProfile(user.id, user.email);
  } catch (error) {
    console.warn('[Admin Auth] Sessão inválida:', error);
    return null;
  }
}

export function adminRedirect(path: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: path },
  });
}

export async function recordAdminAudit(input: {
  session: AdminSession;
  action: string;
  resource: string;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    const { error } = await (getServiceSupabaseClient().from('admin_audit_log') as any)
      .insert({
        actor_user_id: input.session.userId,
        actor_email: input.session.email,
        action: input.action,
        resource: input.resource,
        resource_id: input.resourceId ?? null,
        before_value: input.before ?? null,
        after_value: input.after ?? null,
      });

    if (error && error.code !== '42P01') {
      console.warn('[Admin Audit] Falha ao registrar auditoria:', error.message);
    }
  } catch (error) {
    console.warn('[Admin Audit] Falha inesperada:', error);
  }
}
