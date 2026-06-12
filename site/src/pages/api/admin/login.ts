export const prerender = false;

import type { APIRoute } from 'astro';
import { ADMIN_SESSION_COOKIE, adminRedirect, signInAdmin } from '../../../lib/admin/auth';

export const POST: APIRoute = async ({ cookies, request }) => {
  const data = await request.formData();
  const email = String(data.get('email') ?? '').trim();
  const password = String(data.get('password') ?? '');
  const next = String(data.get('next') ?? '/admin/');

  try {
    const { token } = await signInAdmin(email, password);

    cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return adminRedirect(next.startsWith('/admin') ? next : '/admin/');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível entrar.';
    return adminRedirect(`/admin/login/?error=${encodeURIComponent(message)}`);
  }
};
