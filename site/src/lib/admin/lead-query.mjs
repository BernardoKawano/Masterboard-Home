/**
 * Filtros de leads compatíveis com o enum `lead_status` em produção.
 * Rascunhos são identificados por `notes.draft` (não por status=draft no banco).
 */

/** @param {import('@supabase/supabase-js').PostgrestFilterBuilder<any, any, any>} query */
export function filterDraftLeads(query) {
  return query.or('notes.ilike.%"draft":true%,name.eq.(em preenchimento)');
}

/** @param {import('@supabase/supabase-js').PostgrestFilterBuilder<any, any, any>} query */
export function excludeDraftLeads(query) {
  return query.not('notes', 'ilike', '%"draft":true%').neq('name', '(em preenchimento)');
}

/** @param {import('@supabase/supabase-js').PostgrestFilterBuilder<any, any, any>} query */
export function filterNewLeads(query) {
  return excludeDraftLeads(query.eq('status', 'new'));
}
