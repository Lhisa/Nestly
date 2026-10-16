import {request as httpRequest} from 'node:http';
import {readdir,readFile} from 'node:fs/promises';import {join} from 'node:path';
import type {Server} from 'node:http';import {expect,test} from 'vitest';import sharp from 'sharp';
import {startMigrationRehearsal} from './support/migration-rehearsal.js';import {createRuntimeApp} from '../src/http/runtime-app.js';import {WriteBarrier} from '../src/http/write-barrier.js';import {PostgresProducts} from '../src/infrastructure/postgres-products.js';import {activationInventory} from '../src/operations/activation-inventory.js';
test('manteniment PostgreSQL real: totes les famílies, obertura, concurrència i drenatge',async()=>{
 const env=await startMigrationRehearsal();const servers:Server[]=[];let release:()=>void=()=>{};
 const serve=async(app:Awaited<ReturnType<typeof createRuntimeApp>>)=>{const s=app.listen(0,'127.0.0.1');servers.push(s);await new Promise<void>((r,j)=>{s.once('listening',r);s.once('error',j);});const a=s.address();if(!a||typeof a==='string')throw Error();return 'http://127.0.0.1:'+a.port;};
 const inventory=async()=>{const c=await env.pool.connect();try{return await activationInventory(c,env.schema);}finally{c.release();}};
 const files=async()=>{const names=await readdir(env.root,{recursive:true});return Promise.all(names.sort().map(async name=>{try{return [name,(await readFile(join(env.root,name))).toString('base64')];}catch{return [name,'directory'];}}));};
 try{
  // Legacy per defecte continua permetent el seu contracte JSON.
  const legacy=await serve(await createRuntimeApp(env.pool));
  expect((await fetch(legacy+'/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nom:'Sintètic',categoria_id:1,subcategoria_id:1,quantitat:1,estat_preparacio:'preparada'})})).status).toBe(201);
  await env.pool.query('DELETE FROM item');await env.prepare();await env.activate();
  expect((await fetch(legacy+'/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status).toBe(503);
  const defaultBase=await serve(await createRuntimeApp(env.pool,'products-v1',env.root));
  expect((await fetch(defaultBase+'/api/items',{method:'POST'})).status).toBe(503);
  const gate=new WriteBarrier(),app=await createRuntimeApp(env.pool,'products-v1',env.root,gate),base=await serve(app);
  const before=await inventory(),originalFiles=await files();
  for(const path of ['/api/runtime-model','/api/categories','/api/products','/api/items'])expect((await fetch(base+path)).status).toBe(200);
  expect((await fetch(base+'/api/items/999')).status).toBe(404);
  const attempts=[['POST','/api/items'],['PUT','/api/items/1'],['PATCH','/api/items/1'],['DELETE','/api/items/1'],['POST','/api/products'],['PATCH','/api/products/1'],['DELETE','/api/item-photos/11111111-1111-4111-8111-111111111111'],['POST','/legacy/items'],['POST','/__auxiliary'],['POST','/api/item-photos']];
  const blocked=await Promise.all(attempts.map(async([method,path])=>{const r=await fetch(base+path,{method,headers:{'X-Nestly-Model':'products-v1','Content-Type':'application/json'},body:'malformed JSON'});return {status:r.status,body:await r.json()};}));
  expect(blocked.every(r=>r.status===503&&r.body.code==='MAINTENANCE')).toBe(true);
  const png=await sharp({create:{width:20,height:20,channels:3,background:'#bbaacc'}}).png().toBuffer();
  const data={product:{mode:'new',nom:'Amb foto',categoria_id:1,subcategoria_id:1},quantitat:2,estat_preparacio:'preparada'};
  const post=async()=>{const body=new FormData();body.append('data',JSON.stringify(data));body.append('photo',new Blob([png]),'synthetic.png');return fetch(base+'/api/items',{method:'POST',headers:{'X-Nestly-Model':'products-v1'},body});};
  expect((await post()).status).toBe(503);expect(await inventory()).toEqual(before);expect(await files()).toEqual(originalFiles);
  gate.open();const saved=await post();expect(saved.status).toBe(201);const savedData=await saved.json();expect((await fetch(base+'/api/item-photos/'+savedData.items[0].foto_ref.slice(6,-5))).status).toBe(200);
  const entered=Promise.withResolvers<void>(),proceed=Promise.withResolvers<void>();release=()=>proceed.resolve();let enteredCount=0;
  // Ruta auxiliar només del test: la barrera global també l'engloba.
  app.post('/__auxiliary',async(_req,res)=>{if(++enteredCount===3)entered.resolve();await proceed.promise;const units=await new PostgresProducts(env.pool).createBatchAtomically({product:{mode:'existing',producte_id:savedData.items[0].producte_id},quantitat:1,estat_preparacio:'preparada'});res.json({id:units[0].id});});
  const running=Array.from({length:3},()=>fetch(base+'/__auxiliary',{method:'POST'}));await entered.promise;
  expect(gate.status.inFlight).toBe(3);let drained=false;const drain=gate.closeAndDrain().then(()=>{drained=true;});
  const rejected=await Promise.all(Array.from({length:8},()=>fetch(base+'/__auxiliary',{method:'POST'})));expect(rejected.every(r=>r.status===503)).toBe(true);expect(drained).toBe(false);expect(()=>gate.open()).toThrow();
  release();expect((await Promise.all(running)).every(r=>r.status===200)).toBe(true);await drain;expect(gate.status).toEqual({accepting:false,inFlight:0,uncertain:false});
  const closedState=await inventory(),closedFiles=await files();expect((await post()).status).toBe(503);expect(await inventory()).toEqual(closedState);expect(await files()).toEqual(closedFiles);
  expect((await env.pool.query('SELECT count(*)::int n FROM item')).rows[0].n).toBe(5);
  gate.open();const abortEntered=Promise.withResolvers<void>(),abortProceed=Promise.withResolvers<void>(),socketClosed=Promise.withResolvers<void>(),workDone=Promise.withResolvers<void>();release=()=>abortProceed.resolve();
  app.post('/__aborted',async(_req,res)=>{res.once('close',()=>socketClosed.resolve());abortEntered.resolve();await abortProceed.promise;await new PostgresProducts(env.pool).createBatchAtomically({product:{mode:'existing',producte_id:savedData.items[0].producte_id},quantitat:1,estat_preparacio:'preparada'});workDone.resolve();res.json({ok:true});});
  const disconnected=httpRequest(base+'/__aborted',{method:'POST'});disconnected.on('error',()=>{});disconnected.end();await abortEntered.promise;disconnected.destroy();await socketClosed.promise;
  await expect(gate.closeAndDrain()).rejects.toThrow('DRAIN_UNCERTAIN');expect(()=>gate.open()).toThrow();
  release();await workDone.promise;expect(gate.status).toEqual({accepting:false,inFlight:1,uncertain:true});expect((await post()).status).toBe(503);
  expect((await env.pool.query('SELECT count(*)::int n FROM item')).rows[0].n).toBe(6);
 }finally{release();for(const s of servers)await new Promise<void>((r,j)=>s.close(e=>e?j(e):r()));await env.cleanup();}
},30000);
