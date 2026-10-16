import type { ItemPhotoProcessor, ItemPhotoStorage } from './item-photos.js';
import type { ClassificationCatalogReader } from './get-classification-catalog.js';
import { ItemValidationError, validateHomeItems } from '../domain/item.js';
import type { CreateHomeItemsInput, Item } from '../domain/item.js';

// El port representa una operació completa: totes les unitats o cap.
export interface HomeItemsRepository {
  createAtomically(input: CreateHomeItemsInput, photoReference?: string | null): Promise<Item[]>;
}

/** COMMIT sent but acknowledgement lost, or rollback failed: do not compensate files. */
export class ItemPersistenceUncertainError extends Error {
  constructor(cause: unknown) { super('Resultat de persistència incert.', { cause }); }
}

export interface CreationPhoto {
  bytes: Uint8Array;
  processor: ItemPhotoProcessor;
  storage: ItemPhotoStorage;
  reportIncident: (error: unknown) => void;
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
  photo?: CreationPhoto,
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
  if (!photo) return repository.createAtomically(validated);
  const normalized = await photo.processor.normalize(photo.bytes);
  let reference: string;
  try { reference = await photo.storage.save(normalized); }
  catch (writeError) {
    photo.reportIncident(writeError); // Partial files may have been kept conservatively.
    throw writeError;
  }
  try {
    return await repository.createAtomically(validated, reference);
  } catch (error) {
    if (error instanceof ItemPersistenceUncertainError) {
      photo.reportIncident(error);
    } else {
      try { await photo.storage.removeIfUnreferenced(reference); }
      catch (cleanupError) { photo.reportIncident(cleanupError); }
    }
    throw error;
  }
}
