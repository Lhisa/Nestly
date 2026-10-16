import { afterEach, expect, test, vi } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApp } from '../src/http/app.js';
import { LocalItemPhotoStorage } from '../src/infrastructure/local-item-photo-storage.js';
import { SharpItemPhotoProcessor } from '../src/infrastructure/sharp-item-photo-processor.js';
import { ItemPersistenceUncertainError } from '../src/application/create-home-items.js';
import type { CreateHomeItemsInput, Item } from '../src/domain/item.js';

let server: Server | undefined;
let directory: string | undefined;
afterEach(async () => {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  if (directory) await rm(directory, { recursive: true, force: true });
  server = undefined; directory = undefined;
  vi.restoreAllMocks();
});
const data = { nom: 'Body', categoria_id: 1, subcategoria_id: 2, quantitat: 3, estat_preparacio: 'preparada' as const };
const catalog = { read: async () => [{ id: 1, nom: 'Roba', subcategories: [{ id: 2, nom: 'Bodies' }] }] };
async function png() { return sharp({ create: { width: 40, height: 20, channels: 3, background: '#ccbbaa' } }).png().toBuffer(); }
function form(bytes: Uint8Array, value: unknown = data) {
  const body = new FormData();
  body.append('data', JSON.stringify(value));
  // Deliberately false MIME and extension: bytes determine the actual format.
  body.append('photo', new Blob([Buffer.from(bytes)], { type: 'text/plain' }), 'untrusted.exe');
  return body;
}
async function start() {
  directory = await mkdtemp(join(tmpdir(), 'nestly-photo-http-'));
  const rows: Item[] = [];
  const check = vi.fn(async (ref: string) => rows.some(item => item.foto_ref === ref));
  const reportIncident = vi.fn();
  const processor = new SharpItemPhotoProcessor();
  const makeStorage = () => new LocalItemPhotoStorage(directory!, check);
  const repository = { createAtomically: vi.fn(async (input: CreateHomeItemsInput, ref: string | null = null) => {
    const created = Array.from({ length: input.quantitat }, (_, index) => ({ id: rows.length + index + 1, nom: input.nom, subcategoria_id: input.subcategoria_id, estat_preparacio: input.estat_preparacio, foto_ref: ref, data_entrada_casa: null, data_creacio: new Date() }));
    rows.push(...created); return created;
  }) };
  const photos = { processor, storage: makeStorage, read: (ref: string) => makeStorage().readReferenced(ref), reportIncident };
  const reader = { list: async () => rows, listForProjection: async () => rows, findById: async (id: number) => rows.find(item => item.id === id) ?? null };
  server = createApp(catalog, { repository, reader, photos }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server!.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('address');
  const base = 'http://127.0.0.1:' + address.port;
  return { base, rows, check, reportIncident, processor, repository, photos,
    post: (body: FormData) => fetch(base + '/api/items', { method: 'POST', body }) };
}
test.each([1, 3])('multipart creates %s units and serves a shared normalized file', async quantitat => {
  const api = await start();
  const response = await api.post(form(await png(), { ...data, quantitat }));
  expect(response.status).toBe(201);
  const result = await response.json();
  expect(result.created_count).toBe(quantitat);
  const ref = result.items[0].foto_ref;
  expect(ref).toMatch(/^items[/][0-9a-f-]{36}[.]webp$/);
  expect(result.items.every((item: Item) => item.foto_ref === ref)).toBe(true);
  expect(await readdir(join(directory!, 'items'))).toHaveLength(1);
  const grouped = await (await fetch(api.base + '/api/items')).json();
  expect(grouped.groups[0].units.every((item: { foto_ref: string }) => item.foto_ref === ref)).toBe(true);
  expect(grouped.groups[0]).not.toHaveProperty('foto_ref');
  const detail = await (await fetch(api.base + '/api/items/1')).json();
  expect(detail.item.foto_ref).toBe(ref);
  const photoUrl = api.base + '/api/item-photos/' + ref.slice(6, -5);
  const photo = await fetch(photoUrl);
  expect(photo.status).toBe(200);
  expect(photo.headers.get('content-type')).toContain('image/webp');
  expect(photo.headers.get('x-content-type-options')).toBe('nosniff');
  expect(Buffer.from(await photo.arrayBuffer())).toEqual(await readFile(join(directory!, ref)));
  api.rows.splice(0);
  expect((await fetch(photoUrl)).status).toBe(404);
});
test('different lots get different references while remaining in one group', async () => {
  const api = await start();
  const a = await (await api.post(form(await png()))).json();
  const b = await (await api.post(form(await png()))).json();
  expect(a.items[0].foto_ref).not.toBe(b.items[0].foto_ref);
  const result = await (await fetch(api.base + '/api/items')).json();
  expect(result.groups).toHaveLength(1);
  expect(result.groups[0].total_units).toBe(6);
  expect(await readdir(join(directory!, 'items'))).toHaveLength(2);
});
test.each([{ quantitat: 0 }, { subcategoria_id: 99 }, { foto_ref: 'items/client.webp' }])('invalid data precedes decoding or storage: %j', async override => {
  const api = await start();
  const normalize = vi.spyOn(api.processor, 'normalize');
  const response = await api.post(form(await png(), { ...data, ...override }));
  expect(response.status).toBe(400);
  expect(normalize).not.toHaveBeenCalled();
  expect(api.repository.createAtomically).not.toHaveBeenCalled();
  expect(await readdir(directory!)).toEqual([]);
});
test.each(['duplicate-data', 'duplicate-photo', 'unknown', 'missing-photo', 'bad-json'])('rejects multipart %s', async scenario => {
  const api = await start();
  const body = form(await png());
  if (scenario === 'duplicate-data') body.append('data', JSON.stringify(data));
  if (scenario === 'duplicate-photo') body.append('photo', new Blob([await png()]), 'other.png');
  if (scenario === 'unknown') body.append('foto_ref', 'forbidden');
  if (scenario === 'missing-photo') body.delete('photo');
  if (scenario === 'bad-json') body.set('data', '{');
  expect((await api.post(body)).status).toBe(400);
  expect(api.repository.createAtomically).not.toHaveBeenCalled();
  expect(await readdir(directory!)).toEqual([]);
});
test('limits file size and field size with 413', async () => {
  const api = await start();
  expect((await api.post(form(new Uint8Array(10_000_001)))).status).toBe(413);
  const body = form(await png()); body.set('data', 'x'.repeat(16_385));
  expect((await api.post(body)).status).toBe(413);
  expect(api.repository.createAtomically).not.toHaveBeenCalled();
});
test('rejects unsupported real format and corrupted images', async () => {
  const api = await start();
  const tiff = await sharp(await png()).tiff().toBuffer();
  expect((await api.post(form(tiff))).status).toBe(415);
  expect((await api.post(form(Buffer.from('broken')))).status).toBe(400);
  expect(api.repository.createAtomically).not.toHaveBeenCalled();
});
test.each(['processor', 'storage'])('unexpected %s failure does not persist Items', async stage => {
  const api = await start();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  if (stage === 'processor') vi.spyOn(api.processor, 'normalize').mockRejectedValueOnce(Error('decoder unavailable'));
  else api.photos.storage = () => ({ save: async () => { throw Error('disk error'); }, removeIfUnreferenced: vi.fn() });
  expect((await api.post(form(await png()))).status).toBe(500);
  expect(api.repository.createAtomically).not.toHaveBeenCalled();
});
test.each(['rollback', 'commit-uncertain', 'check-uncertain'])('handles PostgreSQL failure with %s compensation policy', async mode => {
  const api = await start();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  api.repository.createAtomically.mockRejectedValueOnce(mode === 'commit-uncertain' ? new ItemPersistenceUncertainError(Error('lost acknowledgement')) : Error('SQL failure'));
  if (mode === 'check-uncertain') api.check.mockRejectedValueOnce(Error('check unavailable'));
  expect((await api.post(form(await png()))).status).toBe(500);
  const files = await readdir(join(directory!, 'items'));
  expect(files).toHaveLength(mode === 'rollback' ? 0 : 1);
  expect(api.reportIncident).toHaveBeenCalledTimes(mode === 'rollback' ? 0 : 1);
  if (mode === 'commit-uncertain') expect(api.check).not.toHaveBeenCalled();
});
test('photo endpoint rejects arbitrary paths and unreferenced UUIDs', async () => {
  const api = await start();
  for (const path of ['/api/item-photos/not-a-uuid', '/api/item-photos/12345678-1234-4123-8123-123456789abc', '/api/item-photos/%2e%2e%2fsecret']) {
    expect((await fetch(api.base + path)).status).toBe(404);
  }
  expect(await readdir(directory!)).toEqual([]);
});
test('admission is bounded before buffering and released after completion', async () => {
  const api = await start();
  const original = api.repository.createAtomically.getMockImplementation()!;
  let finish!: () => void;
  const blocked = new Promise<void>(resolve => { finish = resolve; });
  let entered = 0;
  api.repository.createAtomically.mockImplementation(async (...args) => { entered++; await blocked; return original(...args); });
  const first = api.post(form(await png())); const second = api.post(form(await png()));
  while (entered < 2) await new Promise(resolve => setTimeout(resolve, 5));
  expect((await api.post(form(await png()))).status).toBe(503);
  finish();
  expect((await first).status).toBe(201); expect((await second).status).toBe(201);
  expect((await api.post(form(await png()))).status).toBe(201);
});


test('referenced photo read failures return an HTTP error, never image bytes', async () => {
  const api = await start();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const created = await (await api.post(form(await png()))).json();
  const ref = created.items[0].foto_ref;
  api.check.mockRejectedValueOnce(Error('SQL read failed'));
  const response = await fetch(api.base + '/api/item-photos/' + ref.slice(6, -5));
  expect(response.status).toBe(500);
  expect((await response.json()).message).toBe('No s’ha pogut carregar la fotografia.');
});

test('accepts exactly 10 million bytes and rejects one byte more', async () => {
  const api = await start();
  const image = await png();
  const bytes = Buffer.concat([image, Buffer.alloc(10_000_000 - image.length)]);
  expect((await api.post(form(bytes))).status).toBe(201);
  expect((await api.post(form(Buffer.concat([bytes, Buffer.from([0])])))).status).toBe(413);
});
