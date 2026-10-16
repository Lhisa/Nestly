import {Pool} from 'pg';
import {createRuntimeApp,selectDataModel} from './http/runtime-app.js';
import {WriteBarrier,productWriteBarrier} from './http/write-barrier.js';
const connectionString=process.env.DATABASE_URL;
if(!connectionString)throw Error('Cal configurar DATABASE_URL abans d’arrencar el backend.');
const model=selectDataModel(process.env.NESTLY_DATA_MODEL);
const barrier=model==='products-v1'?productWriteBarrier(process.env.NESTLY_PRODUCT_WRITES):new WriteBarrier('open');
const pool=new Pool({connectionString,connectionTimeoutMillis:5000});
pool.on('error',()=>console.error('Error inesperat de PostgreSQL.'));
const app=await createRuntimeApp(pool,model,process.env.NESTLY_PHOTO_ROOT,barrier);
const port=3000;
const server=app.listen(port,'127.0.0.1',()=>{console.log(`Nestly backend: http://127.0.0.1:${port}; escriptures ${barrier.status.accepting?'obertes':'bloquejades'}`);});
let stopping=false;
async function stop(){
 if(stopping)return;stopping=true;barrier.block();
 try{await barrier.closeAndDrain();await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));await pool.end();process.exitCode=0;}
 catch{console.error('DRENATGE NO CONFIRMAT: escriptures bloquejades. Cal verificar processos, PostgreSQL i fitxers abans de continuar.');process.exitCode=1;}
}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
