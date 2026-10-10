import type { Server } from 'node:http';
import { afterEach, expect, test, vi } from 'vitest';
import { createApp } from '../src/http/app.js';
import type { CreateHomeItemsInput, Item } from '../src/domain/item.js';

let server: Server | undefined;
afterEach(async () => {
  vi.restoreAllMocks();
  if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
});
const body = { nom: ' Body blau ', categoria_id: 1, subcategoria_id: 2, quantitat: 1, estat_preparacio: 'no_preparada' };
const item: Item = { id: 27, nom: 'Body blau', subcategoria_id: 2, estat_preparacio: 'no_preparada', foto_ref: null, data_entrada_casa: null, data_creacio: new Date('2026-10-10T15:00:00Z') };
const jsonItem = { ...item, data_creacio: '2026-10-10T15:00:00.000Z' };
function dependencies() {
  return {
    repository: { createAtomically: vi.fn(async (input: CreateHomeItemsInput) => Array.from({ length: input.quantitat }, (_, index) => ({ ...item, id: 27 + index, nom: input.nom, estat_preparacio: input.estat_preparacio }))) },
    reader: { list: vi.fn(async () => [item]), findById: vi.fn(async (_id: number): Promise<Item | null> => item) },
  };
}
async function start(deps = dependencies()) {
  const catalog = { read: vi.fn(async () => [
    { id: 1, nom: 'Roba', subcategories: [{ id: 2, nom: 'Bodies' }] },
    { id: 3, nom: 'Altres', subcategories: [{ id: 4, nom: 'Altres' }] },
  ]) };
  server = createApp(catalog, deps).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Adreça invàlida');
  const url = `http://127.0.0.1:${address.port}/api/items`;
  return { deps, catalog, get: (path = '') => fetch(url + path), post: (value: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }), url };
}
test.each([1, 3, 100])('POST crea %s unitats i serialitza dates UTC', async (quantitat) => {
  const { post, deps } = await start();
  const response = await post({ ...body, quantitat, estat_preparacio: 'preparada' });
  expect(response.status).toBe(201);
  const result = await response.json();
  expect(result.created_count).toBe(quantitat);
  expect(result.items).toHaveLength(quantitat);
  expect(new Set(result.items.map((entry: Item) => entry.id)).size).toBe(quantitat);
  expect(result.items[0]).toEqual({ ...jsonItem, estat_preparacio: 'preparada' });
  expect(result.items.every((entry: Item) => !('quantitat' in entry))).toBe(true);
  expect(deps.repository.createAtomically).toHaveBeenCalledOnce();
});
test.each([
  { quantitat: 0 }, { quantitat: 101 }, { quantitat: 1.5 }, { quantitat: '3' }, { quantitat: null },
  { nom: '123!' }, { nom: 'a'.repeat(101) }, { nom: 42 },
  { estat_preparacio: 'preparat' }, { estat_preparacio: null },
  { categoria_id: 99 }, { subcategoria_id: 99 }, { subcategoria_id: 4 },
  { categoria_id: '1' }, { foto_ref: 'forbidden' }, { id: 8 }, JSON.parse('{"__proto__":"forbidden"}'),
])('POST rebutja entrada invàlida sense crear', async (override) => {
  const { post, deps } = await start();
  const response = await post({ ...body, ...override });
  expect(response.status).toBe(400);
  const result = await response.json();
  expect(result.code).toBe('VALIDATION_ERROR');
  expect(result.message).toBe('Hi ha camps invàlids');
  expect(Object.keys(result.fieldErrors).length).toBeGreaterThan(0);
  expect(deps.repository.createAtomically).not.toHaveBeenCalled();
});
test.each(Object.keys(body))('POST exigeix %s sense defaults', async (key) => {
  const { post, deps } = await start();
  const incomplete = { ...body } as Record<string, unknown>;
  delete incomplete[key];
  const response = await post(incomplete);
  expect(response.status).toBe(400);
  expect((await response.json()).fieldErrors).toHaveProperty(key);
  expect(deps.repository.createAtomically).not.toHaveBeenCalled();
});
test.each([null, [], 'text', 5])('POST exigeix objecte JSON', async (value) => {
  const { post } = await start();
  expect((await post(value)).status).toBe(400);
});
test('JSON malformat retorna validació estructurada', async () => {
  const { url } = await start();
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  expect(response.status).toBe(400);
  expect((await response.json()).code).toBe('VALIDATION_ERROR');
});
test('GET llista amb dades i buit', async () => {
  const { get, deps } = await start();
  expect(await (await get()).json()).toEqual({ items: [jsonItem] });
  deps.reader.list.mockResolvedValueOnce([]);
  const response = await get();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ items: [] });
});
test('GET rebutja paràmetres de consulta', async () => {
  const { get, deps } = await start();
  expect((await get('?categoria_id=1')).status).toBe(400);
  expect(deps.reader.list).not.toHaveBeenCalled();
});
test('GET per ID retorna Item i 404 quan no existeix', async () => {
  const { get, deps } = await start();
  const response = await get('/27');
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ item: jsonItem });
  expect(deps.reader.findById).toHaveBeenCalledWith(27);
  deps.reader.findById.mockResolvedValueOnce(null);
  const missing = await get('/28');
  expect(missing.status).toBe(404);
  expect((await missing.json()).code).toBe('NOT_FOUND');
});
test.each(['0', '-1', '1.5', 'abc', '2147483648', '1e2', '1x', '999999999999999999999'])('GET rebutja ID %s', async (id) => {
  const { get, deps } = await start();
  const response = await get('/' + id);
  expect(response.status).toBe(400);
  expect((await response.json()).fieldErrors).toHaveProperty('id');
  expect(deps.reader.findById).not.toHaveBeenCalled();
});
test('GET accepta límit INTEGER', async () => {
  const { get, deps } = await start();
  expect((await get('/2147483647')).status).toBe(200);
  expect(deps.reader.findById).toHaveBeenCalledWith(2147483647);
});
test.each(['post', 'list', 'detail', 'catalog'])('error intern %s no filtra detalls', async (operation) => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { post, get, deps, catalog } = await start();
  const error = new Error('SQL secret password stack');
  if (operation === 'post') deps.repository.createAtomically.mockRejectedValueOnce(error);
  if (operation === 'list') deps.reader.list.mockRejectedValueOnce(error);
  if (operation === 'detail') deps.reader.findById.mockRejectedValueOnce(error);
  if (operation === 'catalog') catalog.read.mockRejectedValueOnce(error);
  const response = operation === 'post' || operation === 'catalog' ? await post(body) : await get(operation === 'detail' ? '/27' : '');
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ code: 'INTERNAL_ERROR', message: 'No s’ha pogut completar l’operació amb Items.' });
});
test('POST espera la persistència completa abans de respondre 201', async () => {
  const deps = dependencies();
  let finish!: (items: Item[]) => void;
  const persisted = new Promise<Item[]>((resolve) => { finish = resolve; });
  let entered!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  deps.repository.createAtomically.mockImplementationOnce(async () => { entered(); return persisted; });
  const { post } = await start(deps);
  let answered = false;
  const responsePromise = post(body).then((response) => { answered = true; return response; });
  await started;
  expect(answered).toBe(false);
  finish([item]);
  expect((await responsePromise).status).toBe(201);
});
