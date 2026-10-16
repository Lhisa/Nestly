import {createHash} from 'node:crypto';
import {readFile,lstat} from 'node:fs/promises';
import {dirname,join,basename} from 'node:path';
import type {Pool} from 'pg';
import {activationInventory,identifier} from './activation-inventory.js';
export class ActivationError extends Error{constructor(public readonly code:string){super(code);}}
export interface EmptyActivationOptions {
 mode:'prevalidate'|'apply';database:string;schema:string;manifestPath:string;approvedManifestSha256:string;
 /** Només una confirmació operativa; no substitueix l'autorització humana. */
 enabled?:boolean;writersPaused?:boolean;confirmDeleteIds?:readonly number[];
}
interface VerifiedBackup {
 version:number;status:string;restore_verified:boolean;source_unchanged:boolean;
 source:{database:string;host:string;port:number};archive:string;bytes:number;sha256:string;item_ids:number[];
 inventory:Awaited<ReturnType<typeof activationInventory>>;
}
const digest=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const fail=(code:string):never=>{throw new ActivationError(code);};
/** No crea connexions ni arrenca automàticament. El CLI només permet nestly_dev.public.
 * La capacitat d'assaig només s'injecta des de tests per a un esquema temporal concret. */
export async function activateEmptyProducts(pool:Pool,options:EmptyActivationOptions,testDestination?:{database:'nestly_test';schema:string}){
 const allowed=options.database==='nestly_dev'&&options.schema==='public'||options.database==='nestly_test'&&testDestination?.database===options.database&&testDestination.schema===options.schema&&/^migration_e_[0-9a-f]{32}$/.test(options.schema);
 if(!allowed)fail('DESTINATION_NOT_ALLOWED');
 if(!['prevalidate','apply'].includes(options.mode))fail('MODE_INVALID');
 if(options.mode==='apply'&&(!options.enabled||!options.writersPaused||!same(options.confirmDeleteIds,[1,2,3])))fail('ACTIVATION_DISABLED');
 const manifestBytes=await readFile(options.manifestPath);
 if(!/^[0-9a-f]{64}$/.test(options.approvedManifestSha256)||digest(manifestBytes)!==options.approvedManifestSha256)fail('MANIFEST_NOT_APPROVED');
 let m:VerifiedBackup;try{m=JSON.parse(manifestBytes.toString('utf8'));}catch{fail('MANIFEST_INVALID');}
 if(m!.version!==1||m!.status!=='verified'||m!.restore_verified!==true||m!.source_unchanged!==true||m!.source?.database!==options.database||!same(m!.item_ids,[1,2,3])||!Array.isArray(m!.inventory?.data)||!m!.inventory?.structure)fail('BACKUP_NOT_VERIFIED');
 if(typeof m!.archive!=='string'||basename(m!.archive)!==m!.archive||m!.archive.includes('\\')||!Number.isSafeInteger(m!.bytes)||m!.bytes<=0)fail('ARCHIVE_INVALID');
 const archivePath=join(dirname(options.manifestPath),m!.archive),stat=await lstat(archivePath);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==m!.bytes)fail('ARCHIVE_INVALID');
 const archive=await readFile(archivePath);if(archive.subarray(0,5).toString()!=='PGDMP'||digest(archive)!==m!.sha256)fail('ARCHIVE_INVALID');
 const c=await pool.connect();let commitSent=false,releaseError:Error|undefined;
 try{
  await c.query(options.mode==='prevalidate'?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN');
  await c.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='15s'");
  const actual=(await c.query("SELECT current_database() db,inet_server_addr()::text host,inet_server_port() port,current_setting('transaction_read_only') readonly")).rows[0];
  if(actual.db!==options.database||options.mode==='prevalidate'&&actual.readonly!=='on')fail('DESTINATION_MISMATCH');
  // El port del servidor pot diferir del publicat per Docker: verificar també el destí del pool.
  const config=pool.options;
  const endpoint=config.connectionString?new URL(config.connectionString):null;
  if(!endpoint||endpoint.hostname!==m!.source.host||Number(endpoint.port||5432)!==m!.source.port)fail('BACKUP_ORIGIN_MISMATCH');
  await c.query("SELECT set_config('search_path',$1,true)",[identifier(options.schema)+',pg_catalog']);
  const expectedTables=['botiga','categoria','item','item_llista','llista_nado','pgmigrations','recomanacio','subcategoria'];
  if(!same(m!.inventory.data.map(t=>t.table_name),expectedTables)||m!.inventory.data.some(t=>t.table_schema!==options.schema))fail('BACKUP_SCHEMA_MISMATCH');
  if(options.mode==='apply')await c.query('LOCK TABLE '+expectedTables.map(t=>identifier(options.schema)+'.'+identifier(t)).join(',')+' IN ACCESS EXCLUSIVE MODE');
  const external=(await c.query('SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.confrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=$1 AND c.connamespace<>n.oid LIMIT 1',[options.schema])).rowCount;
  const views=(await c.query("SELECT 1 FROM pg_depend d JOIN pg_rewrite r ON r.oid=d.objid JOIN pg_class v ON v.oid=r.ev_class JOIN pg_class t ON t.oid=d.refobjid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE d.classid='pg_rewrite'::regclass AND d.refclassid='pg_class'::regclass AND n.nspname=$1 AND v.relkind IN ('v','m') LIMIT 1",[options.schema])).rowCount;
  const rules=(await c.query("SELECT 1 FROM pg_rewrite r JOIN pg_class t ON t.oid=r.ev_class JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=$1 AND r.rulename<>'_RETURN' LIMIT 1",[options.schema])).rowCount;
  const inheritance=(await c.query('SELECT 1 FROM pg_inherits i JOIN pg_class t ON t.oid IN (i.inhrelid,i.inhparent) JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=$1 LIMIT 1',[options.schema])).rowCount;
  if(external||views||rules||inheritance)fail('UNEXPECTED_DEPENDENCY');
  const before=await activationInventory(c,options.schema);
  if(!same(before,m!.inventory))fail('SNAPSHOT_CHANGED');
  if(before.structure.triggers.length||before.structure.constraints.some(r=>r.convalidated!==true))fail('UNEXPECTED_STRUCTURE');
  const items=(await c.query('SELECT id,foto_ref FROM item ORDER BY id')).rows;
  const count=(table:string)=>before.data.find(t=>t.table_name===table)?.count;
  if(!same(items.map(i=>i.id),[1,2,3])||items.some(i=>i.foto_ref!==null)||count('item_llista')!==0||count('categoria')!==8||count('subcategoria')!==41)fail('INVENTORY_NOT_APPROVED');
  if(options.mode==='prevalidate'){await c.query('ROLLBACK');return {mode:'prevalidate' as const,valid:true,deleted:0};}
  const deleted=await c.query('DELETE FROM item WHERE id=ANY($1::integer[])',[[1,2,3]]);if(deleted.rowCount!==3)fail('DELETE_MISMATCH');
  await c.query("SELECT set_config('nestly.migration_database',$1,true),set_config('nestly.migration_schema',$2,true)",[options.database,options.schema]);
  for(const name of ['003_prepare_products.sql','004_require_product_identity.sql']){
   const sql=await readFile(new URL('../../planned-migrations/productes/'+name,import.meta.url),'utf8');
   if((sql.match(/^BEGIN;\r?$/gm)??[]).length!==1||(sql.match(/^COMMIT;\r?$/gm)??[]).length!==1)fail('SQL_WRAPPER_CHANGED');
   await c.query(sql.replace(/^BEGIN;\r?$/m,'').replace(/^COMMIT;\r?$/m,''));
  }
  await c.query("SELECT set_config('search_path',$1,true)",[identifier(options.schema)+',pg_catalog']);
  const after=await activationInventory(c,options.schema);
  for(const table of before.data.filter(t=>t.table_name!=='item'))if(!same(table,after.data.find(t=>t.table_name===table.table_name)))fail('PRESERVATION_FAILED');
  if(!same(before.structure.sequences,after.structure.sequences.filter(s=>s.sequencename!=='producte_id_seq')))fail('SEQUENCES_CHANGED');
  if(after.data.find(t=>t.table_name==='item')?.count!==0||after.data.find(t=>t.table_name==='producte')?.count!==0||!after.structure.columns.some(r=>r.table_name==='item'&&r.column_name==='producte_id'&&r.is_nullable==='NO')||!after.structure.constraints.some(r=>r.table_name==='item'&&r.conname==='fk_item_producte'&&r.convalidated===true))fail('INTEGRITY_FAILED');
  for(const key of ['columns','constraints','indexes'] as const){
   for(const original of before.structure[key])if(!after.structure[key].some(row=>same(row,original)))fail('STRUCTURE_PRESERVATION_FAILED');
  }
  const productSequence=after.structure.sequences.find(s=>s.sequencename==='producte_id_seq');
  if(!productSequence||productSequence.last_value!=='1'||productSequence.is_called!==false)fail('PRODUCT_SEQUENCE_INVALID');
  commitSent=true;await c.query('COMMIT');return {mode:'apply' as const,valid:true,deleted:3};
 }catch(error){
  try{await c.query('ROLLBACK');}catch{releaseError=Error('Uncertain transaction');throw new ActivationError('PERSISTENCE_UNCERTAIN');}
  if(commitSent){releaseError=Error('Uncertain commit');throw new ActivationError('PERSISTENCE_UNCERTAIN');}
  if(error instanceof ActivationError)throw error;throw new ActivationError('ACTIVATION_FAILED');
 }finally{c.release(releaseError);}
}
