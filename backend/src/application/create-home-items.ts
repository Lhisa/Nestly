import type { ClassificationCatalogReader } from './get-classification-catalog.js';
import { ItemValidationError, validateHomeItems } from '../domain/item.js';
import type { CreateHomeItemsInput, Item } from '../domain/item.js';

// El port representa una operació completa: totes les unitats o cap.
export interface HomeItemsRepository {
  createAtomically(input: CreateHomeItemsInput): Promise<Item[]>;
}

export class ClassificationNotFoundError extends Error {
  constructor(public readonly field: 'categoria_id' | 'subcategoria_id') {
    super('La classificació seleccionada no existeix.');
    this.name = 'ClassificationNotFoundError';
  }
}

export async function createHomeItems(
  input: CreateHomeItemsInput,
  catalog: ClassificationCatalogReader,
  repository: HomeItemsRepository,
): Promise<Item[]> {
  const validated = validateHomeItems(input);
  const categories = await catalog.read();
  const category = categories.find((entry) => entry.id === validated.categoria_id);
  if (!category) throw new ClassificationNotFoundError('categoria_id');
  const exists = categories.some((entry) => entry.subcategories.some((sub) => sub.id === validated.subcategoria_id));
  if (!exists) throw new ClassificationNotFoundError('subcategoria_id');
  if (!category.subcategories.some((entry) => entry.id === validated.subcategoria_id)) {
    throw new ItemValidationError({ subcategoria_id: 'La Subcategoria no pertany a la Categoria seleccionada.' });
  }
  return repository.createAtomically(validated);
}
