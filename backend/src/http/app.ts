import { PhotoHttpError } from './items-multipart.js';
import { PhotoProcessingError } from '../application/item-photos.js';
import { createItemPhotosRouter } from './item-photos.js';
import { createItemsRouter } from './items.js';
import type { ItemsDependencies } from './items.js';
import { ClassificationNotFoundError } from '../application/create-home-items.js';
import { ItemValidationError } from '../domain/item.js';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { getClassificationCatalog } from '../application/get-classification-catalog.js';
import type { ClassificationCatalogReader } from '../application/get-classification-catalog.js';

export function createApp(catalog: ClassificationCatalogReader, items?: ItemsDependencies) {
  const app = express();

  app.get('/', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/categories', async (_request, response) => {
    response.json({ categories: await getClassificationCatalog(catalog) });
  });

  if (items) app.use('/api/items', createItemsRouter(catalog, items));
  if (items?.photos) app.use('/api/item-photos', createItemPhotosRouter(items.photos));

  const handleError: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    if (error instanceof PhotoHttpError || error instanceof PhotoProcessingError) {
      const status = error instanceof PhotoHttpError ? error.status : error.code === 'SIZE' ? 413 : error.code === 'FORMAT' ? 415 : error.code === 'BUSY' ? 503 : 400;
      response.status(status).json({ code: status === 400 ? 'VALIDATION_ERROR' : status === 413 ? 'PHOTO_TOO_LARGE' : status === 415 ? 'UNSUPPORTED_PHOTO' : 'PHOTO_UNAVAILABLE',
        message: 'No s’ha pogut processar la fotografia.', fieldErrors: { photo: 'Fotografia invàlida o servei no disponible.' } });
      return;
    }
    if (error instanceof ItemValidationError || error instanceof ClassificationNotFoundError) {
      const fieldErrors = error instanceof ItemValidationError ? error.fieldErrors : { [error.field]: error.message };
      response.status(400).json({ code: 'VALIDATION_ERROR', message: 'Hi ha camps invàlids', fieldErrors });
      return;
    }
    if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: 'Hi ha camps invàlids', fieldErrors: { body: 'JSON invàlid.' } });
      return;
    }
    console.error('Error inesperat del backend:', error);
    response.status(500).json({
      code: 'INTERNAL_ERROR',
      message: _request.path.startsWith('/api/item-photos') ? 'No s’ha pogut carregar la fotografia.' : _request.path.startsWith('/api/items') ? 'No s’ha pogut completar l’operació amb Items.' : 'No s’ha pogut carregar el catàleg de classificació.',
    });
  };
  app.use(handleError);
  return app;
}
