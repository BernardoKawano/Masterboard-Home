export const prerender = false;

import type { APIRoute } from 'astro';
import { adminRedirect, getAdminSession, getServiceSupabaseClient, recordAdminAudit } from '../../../lib/admin/auth';
import { buildPostRowFromForm, validatePostRow } from '../../../lib/admin/content-utils.mjs';

function redirectWithError(message: string): Response {
  return adminRedirect(`/admin/blog/?error=${encodeURIComponent(message)}`);
}

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = await getAdminSession({ cookies });
  if (!session) return adminRedirect('/admin/login/?next=/admin/blog/');

  const data = await request.formData();
  const action = String(data.get('_action') ?? 'create');
  const supabase = getServiceSupabaseClient();

  try {
    if (action === 'delete') {
      const id = String(data.get('id') ?? '');
      if (!id) return redirectWithError('Post inválido.');

      const { data: before, error: beforeError } = await supabase
        .from('content_posts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (beforeError) throw new Error(`[Supabase] ${beforeError.message}`);

      const { error } = await (supabase.from('content_posts') as any).delete().eq('id', id);
      if (error) throw new Error(`[Supabase] ${error.message}`);

      await recordAdminAudit({
        session,
        action: 'post.deleted',
        resource: 'content_posts',
        resourceId: id,
        before,
      });

      return adminRedirect('/admin/blog/');
    }

    const row = buildPostRowFromForm(data);
    const missing = validatePostRow(row);

    if (missing.length > 0) {
      return redirectWithError(`Campos obrigatórios ausentes: ${missing.join(', ')}`);
    }

    if (action === 'update') {
      const id = String(data.get('id') ?? '');
      if (!id) return redirectWithError('Post inválido.');

      const { data: before, error: beforeError } = await supabase
        .from('content_posts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (beforeError) throw new Error(`[Supabase] ${beforeError.message}`);

      const { data: after, error } = await (supabase.from('content_posts') as any)
        .update(row)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw new Error(`[Supabase] ${error.message}`);

      await recordAdminAudit({
        session,
        action: 'post.updated',
        resource: 'content_posts',
        resourceId: id,
        before,
        after,
      });

      return adminRedirect(`/admin/blog/${id}/`);
    }

    const { data: inserted, error } = await (supabase.from('content_posts') as any)
      .insert({ ...row, source_id: row.slug })
      .select('id')
      .single();

    if (error) throw new Error(`[Supabase] ${error.message}`);

    const insertedPost = inserted as { id: string };

    await recordAdminAudit({
      session,
      action: 'post.created',
      resource: 'content_posts',
      resourceId: insertedPost.id,
      after: row,
    });

    return adminRedirect(`/admin/blog/${insertedPost.id}/`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível salvar o post.';
    return redirectWithError(message);
  }
};
