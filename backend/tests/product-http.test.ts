import express from 'express';
import type {Server} from 'node:http';
import {afterEach,expect,test,vi} from 'vitest';
import sharp from 'sharp';
import {createProductItemsRouter} from '../src/http/product-items-router.js';
import {createProductsRouter} from '../src/http/products-router.js';
import {acquirePhotoOperation} from '../src/http/items-multipart.js';
import type {ProductBatchInput,ProductItemsReader,ProductUnit} from '../src/application/product-persistence.js';
import {ProductNotFoundError} from '../src/application/product-errors.js';
import {ProductPersistenceUncertainError,ProductPhotoConflictError} from '../src/application/product-persistence.js';
import {SharpItemPhotoProcessor} from '../src/infrastructure/sharp-item-photo-processor.js';
import {PhotoProcessingError} from '../src/application/item-photos.js';

const servers:Server[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(s=>new Promise<void>(r=>s.close(()=>r()))));vi.restoreAllMocks();});
const data={product:{mode:'new',nom:'Body',categoria_id:1,subcategoria_id:1},quantitat:2,estat_preparacio:'preparada'};
const product={id:7,nom:'Body',category:{id:1,nom:'Roba'},subcategory:{id:1,nom:'Bodies'},foto_ref:'items/11111111-1111-4111-8111-111111111111.webp',foto_versio:3};
const selected={...data,product:{mode:'existing',producte_id:7}};
const catalog={read:async()=>[{id:1,nom:'Roba',subcategories:[{id:1,nom:'Bodies'}]}]};
async function png(){return sharp({create:{width:16,height:16,channels:3,background:'#aabbcc'}}).png().toBuffer();}
function form(bytes:Uint8Array,value:unknown=data){const body=new FormData();body.append('data',JSON.stringify(value));body.append('photo',new Blob([Buffer.from(bytes)],{type:'text/plain'}),'untrusted.exe');return body;}
async function start(withPhotos=true){
  const list=vi.fn(async()=>[product,{...product,id:8,foto_ref:null}]);
  const find=vi.fn(async(id:number)=>id===7?product:null);
  const reader={listSelectableProducts:list,findProductById:find} as unknown as ProductItemsReader;
  const persist=vi.fn(async(input:ProductBatchInput):Promise<ProductUnit[]>=>Array.from({length:input.quantitat},(_,index)=>({id:index+1,producte_id:input.product.mode==='existing'?input.product.producte_id:9,nom:input.product.mode==='new'?input.product.nom:product.nom,subcategoria_id:1,estat_preparacio:input.estat_preparacio,foto_ref:input.product.mode==='new'?input.product.foto_ref:input.photoChange?.reference??product.foto_ref,data_entrada_casa:null,data_creacio:new Date('2026-01-01T00:00:00Z')})));
  const processor=new SharpItemPhotoProcessor(),save=vi.fn(async()=> 'items/22222222-2222-4222-8222-222222222222.webp'),remove=vi.fn(async()=>{}),report=vi.fn();
  const photos={processor,storage:()=>({save,removeIfUnreferenced:remove}),reportIncident:report};
  const app=express();
  app.use('/api/products',createProductsRouter(reader));
  app.use('/api/items',createProductItemsRouter(catalog,{reader,repository:{createBatchAtomically:persist},photos:withPhotos?photos:undefined}));
  const server=app.listen(0,'127.0.0.1');servers.push(server);await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();if(!address||typeof address==='string')throw Error('address');
  const base='http://127.0.0.1:'+address.port;
  return {base,list,find,persist,processor,save,remove,report,post:(body:FormData)=>fetch(base+'/api/items',{method:'POST',body}),json:(value:unknown)=>fetch(base+'/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)})};
}

test('catàleg conserva noms duplicats; JSON nou/existent retorna 201 i producte_id sense processar fotos',async()=>{
  const api=await start();
  const products=await (await fetch(api.base+'/api/products')).json();
  expect(products.products.map((p:{id:number})=>p.id)).toEqual([7,8]);
  for(const value of [data,selected]){const response=await api.json(value);expect(response.status).toBe(201);expect(await response.json()).toMatchObject({created_count:2,items:[{subcategoria_id:1},{subcategoria_id:1}]});}
  expect(api.persist.mock.calls[0][0].product).toEqual({mode:'new',nom:'Body',subcategoria_id:1,foto_ref:null});
  expect(api.persist.mock.calls[1][0].product).toEqual({mode:'existing',producte_id:7});
  expect(api.save).not.toHaveBeenCalled();
});

test('JSON malformat, formes invàlides, transport/foto_ref del client i producte inexistent',async()=>{
  const api=await start();
  for(const value of [null,[],{}, {...data,transport:'json'},{...data,foto_ref:'private'},{...data,product:{...data.product,foto_ref:'private'}},{...data,quantitat:'2'}])expect((await api.json(value)).status).toBe(400);
  for(const body of ['{','']){const response=await fetch(api.base+'/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body});expect(response.status).toBe(400);}
  expect((await api.json({...selected,product:{mode:'existing',producte_id:999}})).status).toBe(404);
  expect(api.persist).not.toHaveBeenCalled();expect(api.save).not.toHaveBeenCalled();
});

test('transport no admès és 415 i JSON sobredimensionat és 413',async()=>{
  const api=await start();
  for(const type of ['text/plain','application/xml','application/x-www-form-urlencoded','application/octet-stream'])expect((await fetch(api.base+'/api/items',{method:'POST',headers:{'Content-Type':type},body:'payload'})).status).toBe(415);
  expect((await fetch(api.base+'/api/items',{method:'POST',body:new Uint8Array([1])})).status).toBe(415);
  expect((await api.json({...data,padding:'x'.repeat(17000)})).status).toBe(413);
  expect(api.persist).not.toHaveBeenCalled();
});

test('multipart nou i existent: transport del header, format real i decisió transmesa',async()=>{
  const api=await start();const bytes=await png();
  for(const value of [data,{...selected,photo_decision:{expected_version:3,replace_confirmed:true}}]){const response=await api.post(form(bytes,value));expect(response.status).toBe(201);expect((await response.json()).created_count).toBe(2);}
  expect(api.save).toHaveBeenCalledTimes(2);
  expect(api.persist.mock.calls[1][0].photoChange).toEqual({reference:await api.save.mock.results[1].value,decision:{expected_version:3,replace_confirmed:true}});
});

test('multipart rebutja camps/parts duplicats o desconeguts i sintaxi malformada',async()=>{
  const api=await start();const bytes=await png();
  for(const scenario of ['duplicate-data','duplicate-photo','unknown','missing-photo','bad-json','client-transport','client-reference']){
    const body=form(bytes);
    if(scenario==='duplicate-data')body.append('data',JSON.stringify(data));
    if(scenario==='duplicate-photo')body.append('photo',new Blob([bytes]),'second.png');
    if(scenario==='unknown')body.append('transport','json');
    if(scenario==='missing-photo')body.delete('photo');
    if(scenario==='bad-json')body.set('data','{');
    if(scenario==='client-transport')body.set('data',JSON.stringify({...data,transport:'json'}));
    if(scenario==='client-reference')body.set('data',JSON.stringify({...data,foto_ref:'items/private.webp'}));
    expect((await api.post(body)).status).toBe(400);
  }
  expect((await fetch(api.base+'/api/items',{method:'POST',headers:{'Content-Type':'multipart/form-data'},body:'broken'})).status).toBe(400);
  expect(api.save).not.toHaveBeenCalled();expect(api.persist).not.toHaveBeenCalled();
});

test('conflictes previs i dins la transacció són 409 amb estat actual, sense camps interns',async()=>{
  const api=await start();const bytes=await png();
  for(const [decision,code] of [[{expected_version:3,replace_confirmed:false},'PHOTO_CONFIRMATION_REQUIRED'],[{expected_version:2,replace_confirmed:true},'PHOTO_VERSION_CONFLICT']] as const){
    const response=await api.post(form(bytes,{...selected,photo_decision:decision}));expect(response.status).toBe(409);expect(await response.json()).toMatchObject({code,product});
  }
  expect(api.save).not.toHaveBeenCalled();
  api.persist.mockRejectedValueOnce(new ProductPhotoConflictError('PHOTO_VERSION_CONFLICT',{...product,foto_versio:4}));
  const response=await api.post(form(bytes,{...selected,photo_decision:{expected_version:3,replace_confirmed:true}}));
  expect(response.status).toBe(409);expect(await response.json()).toMatchObject({code:'PHOTO_VERSION_CONFLICT',product:{foto_versio:4}});expect(api.remove).toHaveBeenCalledOnce();
});

test('errors interns, desaparició del producte i persistència incerta no exposen detalls ni reintenten',async()=>{
  const api=await start();const bytes=await png();const secret=Error('SQL password C:/private/photo.webp');
  api.persist.mockRejectedValueOnce(secret);
  let response=await api.json(data);expect(response.status).toBe(500);expect(await response.text()).not.toContain('private');
  api.persist.mockRejectedValueOnce(new ProductNotFoundError());expect((await api.json(selected)).status).toBe(404);
  api.persist.mockRejectedValueOnce(new ProductPersistenceUncertainError(secret));
  response=await api.post(form(bytes));expect(response.status).toBe(503);
  const body=await response.json();expect(body.code).toBe('PERSISTENCE_UNCERTAIN');expect(body.message).toContain('abans de repetir');expect(JSON.stringify(body)).not.toContain('SQL');
  expect(api.persist).toHaveBeenCalledTimes(3);expect(api.remove).not.toHaveBeenCalled();expect(api.report).toHaveBeenCalledOnce();
  api.list.mockRejectedValueOnce(secret);response=await fetch(api.base+'/api/products');expect(response.status).toBe(500);expect(await response.text()).not.toContain('private');
});

test('límits de fitxer/camp, contingut fotogràfic i saturació reutilitzen les proteccions existents',async()=>{
  const api=await start();const bytes=await png();
  expect((await api.post(form(new Uint8Array(10_000_001)))).status).toBe(413);
  const large=form(bytes);large.set('data','x'.repeat(16385));expect((await api.post(large)).status).toBe(413);
  const invalid=await api.post(form(new Uint8Array([1,2,3])));expect(invalid.status).toBe(422);
  const releaseA=acquirePhotoOperation(),releaseB=acquirePhotoOperation();
  try{expect((await api.post(form(bytes))).status).toBe(503);}finally{releaseB();releaseA();}
  // El permís es recupera també després de fallades anteriors.
  expect((await api.post(form(bytes))).status).toBe(201);
  vi.spyOn(api.processor,'normalize').mockRejectedValueOnce(new PhotoProcessingError('ANIMATED'));
  expect((await api.post(form(bytes))).status).toBe(422);
});

test('sense emmagatzematge configurat, JSON continua disponible però multipart retorna 503',async()=>{
  const api=await start(false);expect((await api.json(data)).status).toBe(201);expect((await api.post(form(await png()))).status).toBe(503);
});
