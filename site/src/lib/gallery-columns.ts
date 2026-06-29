/**
 * Distribui imagens em colunas verticais e duplica cada coluna
 * para permitir scroll infinito contínuo via CSS translateY(-50%).
 */
export function buildGalleryColumns(
  imagePaths: readonly string[],
  columnCount = 5,
): string[][] {
  if (columnCount < 1) {
    throw new RangeError('columnCount must be at least 1');
  }

  if (imagePaths.length === 0) {
    return Array.from({ length: columnCount }, () => []);
  }

  // Round-robin: distribui as imagens alternando entre colunas
  const columns: string[][] = Array.from({ length: columnCount }, () => []);
  imagePaths.forEach((path, i) => {
    columns[i % columnCount].push(path);
  });

  // Garante mínimo de imagens por coluna repetindo o ciclo
  // (evita tracks curtos que deixam "buracos" visíveis na janela 3D)
  const MIN_PER_COLUMN = 10;
  return columns.map((col) => {
    const padded = col.length >= MIN_PER_COLUMN
      ? col
      : Array.from({ length: MIN_PER_COLUMN }, (_, i) => col[i % col.length]);
    // Duplica para scroll infinito seamless (translateY -50%)
    return [...padded, ...padded];
  });
}

export function buildGalleryImagePaths(
  count: number,
  basePath = '/gallery',
  extension = '.jpg',
): string[] {
  return Array.from({ length: count }, (_, index) => {
    const filename = String(index + 1).padStart(2, '0');
    return `${basePath}/${filename}${extension}`;
  });
}
