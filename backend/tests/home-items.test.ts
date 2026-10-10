import { expect, test, vi } from 'vitest';
import { validateHomeItems, ItemValidationError } from '../src/domain/item.js';
import type { CreateHomeItemsInput } from '../src/domain/item.js';
import { createHomeItems, ClassificationNotFoundError } from '../src/application/create-home-items.js';

const input: CreateHomeItemsInput = { nom: ' Body  blau ', categoria_id: 1, subcategoria_id: 2, quantitat: 1, estat_preparacio: 'no_preparada' };
const catalog = { read: async () => [{ id: 1, nom: 'Roba', subcategories: [{ id: 2, nom: 'Bodies' }] }, { id: 3, nom: 'Altres', subcategories: [{ id: 4, nom: 'Altres' }] }] };

test.each([1, 100])('accepta quantitat %s', (quantitat) => {
  expect(validateHomeItems({ ...input, quantitat }).quantitat).toBe(quantitat);
});
test.each([0, 101, -1, 1.5, NaN, Infinity, '1', null, undefined, true])('rebutja quantitat %s', (quantitat) => {
  expect(() => validateHomeItems({ ...input, quantitat } as CreateHomeItemsInput)).toThrow(ItemValidationError);
});
test.each(['', '   ', '123!?', 'a'.repeat(101), null, 42])('rebutja nom %s', (nom) => {
  expect(() => validateHomeItems({ ...input, nom } as CreateHomeItemsInput)).toThrow(ItemValidationError);
});
test.each(['à', 'Body  blau 2!', 'a'.repeat(100), '𐐀'.repeat(100)])('accepta nom vàlid', (nom) => {
  expect(validateHomeItems({ ...input, nom: ` ${nom} ` }).nom).toBe(nom);
});
test.each(['no_preparada', 'preparada'] as const)('conserva preparació %s', async (estat_preparacio) => {
  const createAtomically = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
  const items = await createHomeItems({ ...input, quantitat: 2, estat_preparacio }, catalog, { createAtomically });
  expect(items).toEqual([{ id: 1 }, { id: 2 }]);
  expect(createAtomically).toHaveBeenCalledExactlyOnceWith({ ...input, nom: 'Body  blau', quantitat: 2, estat_preparacio });
});
test.each([null, undefined, 'preparat', ''])('rebutja preparació invàlida', (estat_preparacio) => {
  expect(() => validateHomeItems({ ...input, estat_preparacio } as CreateHomeItemsInput)).toThrow(ItemValidationError);
});
test.each([{ categoria_id: 99 }, { subcategoria_id: 99 }])('classificació inexistent no persisteix', async (override) => {
  const createAtomically = vi.fn();
  await expect(createHomeItems({ ...input, ...override }, catalog, { createAtomically })).rejects.toThrow(ClassificationNotFoundError);
  expect(createAtomically).not.toHaveBeenCalled();
});
test('subcategoria d’una altra categoria no persisteix', async () => {
  const createAtomically = vi.fn();
  await expect(createHomeItems({ ...input, subcategoria_id: 4 }, catalog, { createAtomically })).rejects.toThrow(ItemValidationError);
  expect(createAtomically).not.toHaveBeenCalled();
});
test('entrada invàlida no consulta ni persisteix', async () => {
  const read = vi.fn();
  const createAtomically = vi.fn();
  await expect(createHomeItems({ ...input, quantitat: 0 }, { read }, { createAtomically })).rejects.toThrow(ItemValidationError);
  expect(read).not.toHaveBeenCalled();
  expect(createAtomically).not.toHaveBeenCalled();
});
test('propaga errors de catàleg i persistència per al tractament a la frontera', async () => {
  const error = new Error('persistència');
  const createAtomically = vi.fn().mockRejectedValue(error);
  await expect(createHomeItems(input, catalog, { createAtomically })).rejects.toBe(error);
  createAtomically.mockClear();
  await expect(createHomeItems(input, { read: async () => { throw error; } }, { createAtomically })).rejects.toBe(error);
  expect(createAtomically).not.toHaveBeenCalled();
});
