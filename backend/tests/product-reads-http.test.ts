import express from 'express';
import type {Server} from 'node:http';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {afterEach,expect,test,vi} from 'vitest';
import sharp from 'sharp';
import type {Pool} from 'pg';
import {createProductItemsReadRouter} from '../src/http/product-items-read-router.js';
import {createProductPhotosRouter} from '../src/http/product-photos-router.js';
import {PostgresProductPhotoReferences} from '../src/infrastructure/postgres-product-photo-references.js';
import {LocalProductPhotoReader} from '../src/infrastructure/local-product-photo-reader.js';
import {LocalItemPhotoStorage} from '../src/infrastructure/local-item-photo-storage.js';
import type {ProductItemsReader,ProductUnit} from '../src/application/product-persistence.js';
const servers:Server[]=[];let directory:string|undefined;
afterEach(async()=>{await Promise.all(servers.splice(0).map(s=>new Promise<void>(r=>s.close(()=>r()))));if(directory){if(dirname(resolve(directory))!==resolve(tmpdir()))throw Error('Unsafe cleanup');await rm(directory,{recursive:true,force:true});directory=undefined;}});
async function start(app:express.Express){const s=app.listen(0,'127.0.0.1');servers.push(s);await new Promise<void>(r=>s.once('listening',r));const a=s.address();if(!a||typeof a==='string')throw Error('address');return 'http://127.0.0.1:'+a.port;}

test('lectures HTTP: noms duplicats separats per identitat, filtres repetits i detall derivat',async()=>{
 const ref='items/'+randomUUID()+'.webp';
 const unit=(id:number,producte_id:number):ProductUnit=>({id,producte_id,nom:'Body',subcategoria_id:2,foto_ref:ref,estat_preparacio:null,data_entrada_casa:new Date('2026-01-01Z'),data_creacio:new Date('2026-02-01Z')});
 const rows=[unit(1,7),unit(2,7),unit(3,8)];
 const reader={listHomeForProjection:async()=>rows,findHomeById:async(id:number)=>rows.find(i=>i.id===id)??null} as ProductItemsReader;
 const app=express();app.use('/api/items',createProductItemsReadRouter({read:async()=>[{id:1,nom:'Roba',subcategories:[{id:2,nom:'Bodies'}]}]},reader));const base=await start(app);
 const response=await fetch(base+'/api/items?subcategoria_id=2&subcategoria_id=2');expect(response.status).toBe(200);const body=await response.json();
 expect(body).toMatchObject({inventory_count:3,matched_count:3,filters:{categoria_id:1,subcategoria_id:2}});
 expect(body.groups.map((g:{producte_id:number})=>g.producte_id)).toEqual([8,7]);expect(body.groups[1].total_units).toBe(2);expect(body.groups[1].units.every((u:{foto_ref:string})=>u.foto_ref===ref)).toBe(true);
 expect(body.corrections.map((c:{reason:string})=>c.reason)).toEqual(['duplicate','inferred']);
 const detail=await (await fetch(base+'/api/items/1')).json();expect(detail.item).toMatchObject({producte_id:7,nom:'Body',foto_ref:ref,estat_preparacio:null,data_entrada_casa:'2026-01-01T00:00:00.000Z'});
 expect((await fetch(base+'/api/items/999')).status).toBe(404);expect((await fetch(base+'/api/items/invalid')).status).toBe(400);
});

test('servei de fotos: UUID estricte, referències producte/legacy, orfes i errors segurs',async()=>{
 directory=await mkdtemp(join(tmpdir(),'nestly-product-read-'));
 const productRefs=new Set<string>(),legacyRefs=new Set<string>();let fail=false;
 const query=vi.fn(async(_sql:string,values:string[])=>{if(fail)throw Error('SQL private password');return {rows:[{referenced:productRefs.has(values[0])||legacyRefs.has(values[0])}]};});
 const checker=new PostgresProductPhotoReferences({query} as unknown as Pool);
 const storage=()=>new LocalItemPhotoStorage(directory!,ref=>checker.hasReferences(ref));
 const bytes=await sharp({create:{width:16,height:16,channels:3,background:'#aabbcc'}}).webp().toBuffer();
 const a=await storage().save({format:'webp',bytes}),b=await storage().save({format:'webp',bytes}),orphan=await storage().save({format:'webp',bytes});productRefs.add(a);legacyRefs.add(b);
 const photoReader=new LocalProductPhotoReader(directory,{query} as unknown as Pool);
 const app=express();app.use('/api/item-photos',createProductPhotosRouter(ref=>photoReader.readReferenced(ref)));const base=await start(app);
 const url=(ref:string)=>base+'/api/item-photos/'+ref.slice(6,-5);
 for(const ref of [a,b]){const response=await fetch(url(ref));expect(response.status).toBe(200);expect(response.headers.get('content-type')).toContain('image/webp');expect(response.headers.get('x-content-type-options')).toBe('nosniff');expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);}
 expect((await fetch(url(orphan))).status).toBe(404);
 const calls=query.mock.calls.length;expect((await fetch(base+'/api/item-photos/..%2Fsecret')).status).toBe(404);expect(query.mock.calls).toHaveLength(calls);
 fail=true;const error=await fetch(url(a));expect(error.status).toBe(500);expect(await error.text()).not.toContain('private');
 expect(query.mock.calls[0][0]).toContain('FROM producte');expect(query.mock.calls[0][0]).toContain('FROM item');
});
