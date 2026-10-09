import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { getClassificationCatalog } from '../application/get-classification-catalog.js';
import type { ClassificationCatalogReader } from '../application/get-classification-catalog.js';

export function createApp(catalog: ClassificationCatalogReader) {
  const app = express();

  app.get('/', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/categories', async (_request, response) => {
    response.json({ categories: await getClassificationCatalog(catalog) });
  });

  const handleError: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    console.error('Error consultant el catàleg de classificació:', error);
    response.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'No s’ha pogut carregar el catàleg de classificació.',
    });
  };
  app.use(handleError);
  return app;
}
