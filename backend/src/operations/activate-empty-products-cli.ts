/** Eina manual exclusivament: no importada pel backend. Executar amb tsx des de backend. */
import {Pool} from 'pg';
import {activateEmptyProducts,ActivationError} from './activate-empty-products.js';
const args=process.argv.slice(2),allowed=new Set(['--mode','--database','--schema','--manifest','--approved-manifest-sha256','--enable-activation','--writers-paused','--confirm-delete']);
const values=new Map<string,string>();
try{
 for(let i=0;i<args.length;i+=2){if(!allowed.has(args[i])||values.has(args[i])||!args[i+1]||args[i+1].startsWith('--'))throw Error();values.set(args[i],args[i+1]);}
 const required=(k:string)=>{const v=values.get(k);if(!v)throw Error();return v;};
 if(!process.env.DATABASE_URL)throw Error();
 const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
 try{const mode=values.get('--mode')??'prevalidate';if(mode!=='prevalidate'&&mode!=='apply')throw Error();
 console.log(JSON.stringify(await activateEmptyProducts(pool,{mode,database:required('--database'),schema:required('--schema'),manifestPath:required('--manifest'),approvedManifestSha256:required('--approved-manifest-sha256'),enabled:values.get('--enable-activation')==='yes',writersPaused:values.get('--writers-paused')==='yes',confirmDeleteIds:values.get('--confirm-delete')==='1,2,3'?[1,2,3]:[]})));}
 finally{await pool.end();}
}catch(error){console.error(error instanceof ActivationError?error.code:'ACTIVATION_CONFIGURATION_OR_IO_ERROR');process.exitCode=1;}
