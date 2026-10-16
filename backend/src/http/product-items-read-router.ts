import express from 'express';
import type { ClassificationCatalogReader } from '../application/get-classification-catalog.js';
import type { ProductItemsReader } from '../application/product-persistence.js';
import { getGroupedProductItems } from '../application/get-grouped-product-items.js';
import { ProductInputError } from '../application/product-errors.js';
import { productErrorHandler } from './product-error-handler.js';

/** Lectures futures exclusivament; no registrades a l'aplicació activa. */
export function createProductItemsReadRouter(catalog:ClassificationCatalogReader,reader:ProductItemsReader){
  const router=express.Router();
  router.get('/',async(request,response)=>{
    const entries=new URL(request.originalUrl,'http://localhost').searchParams;
    response.json(await getGroupedProductItems(entries,reader,catalog));
  });
  router.get('/:id',async(request,response)=>{
    const raw=request.params.id,id=Number(raw);
    if(!/^[0-9]+$/.test(raw)||!Number.isInteger(id)||id<1||id>2147483647)throw new ProductInputError();
    const item=await reader.findHomeById(id);
    if(!item){response.status(404).json({code:'NOT_FOUND',message:'L’Item no existeix.'});return;}
    response.json({item});
  });
  router.use(productErrorHandler);
  return router;
}
