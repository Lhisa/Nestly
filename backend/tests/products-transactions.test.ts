import type { Pool } from 'pg';
import { expect, test, vi } from 'vitest';
import { PostgresProducts } from '../src/infrastructure/postgres-products.js';
import { ProductPersistenceUncertainError } from '../src/application/product-persistence.js';

const input = { product: { mode: 'existing' as const, producte_id: 7 }, quantitat: 2, estat_preparacio: 'preparada' as const };

function simulatedConnection(failure: 'COMMIT' | 'INSERT') {
  const original = Error('Resposta transaccional perduda');
  const rollback = Error('Connexió perduda durant ROLLBACK');
  const query = vi.fn(async (sql: string) => {
    const command = sql.trim().split(/\s+/)[0];
    if (command === failure) throw original;
    if (command === 'ROLLBACK' && failure === 'INSERT') throw rollback;
    if (command === 'SELECT') return { rows: [{ id: 7, nom: 'Body', subcategoria_id: 1, foto_ref: null }] };
    if (command === 'INSERT') return { rows: [{ id: 11 }, { id: 12 }] };
    return { rows: [] };
  });
  const release = vi.fn();
  const connect = vi.fn().mockResolvedValue({ query, release });
  return { repository: new PostgresProducts({ connect } as unknown as Pool), query, release, original, rollback };
}

test('COMMIT incert: propaga incertesa encara que ROLLBACK respongui, i descarta la connexió', async () => {
  const { repository, query, release, original } = simulatedConnection('COMMIT');
  // La resposta de COMMIT falla: el simulador no pressuposa si el servidor ha confirmat.
  const outcome = await repository.createBatchAtomically(input).then(
    value => ({ value, error: undefined }), error => ({ value: undefined, error }),
  );
  expect(outcome.value).toBeUndefined();
  expect(outcome.error).toBeInstanceOf(ProductPersistenceUncertainError);
  expect(outcome.error.cause).toBe(original);
  expect(query.mock.calls.map(([sql]) => sql.trim().split(/\s+/)[0])).toEqual(['BEGIN','SELECT','INSERT','COMMIT','ROLLBACK']);
  expect(release).toHaveBeenCalledExactlyOnceWith(original);
});

test('ROLLBACK fallit: conserva els dos errors, no envia COMMIT i descarta la connexió', async () => {
  const { repository, query, release, original, rollback } = simulatedConnection('INSERT');
  const error = await repository.createBatchAtomically(input).catch((cause: unknown) => cause);
  expect(error).toBeInstanceOf(ProductPersistenceUncertainError);
  const aggregate = (error as ProductPersistenceUncertainError).cause;
  expect(aggregate).toBeInstanceOf(AggregateError);
  expect((aggregate as AggregateError).errors).toEqual([original, rollback]);
  expect(query.mock.calls.map(([sql]) => sql.trim().split(/\s+/)[0])).toEqual(['BEGIN','SELECT','INSERT','ROLLBACK']);
  expect(release).toHaveBeenCalledExactlyOnceWith(rollback);
});
