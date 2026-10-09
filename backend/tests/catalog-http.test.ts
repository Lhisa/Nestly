import type { Server } from 'node:http';
import { afterEach, expect, test, vi } from 'vitest';
import { createApp } from '../src/http/app.js';

let server: Server | undefined;
afterEach(async () => {
  vi.restoreAllMocks();
  if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
});

async function request(reader: Parameters<typeof createApp>[0]) {
  server = createApp(reader).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Adreça de test invàlida');
  return fetch(`http://127.0.0.1:${address.port}/api/categories`);
}

test('retorna el catàleg del lector i preserva la relació niada', async () => {
  const categories = [{ id: 3, nom: 'Roba', subcategories: [{ id: 8, nom: 'Bodies' }] }];
  const read = vi.fn().mockResolvedValue(categories);
  const response = await request({ read });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ categories });
  expect(read).toHaveBeenCalledOnce();
});

test('catàleg buit és una resposta 200 amb array buit', async () => {
  const response = await request({ read: async () => [] });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ categories: [] });
});

test('fallada de persistència és 500 estructurat sense detalls interns', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const response = await request({ read: async () => { throw new Error('SQL secret'); } });
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    code: 'INTERNAL_ERROR', message: 'No s’ha pogut carregar el catàleg de classificació.',
  });
});
