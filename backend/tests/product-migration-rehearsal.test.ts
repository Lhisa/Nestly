import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import {expect,test} from 'vitest';
import {startMigrationRehearsal,planDigest} from './support/migration-rehearsal.js';
import {prepareConservativeProductPlan} from '../src/application/product-migration-plan.js';
import {PostgresProducts} from '../src/infrastructure/postgres-products.js';
import {PostgresClassificationCatalog} from '../src/infrastructure/postgres-classification-catalog.js';
import {getGroupedProductItems} from '../src/application/get-grouped-product-items.js';
import {createProductItems} from '../src/application/create-product-items.js';
import {LocalItemPhotoStorage} from '../src/infrastructure/local-item-photo-storage.js';
import {PostgresProductPhotoReferences} from '../src/infrastructure/postgres-product-photo-references.js';
import {SharpItemPhotoProcessor} from '../src/infrastructure/sharp-item-photo-processor.js';

const png=()=>sharp({create:{width:32,height:24,channels:3,background:'#b2bbaa'}}).png().toBuffer();

test('Via A: mapa explícit, negatives, activació atòmica i preservació de legacy i llistes',async()=>{
 const env=await startMigrationRehearsal();
 try{
  // Fotografies exclusivament sintètiques, abans del backfill.
  const bytes=await sharp(await png()).webp().toBuffer();
  const photoA=await new LocalItemPhotoStorage(env.root,async()=>true).save({format:'webp',bytes});
  const photoB=await new LocalItemPhotoStorage(env.root,async()=>true).save({format:'webp',bytes});
  await env.pool.query("INSERT INTO botiga(nom) VALUES ('Sintètica'); INSERT INTO llista_nado(nom,botiga_id) VALUES ('Sintètica',1)");
  await env.pool.query("INSERT INTO item(nom,subcategoria_id,foto_ref,estat_preparacio,data_entrada_casa) VALUES ('Duplicat',1,$1,'preparada','2026-01-01T00:00:00Z'),('Duplicat',1,$1,NULL,NULL),('Duplicat',1,$2,'no_preparada',NULL),('Duplicat',1,NULL,NULL,NULL),('Llista',2,NULL,NULL,NULL)",[photoA,photoB]);
  await env.pool.query("INSERT INTO item_llista(item_id,llista_id,estat_comanda,preu_total) VALUES (5,1,'demanat',1)");
  const original=(await env.pool.query('SELECT * FROM item ORDER BY id')).rows;
  const lists=(await env.pool.query('SELECT * FROM item_llista ORDER BY id')).rows;
  const source=await env.snapshot();
  const plan=prepareConservativeProductPlan(source,{database:'nestly_test',schema:env.schema});
  plan.products[0].item_ids=[1,2];plan.products.splice(1,1); // Única fusió explícitament decidida pel fixture.
  await env.prepare();
  await expect(env.activate()).rejects.toThrow('Assignacions absents');
  await expect(env.apply(plan,null)).rejects.toThrow('no aprovat');
  const incomplete=structuredClone(plan);incomplete.products.pop();
  await expect(env.apply(incomplete,planDigest(incomplete))).rejects.toThrow('sense assignar');
  const classification=structuredClone(plan);classification.products[0].subcategoria_id=2;
  await expect(env.apply(classification,planDigest(classification))).rejects.toThrow('Classificació incompatible');
  const foreign=structuredClone(plan);foreign.products[0].foto_ref='items/11111111-1111-4111-8111-111111111111.webp';
  await expect(env.apply(foreign,planDigest(foreign))).rejects.toThrow('fotografia original');
  const stale=structuredClone(plan);stale.source[0].nom='Snapshot antic';
  await expect(env.apply(stale,planDigest(stale))).rejects.toThrow('Snapshot obsolet');
  const edited=structuredClone(plan);edited.products[0].nom='Nom revisat';
  await expect(env.apply(edited,planDigest(plan))).rejects.toThrow('modificat');
  await expect(env.apply(plan,planDigest(plan),true)).rejects.toThrow('Fallada sintètica');
  expect((await env.pool.query('SELECT count(*)::int n FROM producte')).rows[0].n).toBe(0);
  expect((await env.pool.query('SELECT count(*)::int n FROM item WHERE producte_id IS NOT NULL')).rows[0].n).toBe(0);
  expect((await env.pool.query("SELECT is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name='item' AND column_name='producte_id'",[env.schema])).rows[0].is_nullable).toBe('YES');
  await env.apply(plan,planDigest(plan));
  const migrated=(await env.pool.query('SELECT * FROM item ORDER BY id')).rows;
  expect(migrated.map(({producte_id,...legacy})=>legacy)).toEqual(original);
  expect((await env.pool.query('SELECT * FROM item_llista ORDER BY id')).rows).toEqual(lists);
  expect(migrated[0].producte_id).toBe(migrated[1].producte_id);
  expect(new Set([migrated[0],migrated[2],migrated[3]].map(i=>i.producte_id)).size).toBe(3);
  const adapter=new PostgresProducts(env.pool);
  expect((await adapter.findById(5))?.producte_id).toBe(migrated[4].producte_id);
  expect(await adapter.findHomeById(5)).toBeNull();
  const inventory=await getGroupedProductItems([],adapter,new PostgresClassificationCatalog(env.pool));
  expect(inventory.inventory_count).toBe(4);expect(inventory.groups).toHaveLength(3);
  expect((await adapter.findById(2))?.foto_ref).toBe(photoA);
  expect((await adapter.findById(3))?.foto_ref).toBe(photoB);
  expect(await readFile(join(env.root,photoA))).toEqual(bytes);expect(await readFile(join(env.root,photoB))).toEqual(bytes);
  await expect(env.apply(plan,planDigest(plan))).rejects.toThrow('repetida');
  await expect(env.pool.query("INSERT INTO item(nom,subcategoria_id) VALUES ('Sense producte',1)")).rejects.toMatchObject({code:'23502'});
 }finally{await env.cleanup();}
},30000);

test('Via B: buidatge mínim sintètic, catàleg preservat, estructura activa i cicle de fotografia compartida',async()=>{
 const env=await startMigrationRehearsal();
 try{
  const catalogBefore=(await env.pool.query('SELECT * FROM categoria ORDER BY id')).rows;
  const subBefore=(await env.pool.query('SELECT * FROM subcategoria ORDER BY id')).rows;
  expect(catalogBefore).toHaveLength(8);expect(subBefore).toHaveLength(41);
  await env.pool.query("INSERT INTO item(nom,subcategoria_id) VALUES ('Fictici A',1),('Fictici B',1),('Fictici C',2)");
  // Assaig només: mateixa operació mínima proposada, mai executada sobre nestly_dev.
  const expected=await env.snapshot();
  await expect(env.initializeEmpty(expected.slice(1))).rejects.toThrow('Snapshot de buidatge obsolet');
  expect((await env.pool.query('SELECT count(*)::int n FROM item')).rows[0].n).toBe(3);
  await env.initializeEmpty(expected);
  expect((await env.pool.query('SELECT * FROM categoria ORDER BY id')).rows).toEqual(catalogBefore);
  expect((await env.pool.query('SELECT * FROM subcategoria ORDER BY id')).rows).toEqual(subBefore);
  expect((await env.pool.query('SELECT count(*)::int n FROM item')).rows[0].n).toBe(0);
  expect((await env.pool.query('SELECT count(*)::int n FROM producte')).rows[0].n).toBe(0);
  expect((await env.pool.query("SELECT is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name='item' AND column_name='producte_id'",[env.schema])).rows[0].is_nullable).toBe('NO');
  const constraints=(await env.pool.query("SELECT conname FROM pg_constraint WHERE connamespace=$1::regnamespace",[env.schema])).rows.map(r=>r.conname);
  expect(constraints).toContain('fk_item_producte');expect(constraints).toContain('producte_foto_versio_check');expect(constraints).toContain('producte_foto_ref_check');
  const adapter=new PostgresProducts(env.pool),catalog=new PostgresClassificationCatalog(env.pool);
  expect(await getGroupedProductItems([],adapter,catalog)).toMatchObject({inventory_count:0,groups:[]});
  const refs=new PostgresProductPhotoReferences(env.pool);
  const photos={processor:new SharpItemPhotoProcessor(),storage:()=>new LocalItemPhotoStorage(env.root,ref=>refs.hasReferences(ref)),reportIncident:(e:unknown)=>{throw e;}};
  const photo=await png();
  const units=await createProductItems({transport:'multipart',photo,data:{product:{mode:'new',nom:'Producte nou',categoria_id:1,subcategoria_id:1},quantitat:2,estat_preparacio:'preparada'}},catalog,adapter,adapter,photos);
  expect(units).toHaveLength(2);expect(units[0].id).toBeGreaterThan(3); // No es reinicien seqüències.
  const old=units[0].foto_ref!;expect(units.every(i=>i.foto_ref===old)).toBe(true);
  const data={product:{mode:'existing',producte_id:units[0].producte_id},quantitat:1,estat_preparacio:'no_preparada',photo_decision:{expected_version:0,replace_confirmed:true}};
  const replaced=await createProductItems({transport:'multipart',photo,data},catalog,adapter,adapter,photos);
  expect(replaced[0].foto_ref).not.toBe(old);
  await expect(createProductItems({transport:'multipart',photo,data},catalog,adapter,adapter,photos)).rejects.toMatchObject({code:'PHOTO_VERSION_CONFLICT'});
  expect((await adapter.findById(units[0].id))?.foto_ref).toBe(replaced[0].foto_ref);
  expect((await getGroupedProductItems([],adapter,catalog)).groups[0].total_units).toBe(3);
  expect((await readFile(join(env.root,old))).length).toBeGreaterThan(0);
  expect((await env.pool.query('SELECT count(*)::int n FROM item_llista l LEFT JOIN item i ON i.id=l.item_id WHERE i.id IS NULL')).rows[0].n).toBe(0);
 }finally{await env.cleanup();}
},30000);
