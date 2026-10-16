import {WriteBarrier} from './write-barrier.js';
import express from 'express';
import type {Pool} from 'pg';
import {createApp} from './app.js';
import {createProductsRouter} from './products-router.js';
import {createProductItemsRouter} from './product-items-router.js';
import {createProductItemsReadRouter} from './product-items-read-router.js';
import {createProductPhotosRouter} from './product-photos-router.js';
import {productErrorHandler} from './product-error-handler.js';
import {PostgresProducts} from '../infrastructure/postgres-products.js';
import {PostgresClassificationCatalog} from '../infrastructure/postgres-classification-catalog.js';
import {PostgresHomeItemsRepository} from '../infrastructure/postgres-home-items-repository.js';
import {PostgresHomeItemsReader} from '../infrastructure/postgres-home-items-reader.js';
import {PostgresItemPhotoReferences} from '../infrastructure/postgres-item-photo-references.js';
import {PostgresProductPhotoReferences} from '../infrastructure/postgres-product-photo-references.js';
import {LocalItemPhotoStorage} from '../infrastructure/local-item-photo-storage.js';
import {SharpItemPhotoProcessor} from '../infrastructure/sharp-item-photo-processor.js';
import {validateProductPhotoRoot} from '../infrastructure/product-photo-root.js';
export type DataModel='legacy'|'products-v1';
export function selectDataModel(value?:string):DataModel{if(value===undefined||value==='legacy')return 'legacy';if(value==='products-v1')return value;throw Error('NESTLY_DATA_MODEL invàlid');}
export async function assertRuntimeModel(pool:Pool,model:DataModel){
 const state=(await pool.query("SELECT current_database() db,current_schema() schema,EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='producte') product_table,(SELECT is_nullable FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='item' AND column_name='producte_id') nullable")).rows[0];
 if(model==='legacy'){if(state.product_table||state.nullable!==null)throw Error('Legacy incompatible amb esquema de productes');}
 else{
  if(!state.product_table||state.nullable!=='NO')throw Error('Model de productes no activat');
  if(!(await pool.query("SELECT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE t.relnamespace=current_schema()::regnamespace AND t.relname='item' AND c.conname='fk_item_producte' AND c.contype='f' AND c.convalidated) present")).rows[0].present)throw Error('FK de producte absent');
  if((await pool.query('SELECT EXISTS(SELECT 1 FROM item i LEFT JOIN producte p ON p.id=i.producte_id WHERE p.id IS NULL) invalid')).rows[0].invalid)throw Error('Assignacions de producte invàlides');
 }
 return state;
}
/** Selecció exclusiva: no munta mai els dos jocs de routers. */
export async function createRuntimeApp(pool:Pool,selection?:string,photoRoot?:string,writeBarrier?:WriteBarrier){
 const model=selectDataModel(selection),state=await assertRuntimeModel(pool,model);
 const catalog=new PostgresClassificationCatalog(pool);
 const references=model==='legacy'?new PostgresItemPhotoReferences(pool):new PostgresProductPhotoReferences(pool);
 if(model==='products-v1'){if(!photoRoot)throw Error('Cal NESTLY_PHOTO_ROOT persistent');await validateProductPhotoRoot(photoRoot,state.db==='nestly_test');}
 const storage=()=>new LocalItemPhotoStorage(photoRoot!,ref=>references.hasReferences(ref));
 if(photoRoot)storage();
 const photos=photoRoot?{processor:new SharpItemPhotoProcessor(),storage,read:(ref:string)=>storage().readReferenced(ref),reportIncident:(_error:unknown)=>console.error('Incidència fotogràfica; cal revisar la persistència.')}:undefined;
 const app=express();
 const barrier=writeBarrier??new WriteBarrier(model==='legacy'?'open':'blocked');
 if(model==='products-v1')app.use(barrier.middleware);
 app.get('/api/runtime-model',(_req,res)=>{res.set('Cache-Control','no-store').json({model});});
 app.use('/api',async(req,res,next)=>{
  const declared=req.get('X-Nestly-Model'),write=!['GET','HEAD','OPTIONS'].includes(req.method);
  if(declared&&declared!==model||write&&model==='products-v1'&&declared!==model){res.status(409).json({code:'MODEL_MISMATCH',message:'La versió de l’aplicació ha canviat. Recarrega la pàgina abans de continuar.'});return;}
  if(write){try{await assertRuntimeModel(pool,model);}catch{res.status(503).json({code:'MODEL_UNAVAILABLE',message:'L’aplicació està en manteniment.'});return;}}
  next();
 });
 if(model==='legacy')app.use(createApp(catalog,{repository:new PostgresHomeItemsRepository(pool),reader:new PostgresHomeItemsReader(pool),photos}));
 else{
  const products=new PostgresProducts(pool);
  app.get('/',(_req,res)=>{res.json({status:'ok'});});
  app.get('/api/categories',async(_req,res)=>{res.json({categories:await catalog.read()});});
  app.use('/api/products',createProductsRouter(products));
  app.use('/api/items',createProductItemsRouter(catalog,{repository:products,reader:products,photos}));
  app.use('/api/items',createProductItemsReadRouter(catalog,products));
  app.use('/api/item-photos',createProductPhotosRouter(ref=>storage().readReferenced(ref)));
  app.use(productErrorHandler);
 }
 return app;
}
