import type { NormalizedItemPhoto } from '../application/item-photos.js';
import { createItemPhotosRouter } from './item-photos.js';
import { productErrorHandler } from './product-error-handler.js';

/** Injectar LocalItemPhotoStorage.readReferenced amb checker producte + legacy.
 * Cap root/path prové de la URL; reutilitza el validador UUID i les capçaleres existents. */
export function createProductPhotosRouter(read:(reference:string)=>Promise<NormalizedItemPhoto|null>){
  const router=createItemPhotosRouter({read});
  router.use(productErrorHandler);
  return router;
}
