import { expect, test } from 'vitest';
import { resolveHomeItemsFilters } from '../src/application/home-items-filters.js';
import type { FilterCorrection } from '../src/application/home-items-projection.js';

const catalog = [
  { id: 1, nom: 'Roba', subcategories: [{ id: 2, nom: 'Bodies' }] },
  { id: 3, nom: 'Altres', subcategories: [{ id: 4, nom: 'Mantes' }] },
  { id: 2147483647, nom: 'Límit', subcategories: [] },
];
const correction = (parameter: string, reason: FilterCorrection['reason'], action: FilterCorrection['action'] = 'removed') => ({ parameter, reason, action });
const resolve = (query: string) => resolveHomeItemsFilters(new URLSearchParams(query), catalog);

test.each([
  ['', null, null, []],
  ['categoria_id=1&subcategoria_id=2', 1, 2, []],
  ['categoria_id=01', 1, null, []],
  ['categoria_id=2147483647', 2147483647, null, []],
  ['categoria_id=1&subcategoria_id=4', 1, null, [correction('subcategoria_id', 'incompatible')]],
  ['subcategoria_id=4', 3, 4, [correction('categoria_id', 'inferred', 'inferred')]],
  ['categoria_id=x&subcategoria_id=2', 1, 2, [correction('categoria_id', 'malformed'), correction('categoria_id', 'inferred', 'inferred')]],
  ['categoria_id=99&subcategoria_id=2', 1, 2, [correction('categoria_id', 'not_found'), correction('categoria_id', 'inferred', 'inferred')]],
  ['categoria_id=1&categoria_id=01&subcategoria_id=4', 3, 4, [correction('categoria_id', 'ambiguous'), correction('categoria_id', 'inferred', 'inferred')]],
  ['categoria_id=1&subcategoria_id=x', 1, null, [correction('subcategoria_id', 'malformed')]],
  ['categoria_id=1&subcategoria_id=99', 1, null, [correction('subcategoria_id', 'not_found')]],
  ['categoria_id=1&subcategoria_id=2&subcategoria_id=4', 1, null, [correction('subcategoria_id', 'ambiguous')]],
  ['categoria_id=x&subcategoria_id=99', null, null, [correction('categoria_id', 'malformed'), correction('subcategoria_id', 'not_found')]],
  ['categoria_id=1&categoria_id=1', 1, null, [correction('categoria_id', 'duplicate', 'deduplicated')]],
  ['subcategoria_id=2&subcategoria_id=2', 1, 2, [correction('subcategoria_id', 'duplicate', 'deduplicated'), correction('categoria_id', 'inferred', 'inferred')]],
  ['categoria_id=1&categoria_id=2', null, null, [correction('categoria_id', 'ambiguous')]],
  ['categoria_id=x&categoria_id=x', null, null, [correction('categoria_id', 'duplicate', 'deduplicated'), correction('categoria_id', 'malformed')]],
  ['categoria_id=x&categoria_id=1', null, null, [correction('categoria_id', 'ambiguous')]],
])('resol %s amb filtres i correccions exactes', (query, category, subcategory, corrections) => {
  expect(resolve(query)).toEqual({ filters: { categoria_id: category, subcategoria_id: subcategory }, corrections });
});

test.each(['', '0', '-1', '1.0', '1e0', '2147483648', '99999999999999999999999', ' 1', '1 ', '+1', 'NaN', 'Infinity', '١', '1a'])('rebutja identificador %s sense trim', (raw) => {
  for (const parameter of ['categoria_id', 'subcategoria_id']) {
    expect(resolveHomeItemsFilters([[parameter, raw]], catalog)).toEqual({
      filters: { categoria_id: null, subcategoria_id: null }, corrections: [correction(parameter, 'malformed')],
    });
  }
});

test('límit numèric vàlid també per subcategoria', () => {
  expect(resolveHomeItemsFilters([['subcategoria_id', '2147483647']], [
    { id: 1, nom: 'Roba', subcategories: [{ id: 2147483647, nom: 'Límit' }] },
  ]).filters).toEqual({ categoria_id: 1, subcategoria_id: 2147483647 });
});

test('correccions simultànies deterministes, desconeguts ordenats i sense mutació', () => {
  const entries = [['z', 'x'], ['categoria_id', 'x'], ['subcategoria_id', '02'], ['a', '1'], ['a', '2']] as const;
  const before = structuredClone(catalog);
  entries.forEach(Object.freeze);
  Object.freeze(entries);
  const expected = { filters: { categoria_id: 1, subcategoria_id: 2 }, corrections: [
    correction('categoria_id', 'malformed'), correction('categoria_id', 'inferred', 'inferred'),
    correction('a', 'unknown'), correction('z', 'unknown'),
  ] };
  expect(resolveHomeItemsFilters(entries, catalog)).toEqual(expected);
  expect(resolveHomeItemsFilters([...entries].reverse(), catalog)).toEqual(expected);
  expect(catalog).toEqual(before);
  expect(entries).toEqual([['z', 'x'], ['categoria_id', 'x'], ['subcategoria_id', '02'], ['a', '1'], ['a', '2']]);
});

test('catàleg buit descarta identificadors inexistents', () => {
  expect(resolveHomeItemsFilters([['categoria_id', '1'], ['subcategoria_id', '2']], [])).toEqual({
    filters: { categoria_id: null, subcategoria_id: null },
    corrections: [correction('categoria_id', 'not_found'), correction('subcategoria_id', 'not_found')],
  });
});
