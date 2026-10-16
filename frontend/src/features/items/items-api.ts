export interface ItemResponse {
  id: number; nom: string; subcategoria_id: number;
  estat_preparacio: 'no_preparada' | 'preparada';
  foto_ref: string | null; data_entrada_casa: null; data_creacio: string;
}
export interface ItemInput {
  nom: string; categoria_id: number; subcategoria_id: number; quantitat: number;
  estat_preparacio: 'no_preparada' | 'preparada';
}
export class ItemsApiError extends Error {
  constructor(message: string, public readonly fieldErrors?: Record<string, string>) { super(message); }
}
export interface EffectiveFilters { categoria_id: number | null; subcategoria_id: number | null }
export interface ItemUnitSummary { id: number; name: string; preparation_status: ItemInput['estat_preparacio'] | null; created_at: string; foto_ref: string | null }
export interface ItemGroup {
  key: string; name: string;
  category: { id: number; name: string }; subcategory: { id: number; name: string };
  total_units: number; preparation_counts: { prepared: number; not_prepared: number; unspecified: number };
  units: ItemUnitSummary[];
}
export interface GroupedHomeItemsResponse {
  filters: EffectiveFilters;
  corrections: { parameter: string; reason: 'malformed' | 'not_found' | 'incompatible' | 'ambiguous' | 'duplicate' | 'unknown' | 'inferred'; action: 'removed' | 'deduplicated' | 'inferred' }[];
  inventory_count: number; matched_count: number; groups: ItemGroup[];
}
export async function fetchItems(signal?: AbortSignal, query = ''): Promise<GroupedHomeItemsResponse> {
  const response = await fetch(`/api/items${query ? `?${query}` : ''}`, { signal });
  if (!response.ok) throw new Error('No s’han pogut carregar els Items.');
  return response.json();
}
export type ItemDetailResponse = Omit<ItemResponse, 'estat_preparacio'> & { estat_preparacio: ItemUnitSummary['preparation_status'] };
export async function fetchItem(id: string, signal?: AbortSignal): Promise<ItemDetailResponse | null> {
  const response = await fetch(`/api/items/${encodeURIComponent(id)}`, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('No s’ha pogut carregar l’Item.');
  return (await response.json()).item;
}
export async function createItems(input: ItemInput, photo?: File | null): Promise<{ created_count: number; items: ItemResponse[] }> {
  let request: RequestInit;
  if (photo) {
    const body = new FormData();
    body.append('data', JSON.stringify(input));
    body.append('photo', photo);
    request = { method: 'POST', body };
  } else request = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) };
  const response = await fetch('/api/items', request);
  if (response.status === 201) return response.json();
  const error = await response.json().catch(() => null);
  if (response.status === 413) throw new ItemsApiError('La fotografia supera el límit permès.', { photo: 'La fotografia ha de tenir com a màxim 10.000.000 bytes.' });
  if (response.status === 415) throw new ItemsApiError('Format de fotografia no admès.', { photo: 'Selecciona una fotografia JPEG, PNG o WebP.' });
  if (response.status === 503) throw new ItemsApiError('El servei de fotografies no està disponible. Conserva les dades i torna-ho a provar més tard.');
  if (response.status === 400 && error?.code === 'VALIDATION_ERROR') throw new ItemsApiError('Revisa els camps indicats.', error.fieldErrors);
  throw new ItemsApiError('No s’ha pogut confirmar el registre. Revisa el llistat abans de tornar-ho a intentar.');
}
