/**
 * Manifest estático das logos em public/logos.
 * Evita leitura de filesystem em runtime (quebra no serverless da Vercel).
 */
export const MEMBER_LOGO_FILES = [
  'apex.webp',
  'artesian.webp',
  'bom gourmet.webp',
  'driva.svg',
  'ford-barigui.webp',
  'hard-rock.webp',
  'kurytiba.webp',
  'roca.webp',
  'simplecon.webp',
  'viasoft.svg',
] as const;

const preferredLogoExtensions = ['.avif', '.webp', '.svg', '.png', '.jpg', '.jpeg'];

export function getLogoExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

export function getLogoBase(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

export function getLogoName(filename: string): string {
  return getLogoBase(filename)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export interface MemberLogo {
  name: string;
  extension: string;
  src: string;
}

export function listMemberLogos(): MemberLogo[] {
  const bestByBase = new Map<string, string>();

  for (const filename of MEMBER_LOGO_FILES) {
    const base = getLogoBase(filename);
    const current = bestByBase.get(base);
    const extension = getLogoExtension(filename);
    const currentExtension = current ? getLogoExtension(current) : undefined;

    if (
      !current ||
      preferredLogoExtensions.indexOf(extension) < preferredLogoExtensions.indexOf(currentExtension ?? '.jpeg')
    ) {
      bestByBase.set(base, filename);
    }
  }

  return Array.from(bestByBase.values())
    .sort((first, second) => getLogoName(first).localeCompare(getLogoName(second), 'pt-BR'))
    .map((filename) => ({
      name: getLogoName(filename),
      extension: getLogoExtension(filename).replace('.', ''),
      src: `/logos/${filename}`,
    }));
}
