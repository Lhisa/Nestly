import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import type {Pool} from 'pg';
import {activationInventory,identifier} from '../../src/operations/activation-inventory.js';
/** Backup/restauració real només de l'esquema sintètic del fixture. */
export async function prepareActivationBackup(pool:Pool,schema:string,root:string){
 const connection=process.env.NESTLY_ITEMS_TEST_DATABASE_URL!;const u=new URL(connection);
 if(u.pathname!=='/nestly_test'||!/^migration_e_[0-9a-f]{32}$/.test(schema))throw Error('Destí de backup de proves invàlid');
 const restoreSchema='activation_restore_'+randomUUID().replaceAll('-','');
 if((await pool.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[restoreSchema])).rowCount)throw Error('Esquema existent');
 const run=(args:string[],input?:Uint8Array|string)=>{
  const r=spawnSync('docker',['exec',...(input===undefined?[]:['-i']),'nestly-postgres-1',...args],{input,maxBuffer:8*1024*1024});if(r.status!==0)throw Error('Backup/restauració sintètics fallits');return r.stdout;
 };
 let restored=false;
 try{
  const c=await pool.connect();let inventory:Awaited<ReturnType<typeof activationInventory>>,archive:Buffer;
  try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');inventory=await activationInventory(c,schema);const snapshot=(await c.query('SELECT pg_export_snapshot() s')).rows[0].s;
   archive=run(['pg_dump','-U',decodeURIComponent(u.username),'-d','nestly_test','--no-password','--format=custom','--schema='+schema,'--snapshot='+snapshot]);await c.query('COMMIT');
  }finally{c.release();}
  // Només dades sintètiques; pg_restore genera SQL i psql tracta correctament COPY.
  const sql=run(['pg_restore','--file=-'],archive).toString().replaceAll(schema,restoreSchema);
  restored=true;run(['psql','-U',decodeURIComponent(u.username),'-d','nestly_test','--no-password','-v','ON_ERROR_STOP=1'],sql);
  const restoredClient=await pool.connect();
  try{await restoredClient.query('BEGIN READ ONLY');await restoredClient.query("SELECT set_config('search_path',$1,true)",[identifier(restoreSchema)]);const actual=await activationInventory(restoredClient,restoreSchema);
   const normalize=(s:string)=>s.replaceAll(restoreSchema,schema).replace(/\(ARRAY\[((?:'[a-z_]+'::character varying)(?:, '[a-z_]+'::character varying)*)\]\)::text\[\]/g,(_,items:string)=>'ARRAY['+items.split(', ').map(v=>'('+v+')::text').join(', ')+']');
   if(normalize(JSON.stringify(actual))!==normalize(JSON.stringify(inventory!)))throw Error('Restauració sintètica divergent');await restoredClient.query('COMMIT');
  }finally{restoredClient.release();}
  const archivePath=join(root,'activation.dump');await writeFile(archivePath,archive!,{flag:'wx'});
  const manifest={version:1,status:'verified',restore_verified:true,source_unchanged:true,source:{database:'nestly_test',host:u.hostname,port:Number(u.port)},archive:'activation.dump',bytes:archive!.length,sha256:createHash('sha256').update(archive!).digest('hex'),item_ids:[1,2,3],inventory:inventory!};
  const manifestPath=join(root,'activation-manifest.json');await writeFile(manifestPath,JSON.stringify(manifest),{flag:'wx'});
  return {manifestPath,approvedManifestSha256:createHash('sha256').update(await readFile(manifestPath)).digest('hex'),restoreSchema};
 }finally{if(restored)await pool.query('DROP SCHEMA '+identifier(restoreSchema)+' CASCADE');}
}
