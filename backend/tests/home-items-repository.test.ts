import type { Pool } from 'pg';
import { expect, test, vi } from 'vitest';
import { PostgresHomeItemsRepository } from '../src/infrastructure/postgres-home-items-repository.js';

const input = { nom: 'Body', categoria_id: 1, subcategoria_id: 2, quantitat: 3, estat_preparacio: 'preparada' as const };
function setup(failure?: string, rollbackFailure = false) {
  let inserts = 0;
  const query = vi.fn(async (sql: string, values?: unknown[]) => {
    const command = sql.trim().split(/\s/)[0];
    if (command === 'INSERT') inserts++;
    if (command === failure && (command !== 'INSERT' || inserts === 2)) throw new Error('SQL failure');
    if (command === 'ROLLBACK' && rollbackFailure) throw new Error('rollback failure');
    return { rows: [{ id: inserts, nom: values?.[0], estat_preparacio: values?.[2] }] };
  });
  const release = vi.fn();
  const connect = vi.fn().mockResolvedValue({ query, release });
  const repository = new PostgresHomeItemsRepository({ connect } as unknown as Pool);
  return { repository, query, release, connect };
}
test('N insercions parametritzades al mateix client abans de COMMIT', async () => {
  const { repository, query, release, connect } = setup();
  const items = await repository.createAtomically(input);
  expect(items.map((item) => item.id)).toEqual([1, 2, 3]);
  expect(items.every((item) => item.estat_preparacio === 'preparada')).toBe(true);
  expect(connect).toHaveBeenCalledOnce();
  expect(query.mock.calls.map(([sql]) => sql.trim().split(/\s/)[0])).toEqual(['BEGIN', 'INSERT', 'INSERT', 'INSERT', 'COMMIT']);
  expect(query.mock.calls[1][1]).toEqual(['Body', 2, 'preparada']);
  expect(release).toHaveBeenCalledOnce();
});
test.each(['INSERT', 'COMMIT'])('fallada %s fa ROLLBACK i no retorna èxit', async (failure) => {
  const { repository, query, release } = setup(failure);
  await expect(repository.createAtomically(input)).rejects.toThrow('SQL failure');
  expect(query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
  expect(release).toHaveBeenCalledOnce();
});
test('fallada BEGIN descarta connexió', async () => {
  const { repository, query, release } = setup('BEGIN');
  await expect(repository.createAtomically(input)).rejects.toThrow('SQL failure');
  expect(query).toHaveBeenCalledOnce();
  expect(release.mock.calls[0][0]).toBeInstanceOf(Error);
});
test('fallada ROLLBACK conserva ambdós errors i descarta connexió', async () => {
  const { repository, release } = setup('INSERT', true);
  await expect(repository.createAtomically(input)).rejects.toBeInstanceOf(AggregateError);
  expect(release.mock.calls[0][0]).toBeInstanceOf(Error);
});
test('fallada connect es propaga', async () => {
  const error = new Error('connection');
  const repository = new PostgresHomeItemsRepository({ connect: async () => { throw error; } } as unknown as Pool);
  await expect(repository.createAtomically(input)).rejects.toBe(error);
});
