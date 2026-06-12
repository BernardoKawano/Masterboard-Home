interface ResponsiveImageOptions {
  widths?: number[];
  sizes?: string;
  quality?: number;
}

interface ResponsiveImageAttrs {
  src: string;
  srcset?: string;
  sizes?: string;
}

const DEFAULT_WIDTHS = [320, 640, 960, 1280];
const DEFAULT_QUALITY = 76;

function uniqueSortedWidths(widths: number[]): number[] {
  return [...new Set(widths)]
    .filter((width) => Number.isFinite(width) && width > 0)
    .sort((first, second) => first - second);
}

export function getSupabaseStorageImageUrl(src: string, width: number, quality = DEFAULT_QUALITY): string | null {
  let url: URL;

  try {
    url = new URL(src);
  } catch {
    return null;
  }

  if (!url.pathname.includes('/storage/v1/')) {
    return null;
  }

  if (url.pathname.includes('/storage/v1/object/public/')) {
    url.pathname = url.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  } else if (!url.pathname.includes('/storage/v1/render/image/')) {
    return null;
  }

  url.searchParams.set('width', String(width));
  url.searchParams.set('quality', String(quality));

  return url.toString();
}

export function getResponsiveImageAttrs(src: string, options: ResponsiveImageOptions = {}): ResponsiveImageAttrs {
  const widths = uniqueSortedWidths(options.widths ?? DEFAULT_WIDTHS);
  const srcset = widths
    .map((width) => {
      const transformedUrl = getSupabaseStorageImageUrl(src, width, options.quality ?? DEFAULT_QUALITY);
      return transformedUrl ? `${transformedUrl} ${width}w` : null;
    })
    .filter(Boolean)
    .join(', ');

  if (!srcset) {
    return { src };
  }

  return {
    src: getSupabaseStorageImageUrl(src, widths[Math.min(1, widths.length - 1)], options.quality ?? DEFAULT_QUALITY) ?? src,
    srcset,
    sizes: options.sizes ?? '100vw',
  };
}
