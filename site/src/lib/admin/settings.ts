import { getServiceSupabaseClient, recordAdminAudit, type AdminSession } from './auth';
import {
  buildSettingsRowsFromForm,
  cssVariablesFromSettings,
  defaultSettingsObject,
  settingsRowsForAdmin,
  settingsRowsToObject,
} from './settings-utils.mjs';

interface SettingRow {
  key: string;
  value: string;
  label?: string | null;
  description?: string | null;
  type?: string | null;
  is_public?: boolean | null;
  updated_by?: string | null;
  updated_at?: string | null;
}

export interface SiteSettings {
  brand: {
    primaryColor: string;
    primaryHoverColor: string;
  };
  home: {
    hero: {
      eyebrow: string;
      pill: string;
      line1: string;
      line2: string;
      highlight: string;
      line3: string;
      description: string;
      primaryCtaLabel: string;
      primaryCtaHref: string;
      secondaryCtaLabel: string;
      secondaryCtaHref: string;
    };
  };
}

export async function getPublicSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await getServiceSupabaseClient()
      .from('site_settings')
      .select('key, value')
      .eq('is_public', true);

    if (error) {
      if (error.code !== '42P01') console.warn('[Site Settings] Falha ao buscar settings:', error.message);
      return defaultSettingsObject() as SiteSettings;
    }

    return settingsRowsToObject((data ?? []) as SettingRow[]) as SiteSettings;
  } catch (error) {
    console.warn('[Site Settings] Usando defaults:', error);
    return defaultSettingsObject() as SiteSettings;
  }
}

export async function listAdminSettings() {
  try {
    const { data, error } = await getServiceSupabaseClient()
      .from('site_settings')
      .select('key, value, label, description, type, updated_by, updated_at')
      .order('key', { ascending: true });

    if (error) {
      if (error.code !== '42P01') console.warn('[Site Settings] Falha ao listar settings:', error.message);
      return settingsRowsForAdmin([]);
    }

    return settingsRowsForAdmin((data ?? []) as SettingRow[]);
  } catch (error) {
    console.warn('[Site Settings] Usando settings admin default:', error);
    return settingsRowsForAdmin([]);
  }
}

export async function updateSettingsFromForm(data: FormData, session: AdminSession): Promise<void> {
  const before = await listAdminSettings();
  const rows = buildSettingsRowsFromForm(data, session.email);

  const { error } = await (getServiceSupabaseClient().from('site_settings') as any)
    .upsert(rows, { onConflict: 'key' });

  if (error) {
    throw new Error(`[Supabase] ${error.message}`);
  }

  await recordAdminAudit({
    session,
    action: 'settings.updated',
    resource: 'site_settings',
    before,
    after: rows,
  });
}

export function siteSettingsCss(settings: SiteSettings): string {
  return cssVariablesFromSettings(settings);
}
