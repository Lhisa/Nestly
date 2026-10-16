import {randomUUID} from 'node:crypto';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join,dirname,resolve,basename} from 'node:path';
import {tmpdir} from 'node:os';
import type {Server} from 'node:http';
import express from 'express';
import {Pool} from 'pg';
import {PostgresProducts} from '../../src/infrastructure/postgres-products.js';
import {PostgresClassificationCatalog} from '../../src/infrastructure/postgres-classification-catalog.js';
import {PostgresProductPhotoReferences} from '../../src/infrastructure/postgres-product-photo-references.js';
import {LocalProductPhotoReader} from '../../src/infrastructure/local-product-photo-reader.js';
import {LocalItemPhotoStorage} from '../../src/infrastructure/local-item-photo-storage.js';
import {SharpItemPhotoProcessor} from '../../src/infrastructure/sharp-item-photo-processor.js';
import {ProductPersistenceUncertainError} from '../../src/application/product-persistence.js';
import {createProductItemsRouter} from '../../src/http/product-items-router.js';
import {createProductItemsReadRouter} from '../../src/http/product-items-read-router.js';
import {createProductsRouter} from '../../src/http/products-router.js';
import {createProductPhotosRouter} from '../../src/http/product-photos-router.js';

/** Composició exclusiva de proves, sense imports des del composition root actiu. */
export async function startProductRehearsal(connectionString:string,port=0){
 if(new URL(connectionString).pathname!=='/nestly_test')throw Error('Assaig exclusiu de nestly_test.');
 const admin=new Pool({connectionString,connectionTimeoutMillis:3000});
 const schema='integrated_products_'+randomUUID().replaceAll('-','');
 let created=false,pool:Pool|undefined,root:string|undefined,server:Server|undefined;
 let nextFault:'none'|'uncertain'='none';
 const incidents:unknown[]=[];
 const cleanup=async()=>{
   try{if(server)await new Promise<void>((r,j)=>server!.close(e=>e?j(e):r()));}
   finally{try{await pool?.end();}finally{try{if(created)await admin.query('DROP SCHEMA '+schema+' CASCADE');}finally{
     await admin.end();if(root){if(dirname(resolve(root))!==resolve(tmpdir())||!basename(root).startsWith('nestly-products-integrated-'))throw Error('Unsafe cleanup');await rm(root,{recursive:true,force:true});}
   }}}
 };
 try{
   if((await admin.query('SELECT current_database() d')).rows[0].d!=='nestly_test')throw Error('Wrong database');
   await admin.query('CREATE SCHEMA '+schema);created=true;
   pool=new Pool({connectionString,options:'-c search_path='+schema,connectionTimeoutMillis:3000});
   if((await pool.query('SELECT current_schema() s')).rows[0].s!==schema)throw Error('Wrong schema');
   await pool.query(await readFile(new URL('../../migrations/001_create_initial_schema.sql',import.meta.url),'utf8'));
   const client=await pool.connect();
   try{await client.query("SELECT set_config('nestly.migration_database','nestly_test',false),set_config('nestly.migration_schema',$1,false)",[schema]);await client.query(await readFile(new URL('../../planned-migrations/productes/003_prepare_products.sql',import.meta.url),'utf8'));}
   catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
   await pool.query("INSERT INTO categoria(nom) VALUES ('Roba'),('Descans'); INSERT INTO subcategoria(nom,categoria_id) VALUES ('Bodies',1),('Mantes',2); INSERT INTO botiga(nom) VALUES ('Botiga sintètica'); INSERT INTO llista_nado(nom,botiga_id) VALUES ('Llista sintètica',1)");
   // Fallada a la segona unitat: només afecta dades sintètiques d'aquest esquema.
   await pool.query("CREATE SEQUENCE failure_counter; CREATE FUNCTION fail_synthetic_batch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.nom='Assaig fallida' AND nextval('failure_counter')=2 THEN RAISE EXCEPTION 'Synthetic SQL failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_synthetic_batch BEFORE INSERT ON item FOR EACH ROW EXECUTE FUNCTION fail_synthetic_batch()");
   root=await mkdtemp(join(tmpdir(),'nestly-products-integrated-'));
   const products=new PostgresProducts(pool),catalog=new PostgresClassificationCatalog(pool),refs=new PostgresProductPhotoReferences(pool);
   const storage=()=>new LocalItemPhotoStorage(root!,ref=>refs.hasReferences(ref));
   const photos=new LocalProductPhotoReader(root,pool);
   const app=express();
   // Compta POSTs i injecta únicament pèrdua d'ACK després d'un COMMIT real.
   let postCount=0;
   app.use('/api/items',(req,_res,next)=>{if(req.method==='POST')postCount++;next();});
   app.post('/__test/fault',express.json(),(req,res)=>{if(req.body?.mode!=='none'&&req.body?.mode!=='uncertain'){res.sendStatus(400);return;}nextFault=req.body.mode;res.json({ok:true});});
   app.get('/__test/state',(_req,res)=>res.json({database:'nestly_test',schema,postCount}));
   app.get('/api/categories',async(_req,res)=>res.json({categories:await catalog.read()}));
   app.use('/api/products',createProductsRouter(products));
   app.use('/api/items',createProductItemsRouter(catalog,{reader:products,repository:{createBatchAtomically:async input=>{
     const fault=nextFault;nextFault='none';const units=await products.createBatchAtomically(input);
     if(fault==='uncertain')throw new ProductPersistenceUncertainError(Error('Synthetic lost COMMIT acknowledgement'));
     return units;
   }},photos:{processor:new SharpItemPhotoProcessor(),storage,reportIncident:e=>{incidents.push(e);}}}));
   app.use('/api/items',createProductItemsReadRouter(catalog,products));
   app.use('/api/item-photos',createProductPhotosRouter(ref=>photos.readReferenced(ref)));
   server=app.listen(port,'127.0.0.1');
   await new Promise<void>((r,j)=>{server!.once('listening',r);server!.once('error',j);});
   const address=server.address();if(!address||typeof address==='string')throw Error('address');
   return {app,base:'http://127.0.0.1:'+address.port,pool,root,schema,products,storage,incidents,cleanup};
 }catch(error){await cleanup();throw error;}
}
