import { normalizeSpeakerText } from './speaker-company';
import memberPhotoOverrides from '../data/member-photo-overrides.json';

const unusablePhotoPattern =
  /(?:logo|logotipo|marca|brand|captura de tela|screenshot|placeholder|default|avatar-default|textura|texture|pattern|banner|cover|favicon|icon|sprite|emoji|silhueta)/i;

export interface MemberPhotoInput {
  name: string;
  sourceId?: string;
  photo?: string | null;
  companyLogo?: string | null;
  linkedin?: string | null;
}

export interface SpeakerPhotoLookup {
  name: string;
  photo?: string | null;
}

type OverrideMap = Record<string, string>;

const overrides = memberPhotoOverrides as OverrideMap;

function scanPhotoUrl(url: string): string {
  let decoded = url;

  try {
    decoded = decodeURIComponent(url);
  } catch {
    decoded = url;
  }

  try {
    const pathname = new URL(url).pathname;
    decoded = `${decoded} ${decodeURIComponent(pathname)}`;
  } catch {
    // ignore
  }

  return decoded.toLowerCase();
}

export function normalizePersonNameKey(name: string): string {
  return normalizeSpeakerText(name);
}

export function isUsableMemberPhotoUrl(
  photo?: string | null,
  companyLogo?: string | null,
): boolean {
  const url = String(photo ?? '').trim();
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false;
  if (unusablePhotoPattern.test(scanPhotoUrl(url))) return false;

  const logo = String(companyLogo ?? '').trim();
  if (logo && url === logo) return false;

  try {
    const photoPath = new URL(url).pathname.toLowerCase();
    if (unusablePhotoPattern.test(scanPhotoUrl(photoPath))) return false;
    if (logo) {
      const logoPath = new URL(logo).pathname.toLowerCase();
      if (photoPath === logoPath) return false;
    }
  } catch {
    return false;
  }

  return true;
}

function rankMemberPhotoUrl(url: string): number {
  let score = 0;
  const scanned = scanPhotoUrl(url);

  if (url.includes('supabase.co/storage')) score += 30;
  if (/\.(jpg|jpeg|webp)(\?|$)/i.test(url)) score += 12;
  if (/\.png(\?|$)/i.test(url)) score += 6;
  if (url.includes('cdn.bubble.io')) score -= 8;
  if (scanned.includes('perfil') || scanned.includes('profile') || scanned.includes('avatar')) score += 4;
  if (scanned.includes('captura') || scanned.includes('screenshot')) score -= 40;

  return score;
}

function pickBestPhoto(candidates: Array<string | null | undefined>, companyLogo?: string | null): string | undefined {
  const ranked = candidates
    .map((candidate) => String(candidate ?? '').trim())
    .filter((candidate) => isUsableMemberPhotoUrl(candidate, companyLogo))
    .sort((a, b) => rankMemberPhotoUrl(b) - rankMemberPhotoUrl(a));

  return ranked[0];
}

function lookupOverride(input: MemberPhotoInput): string | undefined {
  const nameKey = normalizePersonNameKey(input.name);
  const byName = overrides[nameKey];
  if (byName && isUsableMemberPhotoUrl(byName)) return byName;

  const bySource = input.sourceId ? overrides[input.sourceId] : undefined;
  if (bySource && isUsableMemberPhotoUrl(bySource)) return bySource;

  return undefined;
}

function lookupSpeakerPhoto(
  input: MemberPhotoInput,
  speakers: SpeakerPhotoLookup[],
): string | undefined {
  const nameKey = normalizePersonNameKey(input.name);
  const speaker = speakers.find((item) => normalizePersonNameKey(item.name) === nameKey);
  return speaker?.photo ?? undefined;
}

/** Resolve a melhor foto disponível sem inventar URL genérica. */
export function resolveMemberPhoto(
  input: MemberPhotoInput,
  speakers: SpeakerPhotoLookup[] = [],
): string | undefined {
  const override = lookupOverride(input);
  const speakerPhoto = lookupSpeakerPhoto(input, speakers);

  return pickBestPhoto(
    [override, input.photo, speakerPhoto],
    input.companyLogo,
  );
}

export function buildSpeakerPhotoLookup(
  speakers: Array<{ name: string; photo?: string | null }>,
): SpeakerPhotoLookup[] {
  return speakers.map((speaker) => ({
    name: speaker.name,
    photo: speaker.photo,
  }));
}

export function normalizeLinkedInUrl(value?: string | null): string | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://www.linkedin.com/in/${raw.replace(/^\/+/, '')}`;
}
