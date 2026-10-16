import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import {expect,test} from 'vitest';
import {startProductRehearsal} from './support/product-rehearsal.js';

test('assaig integral HTTP + PostgreSQL: productes, fotografies, lectures, recuperació i llistes',async()=>{
 const connection=process.env.NESTLY_ITEMS_TEST_DATABASE_URL;
 if(!connection||new URL(connection).pathname!=='/nestly_test')throw Error('Cal nestly_test.');
 const env=await startProductRehearsal(connection);
 try{
   const png=await sharp({create:{width:40,height:24,channels:3,background:'#aabbcc'}}).png().toBuffer();
   const post=async(data:object,photo=false)=>{
     if(!photo)return fetch(env.base+'/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
     const body=new FormData();body.append('data',JSON.stringify(data));body.append('photo',new Blob([png]),'sample.png');return fetch(env.base+'/api/items',{method:'POST',body});
   };
   const fresh=(nom='Body d’assaig')=>({product:{mode:'new',nom,categoria_id:1,subcategoria_id:1},quantitat:3,estat_preparacio:'preparada'});
   let response=await post(fresh(),true);expect(response.status).toBe(201);const a=await response.json(),id=a.items[0].producte_id,old=a.items[0].foto_ref;
   response=await post(fresh());expect(response.status).toBe(201);const b=await response.json(),other=b.items[0].producte_id;expect(other).not.toBe(id);
   const existing={product:{mode:'existing',producte_id:id},quantitat:2,estat_preparacio:'no_preparada'};
   const inherited=await (await post(existing)).json();expect(inherited.items.every((i:{foto_ref:string})=>i.foto_ref===old)).toBe(true);
   // Una unitat de llista conserva producte i foto compartida, però queda fora d'inventari.
   await env.pool.query("INSERT INTO item_llista(item_id,llista_id,estat_comanda,preu_total) VALUES ($1,1,'demanat',1)",[a.items[0].id]);
   expect((await fetch(env.base+'/api/items/'+a.items[0].id)).status).toBe(404);
   const replace={...existing,photo_decision:{expected_version:0,replace_confirmed:true}};
   expect((await post({...replace,photo_decision:{expected_version:0,replace_confirmed:false}},true)).status).toBe(409);
   response=await post(replace,true);expect(response.status).toBe(201);const replaced=await response.json(),current=replaced.items[0].foto_ref;expect(current).not.toBe(old);
   expect((await post(replace,true)).status).toBe(409);
   expect((await env.products.findById(a.items[0].id))?.foto_ref).toBe(current);
   for(const item of [...a.items.slice(1),...inherited.items,...replaced.items])expect((await (await fetch(env.base+'/api/items/'+item.id)).json()).item.foto_ref).toBe(current);
   for(const item of b.items)expect((await env.products.findById(item.id))?.foto_ref).toBeNull();
   response=await post({...existing,product:{mode:'existing',producte_id:other},photo_decision:{expected_version:0,replace_confirmed:false}},true);expect(response.status).toBe(201);
   const first=await response.json();for(const item of b.items)expect((await env.products.findById(item.id))?.foto_ref).toBe(first.items[0].foto_ref);
   const inventory=await (await fetch(env.base+'/api/items?subcategoria_id=1&subcategoria_id=1')).json();expect(inventory.groups).toHaveLength(2);expect(inventory.inventory_count).toBe(11);expect(inventory.matched_count).toBe(11);expect(inventory.filters).toEqual({categoria_id:1,subcategoria_id:1});expect(inventory.groups.map((g:{total_units:number})=>g.total_units).sort()).toEqual([5,6]);
   const empty=await (await fetch(env.base+'/api/items?categoria_id=2')).json();expect(empty).toMatchObject({inventory_count:11,matched_count:0,groups:[]});
   const photoUrl=(ref:string)=>env.base+'/api/item-photos/'+ref.slice(6,-5);
   const oldBytes=await readFile(join(env.root,old));expect(oldBytes.length).toBeGreaterThan(0);expect((await fetch(photoUrl(current))).status).toBe(200);
   // Es conserva una fotografia física sense referències, però no es pot servir.
   const orphan=await env.storage().save({format:'webp',bytes:await sharp(png).webp().toBuffer()});expect((await fetch(photoUrl(orphan))).status).toBe(404);
   const count=(await env.pool.query('SELECT count(*)::int n FROM item')).rows[0].n,files=(await readdir(join(env.root,'items'))).length;
   expect((await post(fresh('Assaig fallida'),true)).status).toBe(500);expect((await env.pool.query('SELECT count(*)::int n FROM item')).rows[0].n).toBe(count);expect((await env.pool.query("SELECT count(*)::int n FROM producte WHERE nom='Assaig fallida'")).rows[0].n).toBe(0);expect(await readdir(join(env.root,'items'))).toHaveLength(files);
   await fetch(env.base+'/__test/fault',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'uncertain'})});
   const uncertain=await post(fresh('Resultat incert'),true);expect(uncertain.status).toBe(503);expect((await uncertain.json()).code).toBe('PERSISTENCE_UNCERTAIN');expect((await env.pool.query('SELECT count(*)::int n FROM item')).rows[0].n).toBe(count+3);expect(await readdir(join(env.root,'items'))).toHaveLength(files+1);
   expect(env.incidents).toHaveLength(1);
 }finally{await env.cleanup();}
},20000);
