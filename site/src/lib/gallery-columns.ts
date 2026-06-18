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

  const imagesPerColumn = Math.ceil(imagePaths.length / columnCount);

  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const start = columnIndex * imagesPerColumn;
    const columnImages = imagePaths.slice(start, start + imagesPerColumn);
    return [...columnImages, ...columnImages];
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
