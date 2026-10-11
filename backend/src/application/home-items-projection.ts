import type { PreparationState } from '../domain/item.js';

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
