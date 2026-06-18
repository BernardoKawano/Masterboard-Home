import { createServiceSupabaseClient } from './env.mjs';
import { loadTsModuleFromPath } from './load-ts-bundle.mjs';

const { resolveSpeakerCompany, isPersistableCompanyConfidence } = loadTsModuleFromPath(
  '../src/lib/speaker-company.ts',
);

const shouldApply = process.argv.includes('--apply');

async function main() {
  const supabase = await createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('speakers')
    .select('id,slug,name,role_label,role,company,company_logo_url,linkedin_url,is_published')
    .eq('is_published', true)
    .order('name', { ascending: true });

  if (error) throw error;

  const speakers = data ?? [];
  const updates = [];

  for (const speaker of speakers) {
    const resolution = resolveSpeakerCompany({
      company: speaker.company,
      role: speaker.role,
      roleLabel: speaker.role_label,
      companyLogoUrl: speaker.company_logo_url,
      linkedinUrl: speaker.linkedin_url,
    });

    if (!isPersistableCompanyConfidence(resolution.confidence) || !resolution.company) continue;
    if (String(speaker.company ?? '').trim() === resolution.company) continue;

    updates.push({
      id: speaker.id,
      slug: speaker.slug,
      name: speaker.name,
      company: resolution.company,
      role: resolution.role ?? speaker.role,
      confidence: resolution.confidence,
      source: resolution.source,
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: shouldApply ? 'apply' : 'dry-run',
        candidates: updates.length,
        updates,
      },
      null,
      2,
    ),
  );

  if (!shouldApply) {
    console.log('\nDry-run. Use --apply para gravar no Supabase.');
    return;
  }

  let applied = 0;
  for (const update of updates) {
    const payload = {
      company: update.company,
      ...(update.role ? { role: update.role } : {}),
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('speakers')
      .update(payload)
      .eq('id', update.id);

    if (updateError) throw updateError;
    applied += 1;
  }

  console.log(`\nAplicado: ${applied} speaker(s).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
