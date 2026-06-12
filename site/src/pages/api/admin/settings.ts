export const prerender = false;

import type { APIRoute } from 'astro';
import { adminRedirect, canManageSettings, getAdminSession } from '../../../lib/admin/auth';
import { updateSettingsFromForm } from '../../../lib/admin/settings';

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = await getAdminSession({ cookies });
  if (!session) return adminRedirect('/admin/login/?next=/admin/settings/');

  if (!canManageSettings(session)) {
    return adminRedirect('/admin/settings/?error=forbidden');
  }

  try {
    const data = await request.formData();
    await updateSettingsFromForm(data, session);
    return adminRedirect('/admin/settings/?saved=1');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível salvar settings.';
    return adminRedirect(`/admin/settings/?error=${encodeURIComponent(message)}`);
  }
};
