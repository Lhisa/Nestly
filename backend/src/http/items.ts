import express from 'express';
import type { ClassificationCatalogReader } from '../application/get-classification-catalog.js';
import { createHomeItems } from '../application/create-home-items.js';
import type { HomeItemsRepository } from '../application/create-home-items.js';
import { getHomeItem } from '../application/get-home-items.js';
import { getGroupedHomeItems } from '../application/get-grouped-home-items.js';
import type { GroupedHomeItemsReader } from '../application/get-grouped-home-items.js';
import type { HomeItemsReader } from '../application/get-home-items.js';
import { ItemValidationError } from '../domain/item.js';
import type { CreateHomeItemsInput } from '../domain/item.js';

export interface ItemsDependencies {
  repository: HomeItemsRepository;
  reader: HomeItemsReader & GroupedHomeItemsReader;
}

function parseCreation(body: unknown): CreateHomeItemsInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ItemValidationError({ body: 'Cal enviar un objecte JSON.' });
  }
  const values = body as Record<string, unknown>;
  const fields = { nom: 'string', categoria_id: 'number', subcategoria_id: 'number', quantitat: 'number', estat_preparacio: 'string' };
  const errors: Record<string, string> = Object.create(null);
  for (const key of Object.keys(values)) {
    if (!Object.hasOwn(fields, key)) errors[key] = 'Camp no admès.';
  }
  for (const [key, type] of Object.entries(fields)) {
    if (!Object.hasOwn(values, key) || typeof values[key] !== type) errors[key] = 'Camp obligatori amb tipus invàlid.';
  }
  if (Object.keys(errors).length) throw new ItemValidationError(errors);
  return values as unknown as CreateHomeItemsInput;
}

export function createItemsRouter(catalog: ClassificationCatalogReader, dependencies: ItemsDependencies) {
  const router = express.Router();
  router.use(express.json());
  router.post('/', async (request, response) => {
    const input = parseCreation(request.body);
    const items = await createHomeItems(input, catalog, dependencies.repository);
    response.status(201).json({ created_count: items.length, items });
  });
  router.get('/', async (request, response) => {
    const query = new URL(request.originalUrl, 'http://localhost').searchParams;
    response.json(await getGroupedHomeItems(query, dependencies.reader, catalog));
  });
  router.get('/:id', async (request, response) => {
    const raw = request.params.id;
    const id = Number(raw);
    if (!/^[0-9]+$/.test(raw) || !Number.isInteger(id) || id < 1 || id > 2147483647) {
      throw new ItemValidationError({ id: 'Cal un identificador enter positiu dins del rang INTEGER.' });
    }
    const item = await getHomeItem(id, dependencies.reader);
    if (!item) {
      response.status(404).json({ code: 'NOT_FOUND', message: 'L’Item no existeix.' });
      return;
    }
    response.json({ item });
  });
  return router;
}
