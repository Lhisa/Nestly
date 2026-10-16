/** Eina pura de revisió: no llegeix DB, no aplica plans ni toca fitxers. */
import { normalizeHomeItemName } from './home-items-projection.js';

export interface LegacyProductItem {
  id: number;
  nom: string;
  subcategoria_id: number;
  foto_ref: string | null;
  linked_to_list: boolean;
}
export interface PlannedProduct {
  key: string;
  nom: string;
  subcategoria_id: number;
  foto_ref: string | null;
  item_ids: number[];
}
export interface MigrationOrigin { database: string; schema: string }
export interface ProductMigrationPlan {
  version: 1;
  origin: MigrationOrigin;
  source: LegacyProductItem[];
  products: PlannedProduct[];
}
export interface LegacyCandidate {
  item_ids: number[];
  photo_refs: string[];
  contains_null_photo: boolean;
  linked_item_ids: number[];
}
/** Uneix només per elaborar candidats informatius, mai per assignar identitat. */
export function inspectLegacyCandidates(items: readonly LegacyProductItem[]): LegacyCandidate[] {
  const groups = new Map<string, LegacyProductItem[]>();
  for (const item of items) {
    const key = JSON.stringify([item.subcategoria_id, normalizeHomeItemName(item.nom)]);
    const group = groups.get(key) ?? [];
    group.push(item); groups.set(key, group);
  }
  return [...groups.values()].map(group => ({
    item_ids: group.map(item => item.id),
    photo_refs: [...new Set(group.flatMap(item => item.foto_ref === null ? [] : [item.foto_ref]))],
    contains_null_photo: group.some(item => item.foto_ref === null),
    linked_item_ids: group.filter(item => item.linked_to_list).map(item => item.id),
  }));
}
export function prepareConservativeProductPlan(items: readonly LegacyProductItem[], origin: MigrationOrigin): ProductMigrationPlan {
  return {
    version: 1,
    origin: { ...origin },
    source: items.map(item => ({ ...item })),
    products: items.map(item => ({
      key: 'legacy-item-' + item.id, nom: item.nom,
      subcategoria_id: item.subcategoria_id, foto_ref: item.foto_ref,
      item_ids: [item.id],
    })),
  };
}
const photoPattern = /^items\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/;
function snapshot(items: readonly LegacyProductItem[]): string {
  return JSON.stringify([...items].sort((a,b) => a.id-b.id).map(i => [i.id,i.nom,i.subcategoria_id,i.foto_ref,i.linked_to_list]));
}
/** Valida un pla tipat i la seva vigència; no parseja JSON extern.
 * No equival a aprovació humana ni verifica l'existència física dels fitxers. */
export function validateProductMigrationPlan(plan: ProductMigrationPlan, current: readonly LegacyProductItem[], origin: MigrationOrigin): string[] {
  const errors: string[] = [];
  if (!plan.origin.database.trim() || !plan.origin.schema.trim() || plan.origin.database !== origin.database || plan.origin.schema !== origin.schema) errors.push('Origen del pla incorrecte.');
  if (new Set(plan.source.map(item => item.id)).size !== plan.source.length) errors.push('IDs duplicats al snapshot del pla.');
  if (plan.version !== 1) errors.push('Versió de pla no admesa.');
  if (snapshot(plan.source) !== snapshot(current)) errors.push('Snapshot obsolet: cal regenerar i revisar.');
  const ids = new Map(current.map(item => [item.id,item]));
  if (ids.size !== current.length) errors.push('IDs originals duplicats.');
  const assigned = new Set<number>(); const keys = new Set<string>();
  for (const product of plan.products) {
    if (!product.key.trim() || keys.has(product.key)) errors.push('Clau provisional buida o duplicada.');
    keys.add(product.key);
    if (/[\u0000\uD800-\uDFFF]/u.test(product.nom) || !product.nom.trim() || !/\p{L}/u.test(product.nom) || [...product.nom].length > 100) errors.push('Nom de producte invàlid.');
    if (!Number.isInteger(product.subcategoria_id) || product.subcategoria_id < 1 || product.subcategoria_id > 2147483647) errors.push('Subcategoria invàlida.');
    if (!product.item_ids.length) errors.push('Producte sense Items assignats.');
    if (product.foto_ref !== null && !photoPattern.test(product.foto_ref)) errors.push('Referència legacy invàlida: requereix revisió.');
    const originalRefs = new Set<string>();
    for (const id of product.item_ids) {
      const item = ids.get(id);
      if (!item) { errors.push('Item desconegut: ' + id); continue; }
      if (assigned.has(id)) errors.push('Item assignat més d’una vegada: ' + id);
      assigned.add(id);
      if (item.subcategoria_id !== product.subcategoria_id) errors.push('Classificació incompatible: ' + id);
      if (item.foto_ref !== null) originalRefs.add(item.foto_ref);
    }
    if (originalRefs.size && (product.foto_ref === null || !originalRefs.has(product.foto_ref))) errors.push('Cal seleccionar una fotografia original; no descartar-les silenciosament.');
    if (!originalRefs.size && product.foto_ref !== null) errors.push('El pla no pot introduir una fotografia aliena.');
  }
  if (assigned.size !== ids.size) errors.push('Hi ha Items sense assignar, inclosos els vinculats a llistes.');
  return errors;
}
