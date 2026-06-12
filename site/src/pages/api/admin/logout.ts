export const prerender = false;

import type { APIRoute } from 'astro';
import { ADMIN_SESSION_COOKIE, adminRedirect } from '../../../lib/admin/auth';

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
  return adminRedirect('/admin/login/');
};
