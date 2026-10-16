import {WriteBarrier} from '../src/http/write-barrier.js';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {Server} from 'node:http';
import {expect,test} from 'vitest';
import type {Pool} from 'pg';
import sharp from 'sharp';
import {startMigrationRehearsal} from './support/migration-rehearsal.js';
import {prepareActivationBackup} from './support/activation-backup.js';
import {activateEmptyProducts} from '../src/operations/activate-empty-products.js';
import {activationInventory} from '../src/operations/activation-inventory.js';
import {createRuntimeApp} from '../src/http/runtime-app.js';

test('executor Via B + composició exclusiva: backup restaurat, prevalidació, negatives, rollback i HTTP complet',async()=>{
 const env=await startMigrationRehearsal();const servers:Server[]=[];
 const serve=async(app:Awaited<ReturnType<typeof createRuntimeApp>>)=>{const s=app.listen(0,'127.0.0.1');servers.push(s);await new Promise<void>((r,j)=>{s.once('listening',r);s.once('error',j);});const a=s.address();if(!a||typeof a==='string')throw Error();return 'http://127.0.0.1:'+a.port;};
 const inventory=async()=>{const c=await env.pool.connect();try{return await activationInventory(c,env.schema);}finally{c.release();}};
 try{
  await env.pool.query("CREATE TABLE pgmigrations(id serial PRIMARY KEY,name varchar(255) NOT NULL,run_on timestamp NOT NULL); INSERT INTO pgmigrations(name,run_on) VALUES ('001', '2026-01-01'),('002','2026-01-01')");
  await env.pool.query("INSERT INTO item(nom,subcategoria_id) VALUES ('Fictici A',1),('Fictici B',1),('Fictici C',2)");
  const before=await inventory();const proof=await prepareActivationBackup(env.pool,env.schema,env.root);
  const options={mode:'prevalidate' as const,database:'nestly_test',schema:env.schema,manifestPath:proof.manifestPath,approvedManifestSha256:proof.approvedManifestSha256};
  const destination={database:'nestly_test' as const,schema:env.schema};
  await expect(activateEmptyProducts(env.pool,options)).rejects.toMatchObject({code:'DESTINATION_NOT_ALLOWED'});
  await expect(activateEmptyProducts(env.pool,{...options,schema:'public'},destination)).rejects.toMatchObject({code:'DESTINATION_NOT_ALLOWED'});
  await expect(activateEmptyProducts(env.pool,{...options,mode:'apply'},destination)).rejects.toMatchObject({code:'ACTIVATION_DISABLED'});
  await expect(activateEmptyProducts(env.pool,{...options,approvedManifestSha256:'0'.repeat(64)},destination)).rejects.toMatchObject({code:'MANIFEST_NOT_APPROVED'});
  const archivePath=join(env.root,'activation.dump'),originalArchive=await readFile(archivePath);
  const corrupt=Buffer.from(originalArchive);corrupt[corrupt.length-1]^=1;await writeFile(archivePath,corrupt);
  await expect(activateEmptyProducts(env.pool,options,destination)).rejects.toMatchObject({code:'ARCHIVE_INVALID'});await writeFile(archivePath,originalArchive);
  const dependency='activation_dependency_'+randomUUID().replaceAll('-','');await env.pool.query('CREATE SCHEMA '+dependency);
  try{
   await env.pool.query('CREATE TABLE '+dependency+'.unexpected(item_id integer REFERENCES '+env.schema+'.item(id))');
   await expect(activateEmptyProducts(env.pool,options,destination)).rejects.toMatchObject({code:'UNEXPECTED_DEPENDENCY'});
   await env.pool.query('DROP TABLE '+dependency+'.unexpected');
   await env.pool.query('CREATE VIEW '+dependency+'.unexpected AS SELECT id FROM '+env.schema+'.item');
   await expect(activateEmptyProducts(env.pool,options,destination)).rejects.toMatchObject({code:'UNEXPECTED_DEPENDENCY'});
  }finally{await env.pool.query('DROP SCHEMA '+dependency+' CASCADE');}
  expect(await activateEmptyProducts(env.pool,options,destination)).toMatchObject({mode:'prevalidate',deleted:0});expect(await inventory()).toEqual(before);
  await env.pool.query("UPDATE item SET nom='Canvi' WHERE id=1");await expect(activateEmptyProducts(env.pool,options,destination)).rejects.toMatchObject({code:'SNAPSHOT_CHANGED'});await env.pool.query("UPDATE item SET nom='Fictici A' WHERE id=1");
  await env.pool.query('CREATE TABLE unexpected(item_id integer REFERENCES item(id))');await expect(activateEmptyProducts(env.pool,options,destination)).rejects.toMatchObject({code:'SNAPSHOT_CHANGED'});await env.pool.query('DROP TABLE unexpected');
  const legacy=await serve(await createRuntimeApp(env.pool));
  expect((await (await fetch(legacy+'/api/runtime-model')).json()).model).toBe('legacy');expect((await fetch(legacy+'/api/products')).status).toBe(404);
  expect((await (await fetch(legacy+'/api/items')).json()).inventory_count).toBe(3);
  await expect(createRuntimeApp(env.pool,'products-v1',env.root,new WriteBarrier('open'))).rejects.toThrow('no activat');
  const apply={...options,mode:'apply' as const,enabled:true,writersPaused:true,confirmDeleteIds:[1,2,3]};
  const broken={options:env.pool.options,connect:async()=>{const c=await env.pool.connect();return {query:async(sql:string,values?:unknown[])=>{const r=await c.query(sql,values);if(sql.includes('CREATE TABLE'))throw Error('Fallada després de DDL');return r;},release:(e?:Error)=>c.release(e)};}} as unknown as Pool;
  await expect(activateEmptyProducts(broken,apply,destination)).rejects.toMatchObject({code:'ACTIVATION_FAILED'});expect(await inventory()).toEqual(before);
  expect(await activateEmptyProducts(env.pool,apply,destination)).toMatchObject({deleted:3});
  await expect(createRuntimeApp(env.pool)).rejects.toThrow('Legacy incompatible');
  // El backend legacy ja arrencat també deixa de permetre escriptures.
  expect((await fetch(legacy+'/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status).toBe(503);
  const base=await serve(await createRuntimeApp(env.pool,'products-v1',env.root,new WriteBarrier('open')));
  expect((await (await fetch(base+'/api/runtime-model')).json()).model).toBe('products-v1');
  expect((await fetch(base+'/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status).toBe(409);
  const png=await sharp({create:{width:20,height:30,channels:3,background:'#bbaacc'}}).png().toBuffer();
  const post=async(data:object)=>{const body=new FormData();body.append('data',JSON.stringify(data));body.append('photo',new Blob([png]),'synthetic.png');return fetch(base+'/api/items',{method:'POST',headers:{'X-Nestly-Model':'products-v1'},body});};
  const first=await post({product:{mode:'new',nom:'Nou',categoria_id:1,subcategoria_id:1},quantitat:2,estat_preparacio:'preparada'});expect(first.status).toBe(201);const a=await first.json();expect(a.items[0].id).toBeGreaterThan(3);
  const replaced=await post({product:{mode:'existing',producte_id:a.items[0].producte_id},quantitat:1,estat_preparacio:'no_preparada',photo_decision:{expected_version:0,replace_confirmed:true}});expect(replaced.status).toBe(201);const b=await replaced.json();
  const detail=await (await fetch(base+'/api/items/'+a.items[0].id)).json();expect(detail.item.foto_ref).toBe(b.items[0].foto_ref);
  const grouped=await (await fetch(base+'/api/items')).json();expect(grouped.groups).toHaveLength(1);expect(grouped.groups[0].total_units).toBe(3);
  expect((await (await fetch(base+'/api/products')).json()).products).toHaveLength(1);
  expect((await fetch(base+'/api/item-photos/'+b.items[0].foto_ref.slice(6,-5))).status).toBe(200);
 }finally{for(const s of servers)await new Promise<void>((r,j)=>s.close(e=>e?j(e):r()));await env.cleanup();}
},60000);
