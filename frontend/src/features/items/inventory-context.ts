import type { EffectiveFilters } from './items-api';

export interface InventoryContext {
  search: string;
  hash: string;
  scrollY: number;
  groups: Record<string, { open: boolean; visible: number }>;
}
export interface CreationContext {
  ids: number[];
  count: number;
  previousSearch: string;
  filters: EffectiveFilters;
  filtersChanged: boolean;
}

// Transient only: a reload starts with no expansion, scroll or creation context.
const inventories = new Map<string, InventoryContext>();
const creations = new Map<string, CreationContext>();
const contextLimit = 30;
function store<T>(entries: Map<string, T>, context: T): string {
  const key = crypto.randomUUID();
  entries.set(key, structuredClone(context));
  if (entries.size > contextLimit) entries.delete(entries.keys().next().value!);
  return key;
}
export function saveInventoryContext(context: InventoryContext): string {
  const key = store(inventories, context);
  return key;
}
export function getInventoryContext(key: unknown): InventoryContext | undefined {
  return typeof key === 'string' ? inventories.get(key) : undefined;
}
export function saveCreationContext(context: CreationContext): string {
  const key = store(creations, context);
  return key;
}
export function getCreationContext(key: unknown): CreationContext | undefined {
  return typeof key === 'string' ? creations.get(key) : undefined;
}
