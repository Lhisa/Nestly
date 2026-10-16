import express from 'express';
import type { ProductItemsReader } from '../application/product-persistence.js';
import { productErrorHandler } from './product-error-handler.js';

/** Catàleg explícit sense deduplicació; no registrat a l'aplicació activa. */
export function createProductsRouter(reader:Pick<ProductItemsReader,'listSelectableProducts'>){
  const router=express.Router();
  router.get('/',async(_request,response)=>{
    response.json({products:await reader.listSelectableProducts()});
  });
  router.use(productErrorHandler);
  return router;
}
