import express from 'express';
import type { ItemsPhotoDependencies } from './items.js';

export function createItemPhotosRouter(photos: Pick<ItemsPhotoDependencies, 'read'>) {
  const router = express.Router();
  router.get('/:id', async (request, response) => {
    const id = request.params.id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) {
      response.sendStatus(404); return;
    }
    const photo = await photos.read('items/' + id + '.webp');
    if (!photo) { response.sendStatus(404); return; }
    response.set({ 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' });
    response.send(Buffer.from(photo.bytes));
  });
  return router;
}
