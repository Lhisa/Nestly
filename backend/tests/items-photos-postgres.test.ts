import { randomUUID } from 'node:crypto';
import { readFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { Pool } from 'pg';
import sharp from 'sharp';
import { expect, test } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from '../src/http/app.js';
import { PostgresHomeItemsRepository } from '../src/infrastructure/postgres-home-items-repository.js';
import { PostgresHomeItemsReader } from '../src/infrastructure/postgres-home-items-reader.js';
import { PostgresClassificationCatalog } from '../src/infrastructure/postgres-classification-catalog.js';
import { PostgresItemPhotoReferences } from '../src/infrastructure/postgres-item-photo-references.js';
import { LocalItemPhotoStorage } from '../src/infrastructure/local-item-photo-storage.js';
import { SharpItemPhotoProcessor } from '../src/infrastructure/sharp-item-photo-processor.js';

test('PostgreSQL real: multipart batches, reads, referenced serving and rollback compensation', async () => {
  const connectionString = process.env.NESTLY_ITEMS_TEST_DATABASE_URL;
  if (!connectionString || new URL(connectionString).pathname !== '/nestly_test') {
    throw Error('Cal NESTLY_ITEMS_TEST_DATABASE_URL exclusivament per a nestly_test.');
  }
  const admin = new Pool({ connectionString, connectionTimeoutMillis: 3000 });
  const schema = 'm15_' + randomUUID().replaceAll('-', '');
  let created = false;
  let pool: Pool | undefined;
  let server: Server | undefined;
  let directory: string | undefined;
  try {
    expect((await admin.query('SELECT current_database() AS name')).rows[0].name).toBe('nestly_test');
    await admin.query('CREATE SCHEMA ' + schema);
    created = true;
    pool = new Pool({ connectionString, options: '-c search_path=' + schema, connectionTimeoutMillis: 3000 });
    expect((await pool.query('SELECT current_schema() AS name')).rows[0].name).toBe(schema);
    // Existing schema fixture, only in the isolated test schema; no migrator is run.
    await pool.query(await readFile(new URL('../migrations/001_create_initial_schema.sql', import.meta.url), 'utf8'));
    await pool.query("INSERT INTO categoria (nom) VALUES ('Roba')");
    await pool.query("INSERT INTO subcategoria (nom, categoria_id) VALUES ('Bodies', 1)");
    directory = await mkdtemp(join(tmpdir(), 'nestly-photo-pg-'));
    const references = new PostgresItemPhotoReferences(pool);
    const storage = () => new LocalItemPhotoStorage(directory!, ref => references.hasReferences(ref));
    const incidents: unknown[] = [];
    server = createApp(new PostgresClassificationCatalog(pool), {
      repository: new PostgresHomeItemsRepository(pool),
      reader: new PostgresHomeItemsReader(pool),
      photos: {
        processor: new SharpItemPhotoProcessor(), storage,
        read: ref => storage().readReferenced(ref), reportIncident: error => incidents.push(error),
      },
    }).listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server!.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw Error('address');
    const base = 'http://127.0.0.1:' + address.port;
    const bytes = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#aabbcc' } }).png().toBuffer();
    const post = (nom: string, quantitat: number, withPhoto = true) => {
      const data = { nom, categoria_id: 1, subcategoria_id: 1, quantitat, estat_preparacio: 'preparada' };
      if (!withPhoto) return fetch(base + '/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const body = new FormData();
      body.append('data', JSON.stringify(data)); body.append('photo', new Blob([bytes]), 'photo.png');
      return fetch(base + '/api/items', { method: 'POST', body });
    };
    const firstResponse = await post('Body', 3);
    expect(firstResponse.status).toBe(201);
    const first = await firstResponse.json();
    const ref = first.items[0].foto_ref;
    expect(first.items.every((item: { foto_ref: string }) => item.foto_ref === ref)).toBe(true);
    expect((await pool.query('SELECT foto_ref FROM item ORDER BY id')).rows.map(row => row.foto_ref)).toEqual([ref, ref, ref]);
    expect(await references.hasReferences(ref)).toBe(true);
    const secondResponse = await post('Body', 1);
    expect(secondResponse.status).toBe(201);
    const second = await secondResponse.json();
    expect(second.items[0].foto_ref).not.toBe(ref);
    const json = await (await post('Body', 1, false)).json();
    expect(json.items[0].foto_ref).toBeNull();
    const groups = await (await fetch(base + '/api/items')).json();
    expect(groups.groups).toHaveLength(1);
    expect(groups.groups[0].total_units).toBe(5);
    expect(groups.groups[0]).not.toHaveProperty('foto_ref');
    expect(groups.groups[0].units.filter((item: { foto_ref: string | null }) => item.foto_ref === ref)).toHaveLength(3);
    const detail = await (await fetch(base + '/api/items/' + first.items[0].id)).json();
    expect(detail.item.foto_ref).toBe(ref);
    const photoUrl = base + '/api/item-photos/' + ref.slice(6, -5);
    expect((await fetch(photoUrl)).status).toBe(200);
    expect(await readdir(join(directory, 'items'))).toHaveLength(2);
    await pool.query("CREATE FUNCTION reject_photo_batch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.nom = 'Fallada' THEN RAISE EXCEPTION 'test failure'; END IF; RETURN NEW; END $$");
    await pool.query('CREATE TRIGGER reject_photo_batch BEFORE INSERT ON item FOR EACH ROW EXECUTE FUNCTION reject_photo_batch()');
    expect((await post('Fallada', 3)).status).toBe(500);
    expect((await pool.query("SELECT count(*)::int AS total FROM item WHERE nom='Fallada'")).rows[0].total).toBe(0);
    expect(await readdir(join(directory, 'items'))).toHaveLength(2);
    expect(incidents).toEqual([]);
    // Removing only this fixture's rows leaves the disk file inaccessible through HTTP.
    await pool.query('DELETE FROM item WHERE foto_ref=$1', [ref]);
    expect(await references.hasReferences(ref)).toBe(false);
    expect((await fetch(photoUrl)).status).toBe(404);
    expect(await readdir(join(directory, 'items'))).toHaveLength(2);
  } finally {
    try {
      if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    } finally {
      try { await pool?.end(); }
      finally {
        try { if (created) await admin.query('DROP SCHEMA ' + schema + ' CASCADE'); }
        finally {
          await admin.end();
          if (directory) {
            if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith('nestly-photo-pg-')) throw Error('Unsafe temporary cleanup');
            await rm(directory, { recursive: true, force: true });
          }
        }
      }
    }
  }
}, 20000);
