import type { Category } from '../domain/classification.js';

export interface ClassificationCatalogReader {
  read(): Promise<Category[]>;
}

export function getClassificationCatalog(reader: ClassificationCatalogReader): Promise<Category[]> {
  return reader.read();
}
