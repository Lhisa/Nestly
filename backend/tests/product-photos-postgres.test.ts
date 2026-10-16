import {randomUUID} from 'node:crypto';
import {readFile,mkdtemp,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,basename} from 'node:path';
import {Pool} from 'pg';
import sharp from 'sharp';
import {expect,test} from 'vitest';
import {createProductItems} from '../src/application/create-product-items.js';
import {ProductPhotoConflictError} from '../src/application/product-persistence.js';
import type {ProductItemsCreationRequest,PhotoReplacementDecision} from '../src/application/product-contracts.js';
import {PostgresProducts} from '../src/infrastructure/postgres-products.js';
import {PostgresClassificationCatalog} from '../src/infrastructure/postgres-classification-catalog.js';
import {PostgresProductPhotoReferences} from '../src/infrastructure/postgres-product-photo-references.js';
import {SharpItemPhotoProcessor} from '../src/infrastructure/sharp-item-photo-processor.js';
import {LocalItemPhotoStorage} from '../src/infrastructure/local-item-photo-storage.js';

test('Productes i fotografies PostgreSQL: herència, confirmació, versions, concurrència i compensació',async()=>{
  const connectionString=process.env.NESTLY_ITEMS_TEST_DATABASE_URL;
  if(!connectionString||new URL(connectionString).pathname!=='/nestly_test')throw Error('Cal nestly_test explícit.');
  const admin=new Pool({connectionString,connectionTimeoutMillis:3000});
  const schema='product_photos_'+randomUUID().replaceAll('-','');
  let created=false,pool:Pool|undefined,directory:string|undefined;
  try{
    expect((await admin.query('SELECT current_database() d')).rows[0].d).toBe('nestly_test');
    await admin.query('CREATE SCHEMA '+schema);created=true;
    pool=new Pool({connectionString,options:'-c search_path='+schema,connectionTimeoutMillis:3000});
    expect((await pool.query('SELECT current_schema() s')).rows[0].s).toBe(schema);
    await pool.query(await readFile(new URL('../migrations/001_create_initial_schema.sql',import.meta.url),'utf8'));
    const c=await pool.connect();
    try{await c.query("SELECT set_config('nestly.migration_database','nestly_test',false),set_config('nestly.migration_schema',$1,false)",[schema]);await c.query(await readFile(new URL('../planned-migrations/productes/003_prepare_products.sql',import.meta.url),'utf8'));}
    catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
    await pool.query("INSERT INTO categoria(nom) VALUES ('Roba'); INSERT INTO subcategoria(nom,categoria_id) VALUES ('Bodies',1)");
    directory=await mkdtemp(join(tmpdir(),'nestly-product-photos-'));
    const repository=new PostgresProducts(pool),catalog=new PostgresClassificationCatalog(pool),refs=new PostgresProductPhotoReferences(pool);
    const processor=new SharpItemPhotoProcessor();
    const incidents:unknown[]=[];
    const photos={processor,storage:()=>new LocalItemPhotoStorage(directory!,r=>refs.hasReferences(r)),reportIncident:(e:unknown)=>{incidents.push(e);}};
    const bytes=await sharp({create:{width:32,height:24,channels:3,background:'#aabbcc'}}).png().toBuffer();
    const fresh=(nom:string,photo=false):ProductItemsCreationRequest=>photo?{transport:'multipart',data:{product:{mode:'new',nom,categoria_id:1,subcategoria_id:1},quantitat:2,estat_preparacio:'preparada'},photo:bytes}:{transport:'json',data:{product:{mode:'new',nom,categoria_id:1,subcategoria_id:1},quantitat:2,estat_preparacio:'preparada'}};
    const existing=(id:number,decision?:PhotoReplacementDecision):ProductItemsCreationRequest=>decision?{transport:'multipart',data:{product:{mode:'existing',producte_id:id},quantitat:1,estat_preparacio:'preparada',photo_decision:decision},photo:bytes}:{transport:'json',data:{product:{mode:'existing',producte_id:id},quantitat:1,estat_preparacio:'preparada'}};
    const run=(req:ProductItemsCreationRequest)=>createProductItems(req,catalog,repository,repository,photos);
    const files=()=>readdir(join(directory!,'items'));
    const a=await run(fresh('Body',true)),id=a[0].producte_id,old=a[0].foto_ref!;
    expect(a).toHaveLength(2);expect(a.every(i=>i.foto_ref===old)).toBe(true);
    expect((await run(existing(id)))[0].foto_ref).toBe(old);
    await pool.query("INSERT INTO botiga(nom) VALUES ('Synthetic'); INSERT INTO llista_nado(nom,botiga_id) VALUES ('Synthetic',1)");
    await pool.query("INSERT INTO item_llista(item_id,llista_id,estat_comanda,preu_total) VALUES ($1,1,'demanat',1)",[a[0].id]);
    await expect(run(existing(id,{expected_version:0,replace_confirmed:false}))).rejects.toMatchObject({code:'PHOTO_CONFIRMATION_REQUIRED',product:{id,foto_ref:old,foto_versio:0}});
    expect(await files()).toHaveLength(1);
    const replaced=await run(existing(id,{expected_version:0,replace_confirmed:true}));
    const replacement=replaced[0].foto_ref!;
    expect(replacement).not.toBe(old);
    expect(await repository.findProductById(id)).toMatchObject({foto_ref:replacement,foto_versio:1});
    expect(await repository.findById(a[0].id)).toMatchObject({foto_ref:replacement});
    expect(await files()).toContain(old.slice(6)); // La fotografia antiga mai s'elimina.
    await expect(run(existing(id,{expected_version:0,replace_confirmed:true}))).rejects.toMatchObject({code:'PHOTO_VERSION_CONFLICT'});
    // Checker combinat: l'antiga fotografia encara referenciada només a legacy es conserva.
    expect(await refs.hasReferences(old)).toBe(true);
    await pool.query('UPDATE item SET foto_ref=NULL WHERE producte_id=$1',[id]);
    expect(await refs.hasReferences(old)).toBe(false);
    expect(await refs.hasReferences(replacement)).toBe(true);
    // Ni tan sols una instància diferent pot eliminar una foto aliena.
    await expect(photos.storage().removeIfUnreferenced(old)).rejects.toThrow('not generated');
    const bare=await run(fresh('Sense foto')),bareId=bare[0].producte_id;
    expect(bare.every(i=>i.foto_ref===null)).toBe(true);
    // Les dues lectures prèvies observen versió 0; barrera abans de normalitzar, sense bloquejos DB.
    const ready=Promise.withResolvers<void>();let normalized=0;
    const concurrentPhotos={...photos,processor:{normalize:async(input:Uint8Array)=>{
      if(++normalized===2)ready.resolve();await ready.promise;return processor.normalize(input);
    }}};
    const request=existing(bareId,{expected_version:0,replace_confirmed:false});
    const before=(await files()).length;
    const results=await Promise.allSettled([createProductItems(request,catalog,repository,repository,concurrentPhotos),createProductItems(request,catalog,repository,repository,concurrentPhotos)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const failed=results.find(r=>r.status==='rejected') as PromiseRejectedResult;
    expect(failed.reason).toBeInstanceOf(ProductPhotoConflictError);expect(failed.reason.code).toBe('PHOTO_VERSION_CONFLICT');
    expect((await files()).length).toBe(before+1); // Fitxer de l'operació perdedora compensat.
    const shared=await repository.findProductById(bareId);
    expect(shared?.foto_versio).toBe(1);
    for(const unit of bare)expect((await repository.findById(unit.id))?.foto_ref).toBe(shared?.foto_ref);
    expect((await pool.query('SELECT count(*)::int n FROM item WHERE producte_id=$1',[bareId])).rows[0].n).toBe(3);
    // Fallada després de canviar producte però abans de completar les unitats: tot reverteix.
    await pool.query(`CREATE FUNCTION reject_photo_units() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.producte_id=${bareId} OR NEW.nom='Fallada' THEN RAISE EXCEPTION 'synthetic failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_photo_units BEFORE INSERT ON item FOR EACH ROW EXECUTE FUNCTION reject_photo_units()`);
    const beforeFailure=(await files()).length;
    await expect(run(existing(bareId,{expected_version:1,replace_confirmed:true}))).rejects.toThrow();
    expect(await repository.findProductById(bareId)).toMatchObject({foto_ref:shared?.foto_ref,foto_versio:1});
    expect(await files()).toHaveLength(beforeFailure);
    await expect(run(fresh('Fallada',true))).rejects.toThrow();
    expect((await pool.query("SELECT count(*)::int n FROM producte WHERE nom='Fallada'")).rows[0].n).toBe(0);
    expect(await files()).toHaveLength(beforeFailure);
    expect(incidents).toEqual([]);
    // Si el checker no pot confirmar absència de referències, el fitxer nou es conserva.
    const uncertainPhotos={...photos,storage:()=>new LocalItemPhotoStorage(directory!,async()=>{throw Error('Synthetic SQL reference uncertainty');})};
    await expect(createProductItems(fresh('Fallada',true),catalog,repository,repository,uncertainPhotos)).rejects.toThrow('synthetic failure');
    expect(await files()).toHaveLength(beforeFailure+1);
    expect(incidents).toHaveLength(1);
    expect((incidents[0] as Error).message).toBe('Synthetic SQL reference uncertainty');
  }finally{
    try{await pool?.end();}finally{
      try{if(created)await admin.query('DROP SCHEMA '+schema+' CASCADE');}finally{
        await admin.end();
        if(directory){if(dirname(resolve(directory))!==resolve(tmpdir())||!basename(directory).startsWith('nestly-product-photos-'))throw Error('Unsafe cleanup');await rm(directory,{recursive:true,force:true});}
      }
    }
  }
},20000);

test('dues substitucions confirmades concurrents: un lot complet, un conflicte i fotografia anterior conservada',async()=>{
  const connectionString=process.env.NESTLY_ITEMS_TEST_DATABASE_URL;
  if(!connectionString||new URL(connectionString).pathname!=='/nestly_test')throw Error('Cal nestly_test explícit.');
  const admin=new Pool({connectionString,connectionTimeoutMillis:3000});
  const schema='product_replace_'+randomUUID().replaceAll('-','');
  let created=false,pool:Pool|undefined,directory:string|undefined;
  try{
    expect((await admin.query('SELECT current_database() d')).rows[0].d).toBe('nestly_test');
    await admin.query('CREATE SCHEMA '+schema);created=true;
    pool=new Pool({connectionString,options:'-c search_path='+schema,connectionTimeoutMillis:3000});
    expect((await pool.query('SELECT current_schema() s')).rows[0].s).toBe(schema);
    await pool.query(await readFile(new URL('../migrations/001_create_initial_schema.sql',import.meta.url),'utf8'));
    const c=await pool.connect();
    try{await c.query("SELECT set_config('nestly.migration_database','nestly_test',false),set_config('nestly.migration_schema',$1,false)",[schema]);await c.query(await readFile(new URL('../planned-migrations/productes/003_prepare_products.sql',import.meta.url),'utf8'));}
    catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
    await pool.query("INSERT INTO categoria(nom) VALUES ('Roba'); INSERT INTO subcategoria(nom,categoria_id) VALUES ('Bodies',1)");
    directory=await mkdtemp(join(tmpdir(),'nestly-product-photos-'));
    const repository=new PostgresProducts(pool),catalog=new PostgresClassificationCatalog(pool),checker=new PostgresProductPhotoReferences(pool);
    const processor=new SharpItemPhotoProcessor();
    const incidents:unknown[]=[];
    const photos={processor,storage:()=>new LocalItemPhotoStorage(directory!,r=>checker.hasReferences(r)),reportIncident:(e:unknown)=>{incidents.push(e);}};
    const bytes=await sharp({create:{width:24,height:24,channels:3,background:'#bbccdd'}}).png().toBuffer();
    const initial=await createProductItems({transport:'multipart',data:{product:{mode:'new',nom:'Body',categoria_id:1,subcategoria_id:1},quantitat:2,estat_preparacio:'preparada'},photo:bytes},catalog,repository,repository,photos);
    const id=initial[0].producte_id,previous=initial[0].foto_ref!;
    const originalBytes=await readFile(join(directory,previous));
    const ready=Promise.withResolvers<void>();let arrivals=0;
    const concurrent={...photos,processor:{normalize:async(input:Uint8Array)=>{if(++arrivals===2)ready.resolve();await ready.promise;return processor.normalize(input);}}};
    const request:ProductItemsCreationRequest={transport:'multipart',data:{product:{mode:'existing',producte_id:id},quantitat:3,estat_preparacio:'no_preparada',photo_decision:{expected_version:0,replace_confirmed:true}},photo:bytes};
    const outcomes=await Promise.allSettled([createProductItems(request,catalog,repository,repository,concurrent),createProductItems(request,catalog,repository,repository,concurrent)]);
    const success=outcomes.filter(o=>o.status==='fulfilled');
    expect(success).toHaveLength(1);expect(success[0].value).toHaveLength(3);
    const failure=outcomes.find(o=>o.status==='rejected') as PromiseRejectedResult;
    expect(failure.reason).toBeInstanceOf(ProductPhotoConflictError);expect(failure.reason.code).toBe('PHOTO_VERSION_CONFLICT');
    const current=await repository.findProductById(id);
    expect(current?.foto_versio).toBe(1);expect(current?.foto_ref).not.toBe(previous);
    expect((await pool.query('SELECT count(*)::int n FROM item WHERE producte_id=$1',[id])).rows[0].n).toBe(5);
    expect(await readFile(join(directory,previous))).toEqual(originalBytes);
    expect(await readdir(join(directory,'items'))).toHaveLength(2);
    for(const item of initial)expect((await repository.findById(item.id))?.foto_ref).toBe(current?.foto_ref);
    expect(incidents).toEqual([]);
  }finally{
    try{await pool?.end();}finally{try{if(created)await admin.query('DROP SCHEMA '+schema+' CASCADE');}finally{
      await admin.end();if(directory){if(dirname(resolve(directory))!==resolve(tmpdir())||!basename(directory).startsWith('nestly-product-photos-'))throw Error('Unsafe cleanup');await rm(directory,{recursive:true,force:true});}
    }}
  }
},20000);
