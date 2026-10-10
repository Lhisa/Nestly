import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { expect, test } from 'vitest';
import { PostgresHomeItemsRepository } from '../src/infrastructure/postgres-home-items-repository.js';

const connectionString = process.env.NESTLY_ITEMS_TEST_DATABASE_URL;
test.skipIf(!connectionString)('PostgreSQL real: N IDs, estats i rollback en esquema aïllat', async () => {
  if (!connectionString || new URL(connectionString).pathname !== '/nestly_test') {
    throw new Error('La URL ha d’apuntar exclusivament a nestly_test.');
  }
  const admin = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
  const schema = `m13_${randomUUID().replaceAll('-', '')}`;
  let pool: Pool | undefined;
  let created = false;
  try {
    const { rows } = await admin.query('SELECT current_database() AS name');
    if (rows[0].name !== 'nestly_test') throw new Error('Destí real no autoritzat.');
    await admin.query(`CREATE SCHEMA ${schema}`);
    created = true;
    pool = new Pool({ connectionString, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
    await pool.query(await readFile(new URL('../migrations/001_create_initial_schema.sql', import.meta.url), 'utf8'));
    await pool.query("INSERT INTO categoria (nom) VALUES ('Roba')");
    await pool.query("INSERT INTO subcategoria (nom, categoria_id) VALUES ('Bodies', 1)");
    const repository = new PostgresHomeItemsRepository(pool);
    for (const estat_preparacio of ['no_preparada', 'preparada'] as const) {
      const items = await repository.createAtomically({ nom: 'Body', categoria_id: 1, subcategoria_id: 1, quantitat: 100, estat_preparacio });
      expect(items).toHaveLength(100);
      expect(new Set(items.map((item) => item.id)).size).toBe(100);
      expect(items.every((item) => item.estat_preparacio === estat_preparacio && item.foto_ref === null && item.data_entrada_casa === null && item.data_creacio instanceof Date)).toBe(true);
    }
    // La primera inserció passa; la segona falla dins de la mateixa transacció.
    await pool.query(`CREATE FUNCTION reject_second() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.nom = 'Fallada' AND EXISTS (SELECT 1 FROM item WHERE nom = 'Fallada') THEN
          RAISE EXCEPTION 'fallada injectada';
        END IF;
        RETURN NEW;
      END $$`);
    await pool.query('CREATE TRIGGER reject_second BEFORE INSERT ON item FOR EACH ROW EXECUTE FUNCTION reject_second()');
    await expect(repository.createAtomically({ nom: 'Fallada', categoria_id: 1, subcategoria_id: 1, quantitat: 3, estat_preparacio: 'no_preparada' })).rejects.toThrow('fallada injectada');
    const result = await pool.query("SELECT count(*)::int AS total FROM item WHERE nom = 'Fallada'");
    expect(result.rows[0].total).toBe(0);
    expect((await pool.query('SELECT count(*)::int AS total FROM item')).rows[0].total).toBe(200);
    expect((await pool.query('SELECT count(*)::int AS total FROM item_llista')).rows[0].total).toBe(0);
  } finally {
    await pool?.end();
    try {
      if (created) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    } finally {
      await admin.end();
    }
  }
}, 15000);
