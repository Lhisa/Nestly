import type { Pool } from 'pg';
import { expect, test, vi } from 'vitest';
import { PostgresItemPhotoReferences } from '../src/infrastructure/postgres-item-photo-references.js';

test.each([true, false])('reference query is parameterized and returns %s', async referenced => {
  const query = vi.fn(async () => ({ rows: [{ referenced }] }));
  const checker = new PostgresItemPhotoReferences({ query } as unknown as Pool);
  expect(await checker.hasReferences('items/test.webp')).toBe(referenced);
  expect(query).toHaveBeenCalledWith('SELECT EXISTS (SELECT 1 FROM item WHERE foto_ref = $1) AS referenced', ['items/test.webp']);
});
test('an uncertain reference result never means unreferenced', async () => {
  const query = vi.fn(async () => ({ rows: [] }));
  await expect(new PostgresItemPhotoReferences({ query } as unknown as Pool).hasReferences('items/test.webp')).rejects.toThrow('Uncertain');
});
