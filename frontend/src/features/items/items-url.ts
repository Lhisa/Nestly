import type { EffectiveFilters } from './items-api';

/** Display only: never corrects the URL or substitutes backend validation. */
export function provisionalItemFilters(search: string): EffectiveFilters {
  const query = new URLSearchParams(search);
  const read = (key: string): number | null => {
    const values = query.getAll(key);
    if (!values.length || values.some((value) => value !== values[0])) return null;
    const raw = values[0];
    const id = Number(raw);
    return /^[0-9]+$/.test(raw) && Number.isInteger(id) && id >= 1 && id <= 2147483647 ? id : null;
  };
  return { categoria_id: read('categoria_id'), subcategoria_id: read('subcategoria_id') };
}

export function itemFilterQuery(search: string): string {
  const query = new URLSearchParams(search);
  const filters = new URLSearchParams();
  for (const [key, value] of query) {
    if (key === 'categoria_id' || key === 'subcategoria_id') filters.append(key, value);
  }
  return filters.toString();
}

export function canonicalItemsSearch(search: string, filters: EffectiveFilters): string {
  const query = new URLSearchParams(search);
  for (const key of ['categoria_id', 'subcategoria_id'] as const) {
    query.delete(key);
    if (filters[key] !== null) query.set(key, String(filters[key]));
  }
  const value = query.toString();
  return value ? `?${value}` : '';
}
