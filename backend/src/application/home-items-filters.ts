import type { Category } from '../domain/classification.js';
import type { EffectiveFilters, FilterCorrection } from './home-items-projection.js';

export interface ResolvedHomeItemsFilters {
  filters: EffectiveFilters;
  corrections: FilterCorrection[];
}

/** Textual query entries, preserving repeated parameters (e.g. URLSearchParams entries). */
export function resolveHomeItemsFilters(
  entries: Iterable<readonly [string, string]>,
  catalog: readonly Category[],
): ResolvedHomeItemsFilters {
  const values = new Map<string, string[]>();
  for (const [parameter, value] of entries) {
    const existing = values.get(parameter);
    if (existing) existing.push(value);
    else values.set(parameter, [value]);
  }
  const corrections: FilterCorrection[] = [];
  const remove = (parameter: string, reason: FilterCorrection['reason']) => {
    corrections.push({ parameter, reason, action: 'removed' });
  };
  const parse = (parameter: string): number | null => {
    const repeated = values.get(parameter);
    if (!repeated) return null;
    const raw = repeated[0];
    if (repeated.some((value) => value !== raw)) {
      remove(parameter, 'ambiguous');
      return null;
    }
    if (repeated.length > 1) corrections.push({ parameter, reason: 'duplicate', action: 'deduplicated' });
    const id = Number(raw);
    if (!/^[0-9]+$/.test(raw) || !Number.isInteger(id) || id < 1 || id > 2147483647) {
      remove(parameter, 'malformed');
      return null;
    }
    return id;
  };

  // Fixed dimension order, then compatibility/inference, then sorted unknown names.
  let categoryId = parse('categoria_id');
  if (categoryId !== null && !catalog.some((category) => category.id === categoryId)) {
    remove('categoria_id', 'not_found');
    categoryId = null;
  }
  let subcategoryId = parse('subcategoria_id');
  const parent = subcategoryId === null ? undefined : catalog.find(
    (category) => category.subcategories.some((subcategory) => subcategory.id === subcategoryId),
  );
  if (subcategoryId !== null && !parent) {
    remove('subcategoria_id', 'not_found');
    subcategoryId = null;
  }
  if (parent && subcategoryId !== null) {
    if (categoryId === null) {
      categoryId = parent.id;
      corrections.push({ parameter: 'categoria_id', reason: 'inferred', action: 'inferred' });
    } else if (categoryId !== parent.id) {
      remove('subcategoria_id', 'incompatible');
      subcategoryId = null;
    }
  }
  for (const parameter of [...values.keys()].sort()) {
    if (parameter !== 'categoria_id' && parameter !== 'subcategoria_id') remove(parameter, 'unknown');
  }
  return { filters: { categoria_id: categoryId, subcategoria_id: subcategoryId }, corrections };
}
