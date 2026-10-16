/** Exclusiu dels assajos E: cap entrada CLI ni accés a esquemes preexistents. */
import {randomUUID,createHash} from 'node:crypto';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {Pool,type PoolClient} from 'pg';
import sharp from 'sharp';
import {validateProductMigrationPlan,type ProductMigrationPlan,type LegacyProductItem} from '../../src/application/product-migration-plan.js';

export const planDigest=(plan:ProductMigrationPlan)=>createHash('sha256').update(JSON.stringify(plan)).digest('hex');
const sql=async(name:string)=>readFile(new URL('../../planned-migrations/productes/'+name,import.meta.url),'utf8');
/** Els SQL aprovats tenen transacció pròpia; l'assaig n'engloba el cos en una sola transacció. */
async function body(name:string){
 const text=await sql(name);
 if((text.match(/^BEGIN;$/gm)??[]).length!==1||(text.match(/^COMMIT;$/gm)??[]).length!==1)throw Error('Embolcall SQL inesperat');
 return text.replace(/^BEGIN;\r?$/m,'').replace(/^COMMIT;\r?$/m,'');
}
export async function startMigrationRehearsal(){
 const connectionString=process.env.NESTLY_ITEMS_TEST_DATABASE_URL;
 if(!connectionString||new URL(connectionString).pathname!=='/nestly_test')throw Error('Cal nestly_test explícit');
 const admin=new Pool({connectionString,connectionTimeoutMillis:3000});
 const schema='migration_e_'+randomUUID().replaceAll('-','');
 let created=false,uncertain=false,pool:Pool|undefined,root:string|undefined;
 const cleanup=async()=>{
  try{await pool?.end();}finally{
   try{if(created&&!uncertain)await admin.query('DROP SCHEMA "'+schema+'" CASCADE');}finally{
    await admin.end();
    if(root&&!uncertain){if(dirname(resolve(root))!==resolve(tmpdir())||!basename(root).startsWith('nestly-migration-e-'))throw Error('Neteja fora de límit');await rm(root,{recursive:true,force:true});}
   }
  }
 };
 try{
  if((await admin.query('SELECT current_database() db')).rows[0].db!=='nestly_test')throw Error('Base incorrecta');
  await admin.query('CREATE SCHEMA "'+schema+'"');created=true;
  pool=new Pool({connectionString,options:'-c search_path='+schema,connectionTimeoutMillis:3000});
  if((await pool.query('SELECT current_schema() s')).rows[0].s!==schema)throw Error('Esquema incorrecte');
  root=await mkdtemp(join(tmpdir(),'nestly-migration-e-'));
  for(const name of ['001_create_initial_schema.sql','002_insert_initial_catalog.sql'])await pool.query(await readFile(new URL('../../migrations/'+name,import.meta.url),'utf8'));
  const qualified='"'+schema+'"';
  const settings=async(c:PoolClient)=>{await c.query("SELECT set_config('nestly.migration_database','nestly_test',true),set_config('nestly.migration_schema',$1,true)",[schema]);};
  const transaction=async(work:(c:PoolClient)=>Promise<void>)=>{
   const c=await pool!.connect();let commitSent=false;let releaseError:Error|undefined;
   try{await c.query('BEGIN');await settings(c);await work(c);commitSent=true;await c.query('COMMIT');}
   catch(error){try{await c.query('ROLLBACK');}catch(rollback){uncertain=true;releaseError=rollback as Error;throw Error('ROLLBACK incert: conservar recursos',{cause:error});}
    if(commitSent){uncertain=true;releaseError=error as Error;throw Error('COMMIT incert: conservar recursos',{cause:error});}throw error;
   }finally{c.release(releaseError);}
  };
  const snapshot=async(c:PoolClient|Pool=pool!):Promise<LegacyProductItem[]> =>(await c.query('SELECT i.id,i.nom,i.subcategoria_id,i.foto_ref,EXISTS(SELECT 1 FROM '+qualified+'.item_llista l WHERE l.item_id=i.id) linked_to_list FROM '+qualified+'.item i ORDER BY i.id')).rows;
  const prepare=()=>transaction(async c=>{await c.query(await body('003_prepare_products.sql'));});
  const activate=()=>transaction(async c=>{await c.query(await body('004_require_product_identity.sql'));});
  const initializeEmpty=(expected:LegacyProductItem[])=>transaction(async c=>{
   await c.query('LOCK TABLE '+qualified+'.item,'+qualified+'.item_llista IN ACCESS EXCLUSIVE MODE');
   if(JSON.stringify(await snapshot(c))!==JSON.stringify(expected))throw Error('Snapshot de buidatge obsolet');
   if(expected.some(i=>i.linked_to_list||i.foto_ref!==null))throw Error('El buidatge mínim no cobreix fotos o llistes');
   await c.query('DELETE FROM '+qualified+'.item WHERE id=ANY($1::integer[])',[expected.map(i=>i.id)]);
   await c.query(await body('003_prepare_products.sql'));
   await c.query(await body('004_require_product_identity.sql'));
  });
  const apply=async(input:ProductMigrationPlan,approvedDigest:string|null,failAfterFirst=false)=>{
   const plan=structuredClone(input);
   if(!approvedDigest||approvedDigest!==planDigest(plan))throw Error('Mapa no aprovat o modificat');
   await transaction(async c=>{
    await c.query('LOCK TABLE '+qualified+'.item,'+qualified+'.item_llista,'+qualified+'.producte,'+qualified+'.subcategoria,'+qualified+'.categoria IN ACCESS EXCLUSIVE MODE');
    const errors=validateProductMigrationPlan(plan,await snapshot(c),{database:'nestly_test',schema});
    if(errors.length)throw Error(errors.join('; '));
    if((await c.query('SELECT EXISTS(SELECT 1 FROM '+qualified+'.producte) OR EXISTS(SELECT 1 FROM '+qualified+'.item WHERE producte_id IS NOT NULL) occupied')).rows[0].occupied)throw Error('Aplicació repetida o parcial');
    const before=(await c.query('SELECT to_jsonb(i)-\'producte_id\' data FROM '+qualified+'.item i ORDER BY id')).rows;
    for(const product of plan.products){
     if(!(await c.query('SELECT EXISTS(SELECT 1 FROM '+qualified+'.subcategoria WHERE id=$1) present',[product.subcategoria_id])).rows[0].present)throw Error('Catàleg absent');
     if(product.foto_ref){const metadata=await sharp(await readFile(join(root!,product.foto_ref))).metadata();if(metadata.format!=='webp')throw Error('Fotografia no WebP');}
     const id=(await c.query('INSERT INTO '+qualified+'.producte(nom,subcategoria_id,foto_ref) VALUES ($1,$2,$3) RETURNING id',[product.nom,product.subcategoria_id,product.foto_ref])).rows[0].id;
     const assigned=await c.query('UPDATE '+qualified+'.item SET producte_id=$1 WHERE id=ANY($2::integer[])',[id,product.item_ids]);
     if(assigned.rowCount!==product.item_ids.length)throw Error('Cobertura divergent');
     if(failAfterFirst)throw Error('Fallada sintètica després de la primera assignació');
    }
    await c.query(await body('004_require_product_identity.sql'));
    const after=(await c.query('SELECT to_jsonb(i)-\'producte_id\' data FROM '+qualified+'.item i ORDER BY id')).rows;
    if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Camps legacy modificats');
   });
  };
  return {schema,pool,root,snapshot,prepare,activate,initializeEmpty,apply,cleanup};
 }catch(error){await cleanup();throw error;}
}
