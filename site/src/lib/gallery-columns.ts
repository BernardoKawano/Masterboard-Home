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
  // garante que todas as colunas tenham praticamente o mesmo número de imagens
  const columns: string[][] = Array.from({ length: columnCount }, () => []);
  imagePaths.forEach((path, i) => {
    columns[i % columnCount].push(path);
  });

  // Duplica cada coluna para o scroll infinito (translateY -50% fica seamless)
  return columns.map((col) => [...col, ...col]);
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
