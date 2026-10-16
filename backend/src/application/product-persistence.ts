import type { PreparationState } from '../domain/item.js';
import type { PhotoReplacementDecision, ProductSummary } from './product-contracts.js';

/** Ports preparats, sense connexió amb les rutes actives. */
export interface ProductUnit {
  id: number; producte_id: number; nom: string; subcategoria_id: number;
  estat_preparacio: PreparationState | null; foto_ref: string | null;
  data_entrada_casa: Date | null; data_creacio: Date;
}
export type PersistedProductSelection =
  | { mode: 'new'; nom: string; subcategoria_id: number; foto_ref: string | null }
  | { mode: 'existing'; producte_id: number };
/** Entrada interna validada; foto_ref només prové de l'emmagatzematge del servidor. */
export interface ProductBatchInput {
  product: PersistedProductSelection;
  quantitat: number; estat_preparacio: PreparationState;
  /** Només per a producte existent, referència generada pel servidor. */
  photoChange?: { reference: string; decision: PhotoReplacementDecision };
}
export interface ProductsRepository {
  createBatchAtomically(input: ProductBatchInput): Promise<ProductUnit[]>;
}
export interface ProductItemsReader {
  listHomeForProjection(): Promise<ProductUnit[]>;
  /** Inclou unitats vinculades a llistes, per a consumidors interns. */
  findById(id: number): Promise<ProductUnit | null>;
  findHomeById(id: number): Promise<ProductUnit | null>;
  listSelectableProducts(): Promise<ProductSummary[]>;
  findProductById(id: number): Promise<ProductSummary | null>;
}
export class ProductPersistenceUncertainError extends Error {
  constructor(cause: unknown) { super('Resultat de persistència de producte incert.', { cause }); }
}

export class ProductPhotoConflictError extends Error {
  constructor(public readonly code: 'PHOTO_CONFIRMATION_REQUIRED' | 'PHOTO_VERSION_CONFLICT', public readonly product: ProductSummary) {
    super('Cal revisar la decisió sobre la fotografia del producte.');
  }
}
