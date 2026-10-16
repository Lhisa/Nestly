import express from 'express';
import type { ClassificationCatalogReader } from '../application/get-classification-catalog.js';
import { createProductItems } from '../application/create-product-items.js';
import type { ProductCreationPhotos } from '../application/create-product-items.js';
import type { ProductItemsReader, ProductsRepository } from '../application/product-persistence.js';
import { acquirePhotoOperation, readCreationMultipart, PhotoHttpError } from './items-multipart.js';
import { ProductTransportError } from './product-http-errors.js';
import { productErrorHandler } from './product-error-handler.js';

export interface ProductItemsHttpDependencies {
  repository: ProductsRepository;
  reader: ProductItemsReader;
  photos?: ProductCreationPhotos;
}
/** Muntar a /api/items només en una aplicació de tests o després d'activació aprovada.
 * Cap importació des d'app.ts ni index.ts. Només prepara POST, no activa lectures. */
export function createProductItemsRouter(catalog:ClassificationCatalogReader,dependencies:ProductItemsHttpDependencies) {
  const router=express.Router();
  const json=express.json({limit:16_384});
  // El header determina el transport, inclús en un cos buit (que donarà 400).
  const mediaType=(request:express.Request)=>(request.get('Content-Type')??'').split(';',1)[0].trim().toLowerCase();
  router.post('/',(request,response,next)=>{
    const type=mediaType(request);
    if(type==='application/json')json(request,response,next);
    else if(type==='multipart/form-data')next();
    else next(new ProductTransportError());
  },async(request,response)=>{
    let items;
    if(mediaType(request)==='multipart/form-data'){
      if(!dependencies.photos)throw new PhotoHttpError(503,'PHOTO_STORAGE_NOT_CONFIGURED');
      const release=acquirePhotoOperation();
      try{
        const parsed=await readCreationMultipart(request,response);
        items=await createProductItems({transport:'multipart',data:parsed.data,photo:parsed.bytes},catalog,dependencies.reader,dependencies.repository,dependencies.photos);
      }finally{release();}
    }else{
      items=await createProductItems({transport:'json',data:request.body},catalog,dependencies.reader,dependencies.repository);
    }
    response.status(201).json({created_count:items.length,items});
  });
  router.use(productErrorHandler);
  return router;
}
