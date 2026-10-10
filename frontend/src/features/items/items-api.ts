export interface ItemResponse {
  id: number; nom: string; subcategoria_id: number;
  estat_preparacio: 'no_preparada' | 'preparada';
  foto_ref: null; data_entrada_casa: null; data_creacio: string;
}
export interface ItemInput {
  nom: string; categoria_id: number; subcategoria_id: number; quantitat: number;
  estat_preparacio: 'no_preparada' | 'preparada';
}
export class ItemsApiError extends Error {
  constructor(message: string, public readonly fieldErrors?: Record<string, string>) { super(message); }
}
export async function fetchItems(signal?: AbortSignal): Promise<ItemResponse[]> {
  const response = await fetch('/api/items', { signal });
  if (!response.ok) throw new Error('No s’han pogut carregar els Items.');
  return (await response.json()).items;
}
export async function createItems(input: ItemInput): Promise<{ created_count: number; items: ItemResponse[] }> {
  const response = await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (response.status === 201) return response.json();
  const error = await response.json().catch(() => null);
  if (response.status === 400 && error?.code === 'VALIDATION_ERROR') throw new ItemsApiError('Revisa els camps indicats.', error.fieldErrors);
  throw new ItemsApiError('No s’ha pogut confirmar el registre. Revisa el llistat abans de tornar-ho a intentar.');
}
