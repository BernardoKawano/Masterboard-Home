import { createServiceSupabaseClient } from './env.mjs';
import { loadTsModuleFromPath } from './load-ts-bundle.mjs';

const { resolveSpeakerCompany } = loadTsModuleFromPath('../src/lib/speaker-company.ts');
const { buildSpeakerPresentation } = loadTsModuleFromPath('../src/lib/speaker-bio.ts');

const shouldApply = process.argv.includes('--apply');
const force = process.argv.includes('--force');

async function main() {
  const supabase = await createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('speakers')
    .select('id,slug,name,role_label,role,company,bio,company_logo_url,linkedin_url,topics,is_published')
    .eq('is_published', true)
    .order('name', { ascending: true });

  if (error) throw error;

  const updates = [];

  for (const speaker of data ?? []) {
    const existingBio = String(speaker.bio ?? '').trim();
    if (existingBio && !force) continue;

    const resolution = resolveSpeakerCompany({
      company: speaker.company,
      role: speaker.role,
      roleLabel: speaker.role_label,
      companyLogoUrl: speaker.company_logo_url,
      linkedinUrl: speaker.linkedin_url,
    });

    const bio = buildSpeakerPresentation(
      {
        name: speaker.name,
        role: speaker.role,
        roleLabel: speaker.role_label,
        topics: speaker.topics,
      },
      resolution,
    );

    if (existingBio === bio) continue;

    updates.push({
      id: speaker.id,
      slug: speaker.slug,
      name: speaker.name,
      company: resolution.company ?? '',
      bio,
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: shouldApply ? 'apply' : 'dry-run',
        candidates: updates.length,
        previews: updates.slice(0, 5),
      },
      null,
      2,
    ),
  );

  if (!shouldApply) {
    console.log('\nDry-run. Use --apply para gravar bios no Supabase.');
    return;
  }

  let applied = 0;
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('speakers')
      .update({
        bio: update.bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', update.id);

    if (updateError) throw updateError;
    applied += 1;
  }

  console.log(`\nBios aplicadas: ${applied} speaker(s).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
