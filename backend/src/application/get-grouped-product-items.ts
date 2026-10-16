import type { ClassificationCatalogReader } from './get-classification-catalog.js';
import type { ProductItemsReader, ProductUnit } from './product-persistence.js';
import { resolveHomeItemsFilters } from './home-items-filters.js';
import type { ResolvedHomeItemsFilters } from './home-items-filters.js';
import { capitalizeHomeItemName, countHomeItemPreparation } from './home-items-projection.js';
import type { GroupedHomeItemsResponse, ItemGroup } from './home-items-projection.js';
import type { Category } from '../domain/classification.js';

export interface ProductItemGroup extends ItemGroup { producte_id: number }
export interface GroupedProductItemsResponse extends GroupedHomeItemsResponse { groups: ProductItemGroup[] }

/** Projecció futura: la identitat explícita reemplaça l'equivalència textual. */
export function projectGroupedProductItems(items: readonly ProductUnit[], catalog: readonly Category[], resolved: ResolvedHomeItemsFilters): GroupedProductItemsResponse {
  const classifications = new Map(catalog.flatMap(c => c.subcategories.map(s => [s.id, { category: { id: c.id, name: c.nom }, subcategory: { id: s.id, name: s.nom } }] as const)));
  const grouped = new Map<number, { group: ProductItemGroup; latest: number; maxId: number }>();
  const sorted = [...items].sort((a,b) => b.data_creacio.getTime()-a.data_creacio.getTime() || b.id-a.id);
  let matched = 0;
  for (const item of sorted) {
    const classification = classifications.get(item.subcategoria_id);
    if (!classification) throw Error(`Classificació absent per a Item ${item.id}`);
    if (resolved.filters.categoria_id !== null && resolved.filters.categoria_id !== classification.category.id) continue;
    if (resolved.filters.subcategoria_id !== null && resolved.filters.subcategoria_id !== item.subcategoria_id) continue;
    matched++;
    let entry = grouped.get(item.producte_id);
    if (!entry) {
      entry = { latest: item.data_creacio.getTime(), maxId: item.id, group: {
        key: `home-products:v1:${item.producte_id}`, producte_id: item.producte_id,
        name: capitalizeHomeItemName(item.nom), ...classification, total_units: 0,
        preparation_counts: countHomeItemPreparation([]), units: [],
      } };
      grouped.set(item.producte_id, entry);
    }
    entry.maxId = Math.max(entry.maxId,item.id);
    entry.group.units.push({ id: item.id, name: item.nom, preparation_status: item.estat_preparacio, foto_ref: item.foto_ref, created_at: item.data_creacio.toISOString() });
  }
  const groups = [...grouped.values()].sort((a,b) => b.latest-a.latest || b.maxId-a.maxId).map(({group}) => {
    group.total_units=group.units.length;
    group.preparation_counts=countHomeItemPreparation(group.units.map(u=>u.preparation_status));
    return group;
  });
  return { filters: {...resolved.filters}, corrections: resolved.corrections.map(c=>({...c})), inventory_count: items.length, matched_count: matched, groups };
}

export async function getGroupedProductItems(entries: Iterable<readonly [string,string]>, reader: ProductItemsReader, catalogReader: ClassificationCatalogReader): Promise<GroupedProductItemsResponse> {
  const catalog=await catalogReader.read();
  return projectGroupedProductItems(await reader.listHomeForProjection(),catalog,resolveHomeItemsFilters(entries,catalog));
}
