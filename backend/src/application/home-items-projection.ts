import type { PreparationState } from '../domain/item.js';
import type { Category } from '../domain/classification.js';
import type { ResolvedHomeItemsFilters } from './home-items-filters.js';

export type ReadPreparationState = PreparationState | null;

export interface EffectiveFilters {
  categoria_id: number | null;
  subcategoria_id: number | null;
}

export interface FilterCorrection {
  parameter: string;
  reason: 'malformed' | 'not_found' | 'incompatible' | 'ambiguous' | 'duplicate' | 'unknown' | 'inferred';
  action: 'removed' | 'deduplicated' | 'inferred';
}

export interface PreparationCounts {
  prepared: number;
  not_prepared: number;
  unspecified: number;
}

export interface ItemUnitSummary {
  id: number;
  name: string;
  preparation_status: ReadPreparationState;
  foto_ref: string | null;
  /** ISO 8601 UTC. */
  created_at: string;
}

export interface ClassificationSummary {
  id: number;
  name: string;
}

export interface ItemGroup {
  key: string;
  name: string;
  category: ClassificationSummary;
  subcategory: ClassificationSummary;
  total_units: number;
  preparation_counts: PreparationCounts;
  units: ItemUnitSummary[];
}

export interface GroupedHomeItemsResponse {
  filters: EffectiveFilters;
  corrections: FilterCorrection[];
  /** Individual home Items, excluding item_llista. */
  inventory_count: number;
  /** Sum of the returned groups' total_units. */
  matched_count: number;
  groups: ItemGroup[];
}

export function normalizeHomeItemName(name: string): string {
  return name.trim().normalize('NFC').toLowerCase().normalize('NFC');
}

/** Capitalizes only the first Unicode letter; preserves all other text. */
export function capitalizeHomeItemName(name: string): string {
  return name.replace(/\p{L}/u, (letter) => letter.toUpperCase());
}

/** Opaque to consumers: JSON encodes tuple boundaries without hashing collisions. */
export function homeItemGroupKey(subcategoryId: number, name: string): string {
  return `home-items:v1:${JSON.stringify([subcategoryId, normalizeHomeItemName(name)])}`;
}

export function countHomeItemPreparation(states: readonly ReadPreparationState[]): PreparationCounts {
  const counts: PreparationCounts = { prepared: 0, not_prepared: 0, unspecified: 0 };
  for (const state of states) {
    if (state === 'preparada') counts.prepared++;
    else if (state === 'no_preparada') counts.not_prepared++;
    else counts.unspecified++;
  }
  return counts;
}

/** Individual Items already restricted to the home inventory by the reader. */
export interface HomeItemProjectionInput {
  id: number;
  nom: string;
  subcategoria_id: number;
  estat_preparacio: ReadPreparationState;
  data_creacio: Date;
  foto_ref: string | null;
}

export function projectGroupedHomeItems(
  items: readonly HomeItemProjectionInput[],
  catalog: readonly Category[],
  resolved: ResolvedHomeItemsFilters,
): GroupedHomeItemsResponse {
  const classifications = new Map<number, { category: ClassificationSummary; subcategory: ClassificationSummary }>();
  for (const category of catalog) {
    for (const subcategory of category.subcategories) {
      classifications.set(subcategory.id, {
        category: { id: category.id, name: category.nom },
        subcategory: { id: subcategory.id, name: subcategory.nom },
      });
    }
  }
  const grouped = new Map<string, { group: ItemGroup; latest: number; maxId: number }>();
  let matchedCount = 0;
  // Sort a copy; Date timestamps, rather than ISO strings, determine chronology.
  const sorted = [...items].sort((a, b) => b.data_creacio.getTime() - a.data_creacio.getTime() || b.id - a.id);
  for (const item of sorted) {
    const classification = classifications.get(item.subcategoria_id);
    if (!classification) throw new Error(`Missing classification for home Item ${item.id}`);
    if (resolved.filters.categoria_id !== null && classification.category.id !== resolved.filters.categoria_id) continue;
    if (resolved.filters.subcategoria_id !== null && item.subcategoria_id !== resolved.filters.subcategoria_id) continue;
    matchedCount++;
    const key = homeItemGroupKey(item.subcategoria_id, item.nom);
    let entry = grouped.get(key);
    if (!entry) {
      entry = {
        latest: item.data_creacio.getTime(),
        maxId: item.id,
        group: {
          key,
          name: capitalizeHomeItemName(item.nom),
          category: { ...classification.category },
          subcategory: { ...classification.subcategory },
          total_units: 0,
          preparation_counts: countHomeItemPreparation([]),
          units: [],
        },
      };
      grouped.set(key, entry);
    }
    entry.maxId = Math.max(entry.maxId, item.id);
    entry.group.units.push({
      id: item.id,
      name: item.nom,
      preparation_status: item.estat_preparacio,
      foto_ref: item.foto_ref ?? null,
      created_at: item.data_creacio.toISOString(),
    });
  }
  const groups = [...grouped.values()].sort((a, b) => b.latest - a.latest || b.maxId - a.maxId).map(({ group }) => {
    group.total_units = group.units.length;
    group.preparation_counts = countHomeItemPreparation(group.units.map((unit) => unit.preparation_status));
    return group;
  });
  return {
    filters: { ...resolved.filters },
    corrections: resolved.corrections.map((correction) => ({ ...correction })),
    inventory_count: items.length,
    matched_count: matchedCount,
    groups,
  };
}
