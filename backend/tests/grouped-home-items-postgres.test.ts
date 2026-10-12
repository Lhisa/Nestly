import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { Pool } from 'pg';
import { expect, test } from 'vitest';
import { getGroupedHomeItems } from '../src/application/get-grouped-home-items.js';
import { createApp } from '../src/http/app.js';
import { PostgresClassificationCatalog } from '../src/infrastructure/postgres-classification-catalog.js';
import { PostgresHomeItemsReader } from '../src/infrastructure/postgres-home-items-reader.js';
import { PostgresHomeItemsRepository } from '../src/infrastructure/postgres-home-items-repository.js';

// These integration checks require a real test database; missing configuration fails explicitly.
// Use NESTLY_ITEMS_TEST_DATABASE_URL, exclusively targeting nestly_test.
async function withProjectionFixture(check: (pool: Pool, ids: { home: number; unspecified: number; linked: number; other: number }) => Promise<void>) {
  const connectionString = process.env.NESTLY_ITEMS_TEST_DATABASE_URL;
  if (!connectionString || new URL(connectionString).pathname !== '/nestly_test') {
    throw new Error('Configura NESTLY_ITEMS_TEST_DATABASE_URL exclusivament per a nestly_test.');
  }
  const admin = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
  const schema = `m14_${randomUUID().replaceAll('-', '')}`;
  let pool: Pool | undefined;
  let created = false;
  try {
    const { rows } = await admin.query('SELECT current_database() AS name');
    if (rows[0].name !== 'nestly_test') throw new Error('Destí real no autoritzat.');
    await admin.query(`CREATE SCHEMA ${schema}`);
    created = true;
    pool = new Pool({ connectionString, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
    expect((await pool.query('SELECT current_schema() AS name')).rows[0].name).toBe(schema);
    await pool.query(await readFile(new URL('../migrations/001_create_initial_schema.sql', import.meta.url), 'utf8'));
    await pool.query("INSERT INTO categoria (nom) VALUES ('Roba')");
    await pool.query("INSERT INTO subcategoria (nom, categoria_id) VALUES ('Bodies', 1), ('Mantes', 1)");
    const { rows: items } = await pool.query<{ id: number }>(`INSERT INTO item (nom, subcategoria_id, estat_preparacio, data_creacio) VALUES
      ('Body', 1, 'preparada', '2026-10-01T08:00:00Z'),
      ('body', 1, NULL, '2026-10-02T10:00:00+02:00'),
      ('BODY', 1, 'no_preparada', '2026-10-03T08:00:00Z'),
      ('Manta', 2, 'no_preparada', '2026-10-04T08:00:00Z') RETURNING id`);
    const ids = { home: items[0].id, unspecified: items[1].id, linked: items[2].id, other: items[3].id };
    await pool.query("INSERT INTO botiga (nom) VALUES ('Botiga de prova')");
    await pool.query("INSERT INTO llista_nado (nom, botiga_id) VALUES ('Llista de prova', 1)");
    await pool.query("INSERT INTO item_llista (item_id, llista_id, estat_comanda, preu_total) VALUES ($1, 1, 'demanat', 1)", [ids.linked]);
    expect((await pool.query('SELECT count(*)::int AS total FROM item')).rows[0].total).toBe(4);
    await check(pool, ids);
  } finally {
    await pool?.end();
    try {
      // Only the randomly named schema created by this fixture, after verifying nestly_test.
      if (created) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    } finally {
      await admin.end();
    }
  }
}

test('PostgreSQL real: la projecció exclou item_llista i conserva els altres Items de casa', async () => {
  await withProjectionFixture(async (pool, ids) => {
    const reader = new PostgresHomeItemsReader(pool);
    const catalog = new PostgresClassificationCatalog(pool);
    const raw = await reader.listForProjection();
    expect(raw.map((item) => item.id).sort((a, b) => a - b)).toEqual([ids.home, ids.unspecified, ids.other].sort((a, b) => a - b));
    const grouped = await getGroupedHomeItems([], reader, catalog);
    expect(grouped.inventory_count).toBe(3);
    expect(grouped.matched_count).toBe(3);
    expect(grouped.groups).toHaveLength(2);
    expect(grouped.groups.flatMap((group) => group.units.map((unit) => unit.id)).sort((a, b) => a - b)).toEqual(raw.map((item) => item.id).sort((a, b) => a - b));
    const bodies = grouped.groups.find((group) => group.subcategory.name === 'Bodies');
    expect(bodies?.total_units).toBe(2);
    expect(bodies?.units.map((unit) => unit.id)).toEqual([ids.unspecified, ids.home]);
    const filtered = await getGroupedHomeItems([['subcategoria_id', '2']], reader, catalog);
    expect(filtered.inventory_count).toBe(3);
    expect(filtered.matched_count).toBe(1);
    expect(filtered.groups[0].units.map((unit) => unit.id)).toEqual([ids.other]);
    expect(await reader.findById(ids.linked)).toBeNull();
  });
}, 15000);

test('PostgreSQL real: preparació NULL, comptatge no indicat, dates UTC i detall HTTP', async () => {
  await withProjectionFixture(async (pool, ids) => {
    const reader = new PostgresHomeItemsReader(pool);
    const catalog = new PostgresClassificationCatalog(pool);
    const raw = (await reader.listForProjection()).find((item) => item.id === ids.unspecified);
    expect(raw?.estat_preparacio).toBeNull();
    expect(raw?.data_creacio).toBeInstanceOf(Date);
    expect(raw?.data_creacio.toISOString()).toBe('2026-10-02T08:00:00.000Z');
    const grouped = await getGroupedHomeItems([], reader, catalog);
    const bodies = grouped.groups.find((group) => group.subcategory.name === 'Bodies');
    expect(bodies?.preparation_counts).toEqual({ prepared: 1, not_prepared: 0, unspecified: 1 });
    expect(bodies?.units.find((unit) => unit.id === ids.unspecified)).toMatchObject({ preparation_status: null, created_at: '2026-10-02T08:00:00.000Z' });
    expect((await reader.findById(ids.unspecified))?.estat_preparacio).toBeNull();
    const server = createApp(catalog, { reader, repository: new PostgresHomeItemsRepository(pool) }).listen(0, '127.0.0.1');
    try {
      await once(server, 'listening');
      const port = (server.address() as AddressInfo).port;
      const response = await fetch(`http://127.0.0.1:${port}/api/items/${ids.unspecified}`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.item).toMatchObject({ id: ids.unspecified, estat_preparacio: null, data_creacio: '2026-10-02T08:00:00.000Z' });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
}, 15000);
