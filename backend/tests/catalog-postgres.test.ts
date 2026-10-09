import { Pool } from 'pg';
import { expect, test } from 'vitest';
import { PostgresClassificationCatalog } from '../src/infrastructure/postgres-classification-catalog.js';

const connectionString = process.env.TEST_DATABASE_URL;
test.skipIf(!connectionString)('consulta el catàleg real de M0 amb relacions i ordre deterministes', async () => {
  if (!connectionString || new URL(connectionString).pathname !== '/nestly_test') {
    throw new Error('TEST_DATABASE_URL ha d’apuntar exclusivament a nestly_test.');
  }
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    const reader = new PostgresClassificationCatalog(pool);
    const catalog = await reader.read();
    expect(await reader.read()).toEqual(catalog);
    expect(catalog).toHaveLength(8);
    expect(catalog.flatMap((category) => category.subcategories)).toHaveLength(41);
    expect(catalog.map((category) => category.id)).toEqual(catalog.map((category) => category.id).sort((a, b) => a - b));
    const raw = await pool.query('SELECT id, nom, categoria_id FROM subcategoria ORDER BY id');
    expect(catalog.flatMap((category) => category.subcategories.map((subcategory) => ({
      ...subcategory, categoria_id: category.id,
    }))).sort((a, b) => a.id - b.id)).toEqual(raw.rows);
    expect(catalog.find((category) => category.nom === 'Pendent de classificar')?.subcategories.map((entry) => entry.nom))
      .toEqual(['Pendent de classificar']);
  } finally {
    await pool.end();
  }
});
