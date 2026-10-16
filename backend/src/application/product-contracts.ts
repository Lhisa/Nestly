/** Contractes futurs: cap ruta ni servei actual els consumeix. */
import type { PreparationState } from '../domain/item.js';

export interface ProductSummary {
  id: number; nom: string;
  category: { id: number; nom: string };
  subcategory: { id: number; nom: string };
  foto_ref: string | null; foto_versio: number;
}
export interface ProductCatalogResponse { products: ProductSummary[] }
export interface NewProductSelection {
  mode: 'new'; nom: string; categoria_id: number; subcategoria_id: number;
}
export interface ExistingProductSelection { mode: 'existing'; producte_id: number }
export type ProductSelection = NewProductSelection | ExistingProductSelection;
interface CreationUnits { quantitat: number; estat_preparacio: PreparationState }
export interface PhotoReplacementDecision {
  /** Enter PostgreSQL INTEGER de 0 a 2147483647; comprovat en execució. */
  expected_version: number;
  /** true explícit obligatori si ja hi ha fotografia; sense coerció. */
  replace_confirmed: boolean;
}
export type CreationWithoutPhoto = CreationUnits & {
  product: ProductSelection; photo_decision?: never;
};
export type NewProductWithPhoto = CreationUnits & {
  product: NewProductSelection; photo_decision?: never;
};
export type ExistingProductWithPhoto = CreationUnits & {
  product: ExistingProductSelection; photo_decision: PhotoReplacementDecision;
};
/** Envolupant intern: transport prové de Content-Type, no d’un camp del client.
 * data és el payload JSON o el camp data de multipart. */
export type ProductItemsCreationRequest =
  | { transport: 'json'; data: CreationWithoutPhoto }
  | { transport: 'multipart'; data: NewProductWithPhoto; photo: Uint8Array }
  | { transport: 'multipart'; data: ExistingProductWithPhoto; photo: Uint8Array };

export interface CurrentProductPhoto { foto_ref: string | null; foto_versio: number }
/** Validació pura del contracte foto tipat; no parseja JSON ni està connectada a HTTP.
 * El futur parser HTTP haurà de rebutjar camps desconeguts, inclòs foto_ref. */
export function validateProductPhotoContract(request: ProductItemsCreationRequest, current?: CurrentProductPhoto): string[] {
  const decision = request.data.photo_decision;
  if (request.transport === 'json' || request.data.product.mode === 'new') {
    return decision === undefined ? [] : ['Decisió de fotografia no admesa per a aquesta combinació.'];
  }
  if (!decision || !Number.isInteger(decision.expected_version) || decision.expected_version < 0 || decision.expected_version > 2147483647) {
    return ['Cal una versió de fotografia entera no negativa dins del rang INTEGER.'];
  }
  if (typeof decision.replace_confirmed !== 'boolean') return ['Cal una confirmació booleana explícita.'];
  if (!current || !Number.isInteger(current.foto_versio) || current.foto_versio < 0 || current.foto_versio > 2147483647) return ['Cal l’estat actual del producte.'];
  if (decision.expected_version !== current.foto_versio) return ['PHOTO_VERSION_CONFLICT'];
  if (current.foto_ref !== null && decision.replace_confirmed !== true) return ['PHOTO_CONFIRMATION_REQUIRED'];
  return [];
}
export interface ProductPhotoConflictResponse {
  code: 'PHOTO_CONFIRMATION_REQUIRED' | 'PHOTO_VERSION_CONFLICT'; product: ProductSummary;
}
export interface ProductItemResponse {
  id: number; producte_id: number; nom: string; subcategoria_id: number;
  estat_preparacio: PreparationState | null;
  foto_ref: string | null; data_entrada_casa: string | null; data_creacio: string;
}
export interface ProductItemsCreationResponse { created_count: number; items: ProductItemResponse[] }
