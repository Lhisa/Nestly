import type { Pool } from 'pg';
import { expect, test, vi } from 'vitest';
import { getGroupedHomeItems } from '../src/application/get-grouped-home-items.js';
import { projectGroupedHomeItems } from '../src/application/home-items-projection.js';
import type { HomeItemProjectionInput } from '../src/application/home-items-projection.js';
import { resolveHomeItemsFilters } from '../src/application/home-items-filters.js';
import { PostgresHomeItemsReader } from '../src/infrastructure/postgres-home-items-reader.js';

const catalog = [
  { id: 1, nom: 'Roba', subcategories: [{ id: 2, nom: 'Bodies' }, { id: 3, nom: 'Pitets' }] },
  { id: 4, nom: 'Descans', subcategories: [{ id: 5, nom: 'Mantes' }] },
];
const item = (id: number, nom: string, day = 2, subcategoria_id = 2, estat_preparacio: HomeItemProjectionInput['estat_preparacio'] = null): HomeItemProjectionInput => ({
  id, nom, subcategoria_id, estat_preparacio, foto_ref: null, data_creacio: new Date(`2026-10-0${day}T12:00:00Z`),
});
const project = (items: readonly HomeItemProjectionInput[], query = '') => projectGroupedHomeItems(items, catalog, resolveHomeItemsFilters(new URLSearchParams(query), catalog));

test('agrupa noms equivalents, preserva originals i compta estats nuls', () => {
  const result = project([item(1, ' COTO\u0301 ', 1, 2, 'preparada'), item(2, 'cotó', 2, 2, 'no_preparada'), item(3, 'COTÓ', 3)]);
  expect(result.inventory_count).toBe(3);
  expect(result.matched_count).toBe(3);
  expect(result.groups).toHaveLength(1);
  expect(result.groups[0]).toMatchObject({
    name: 'COTÓ', category: { id: 1, name: 'Roba' }, subcategory: { id: 2, name: 'Bodies' }, total_units: 3,
    preparation_counts: { prepared: 1, not_prepared: 1, unspecified: 1 },
  });
  expect(result.groups[0].units).toEqual([
    { id: 3, name: 'COTÓ', preparation_status: null, foto_ref: null, created_at: '2026-10-03T12:00:00.000Z' },
    { id: 2, name: 'cotó', preparation_status: 'no_preparada', foto_ref: null, created_at: '2026-10-02T12:00:00.000Z' },
    { id: 1, name: ' COTO\u0301 ', preparation_status: 'preparada', foto_ref: null, created_at: '2026-10-01T12:00:00.000Z' },
  ]);
});

test('separa subcategories, accents i espais interiors', () => {
  expect(project([item(1, 'cotó'), item(2, 'coto'), item(3, 'body blau'), item(4, 'body  blau'), item(5, 'cotó', 2, 3)]).groups).toHaveLength(5);
});

test('ordena unitats i deriva el nom de la més recent, amb empat per ID', () => {
  const result = project([item(90, '2 BODY', 1), item(1, '2 body'), item(3, '2 Body')]);
  expect(result.groups[0].units.map((unit) => unit.id)).toEqual([3, 1, 90]);
  expect(result.groups[0].name).toBe('2 Body');
});

test('ordena grups per màxim temporal i màxim ID independents', () => {
  const items = [item(100, 'a', 1), item(1, 'a', 2), item(50, 'b', 2), item(2, 'c', 3)];
  expect(project(items).groups.map((group) => group.name)).toEqual(['C', 'A', 'B']);
  expect(project([...items].reverse())).toEqual(project(items));
});

test.each([
  ['', 4], ['categoria_id=1', 3], ['subcategoria_id=3', 1],
  ['categoria_id=4&subcategoria_id=2', 1], ['categoria_id=x&subcategoria_id=2', 2],
])('aplica filtres efectius %s i manté inventari sense filtrar', (query, matched) => {
  const result = project([item(1, 'a'), item(2, 'a'), item(3, 'b', 2, 3), item(4, 'c', 2, 5)], query);
  expect(result.inventory_count).toBe(4);
  expect(result.matched_count).toBe(matched);
  expect(result.groups.reduce((total, group) => total + group.total_units, 0)).toBe(matched);
  for (const group of result.groups) {
    expect(Object.values(group.preparation_counts).reduce((sum, count) => sum + count, 0)).toBe(group.total_units);
  }
  expect(result.filters).toEqual(resolveHomeItemsFilters(new URLSearchParams(query), catalog).filters);
  expect(result.corrections).toEqual(resolveHomeItemsFilters(new URLSearchParams(query), catalog).corrections);
});

test('inventari buit i consulta sense resultats són diferents', () => {
  expect(project([])).toMatchObject({ inventory_count: 0, matched_count: 0, groups: [] });
  expect(project([item(1, 'a')], 'categoria_id=4')).toMatchObject({ inventory_count: 1, matched_count: 0, groups: [] });
  expect(projectGroupedHomeItems([], [], resolveHomeItemsFilters([], []))).toMatchObject({ inventory_count: 0, matched_count: 0, groups: [] });
});

test('no muta entrades ni comparteix objectes amb el resultat', () => {
  const items = [item(1, 'a'), item(2, 'A')];
  const resolved = resolveHomeItemsFilters(new URLSearchParams('subcategoria_id=2'), catalog);
  const before = structuredClone({ items, catalog, resolved });
  items.forEach(Object.freeze);
  Object.freeze(items);
  const result = projectGroupedHomeItems(items, catalog, resolved);
  result.filters.categoria_id = 99;
  result.corrections[0].parameter = 'changed';
  result.groups[0].category.name = 'changed';
  result.groups[0].units[0].name = 'changed';
  expect({ items, catalog, resolved }).toEqual(before);
});

test('classificació absent no produeix una resposta parcial silenciosa', () => {
  expect(() => project([item(1, 'a', 2, 99)])).toThrow('Missing classification for home Item 1');
});

test('Application combina lector i catàleg, amb correccions d’I1', async () => {
  const listForProjection = vi.fn(async () => [item(1, 'body')]);
  const read = vi.fn(async () => catalog);
  expect(await getGroupedHomeItems(new URLSearchParams('subcategoria_id=2'), { listForProjection }, { read })).toEqual(project([item(1, 'body')], 'subcategoria_id=2'));
  expect(listForProjection).toHaveBeenCalledOnce();
  expect(read).toHaveBeenCalledOnce();
});

test('Application propaga errors de lectura i catàleg', async () => {
  const error = new Error('read failed');
  const listForProjection = vi.fn(async () => { throw error; });
  await expect(getGroupedHomeItems([], { listForProjection }, { read: async () => catalog })).rejects.toBe(error);
  listForProjection.mockClear();
  await expect(getGroupedHomeItems([], { listForProjection }, { read: async () => { throw error; } })).rejects.toBe(error);
  expect(listForProjection).not.toHaveBeenCalled();
});

test('adaptador consulta el repositori excloent item_llista i conserva null', async () => {
  const rows = [item(1, 'body')];
  const query = vi.fn(async () => ({ rows }));
  const reader = new PostgresHomeItemsReader({ query } as unknown as Pool);
  expect(await reader.listForProjection()).toEqual(rows);
  expect(query).toHaveBeenCalledOnce();
  expect(query.mock.calls[0][0]).toContain('WHERE NOT EXISTS (SELECT 1 FROM item_llista il WHERE il.item_id = i.id)');
});

test('photographs stay on units and never alter group identity or counts', () => {
  const result = project([{ ...item(1, 'body'), foto_ref: 'items/a.webp' }, { ...item(2, 'BODY'), foto_ref: 'items/b.webp' }, item(3, 'Body')]);
  expect(result.groups).toHaveLength(1);
  expect(result.groups[0].units.map(unit => unit.foto_ref)).toEqual([null, 'items/b.webp', 'items/a.webp']);
  expect(result.groups[0].total_units).toBe(3);
  expect(result.groups[0]).not.toHaveProperty('foto_ref');
  expect(result.groups[0].key).toBe(project([item(1, 'body')]).groups[0].key);
});
