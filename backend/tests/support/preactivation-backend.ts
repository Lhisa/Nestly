import {productWriteBarrier} from '../../src/http/write-barrier.js';
import express from 'express';import {Pool} from 'pg';import {createRuntimeApp} from '../../src/http/runtime-app.js';
const url=new URL(process.env.DATABASE_URL!),schema=process.env.REHEARSAL_SCHEMA!;
if(url.pathname!=='/nestly_test'||!/^migration_e_[0-9a-f]{32}$/.test(schema))throw Error('Invalid rehearsal');
const pool=new Pool({connectionString:url.href,options:'-c search_path='+schema});let uncertain=false,slow=false,fail=false,posts=0;
const wrapped=new Proxy(pool,{get(t,k){if(k==='connect')return async()=>{const c=await t.connect();return {query:async(sql:string,v?:unknown[])=>{const r=await c.query(sql,v);if(sql==='COMMIT'&&uncertain){uncertain=false;throw Error('Synthetic lost COMMIT acknowledgement');}return r;},release:(e?:Error)=>c.release(e)};};const v=Reflect.get(t,k);return typeof v==='function'?v.bind(t):v;}});
try{
 const runtime=await createRuntimeApp(wrapped,process.env.NESTLY_DATA_MODEL,process.env.NESTLY_PHOTO_ROOT,process.env.NESTLY_DATA_MODEL==='products-v1'?productWriteBarrier(process.env.NESTLY_PRODUCT_WRITES):undefined),app=express();
 app.use('/api',async(req,res,next)=>{if(req.method==='POST'&&req.path==='/items')process.send?.({event:'post',posts:++posts});if(req.method==='GET'&&req.path==='/items'){if(slow)await new Promise(r=>setTimeout(r,1200));if(fail){fail=false;res.status(503).json({code:'SYNTHETIC_READ_ERROR'});return;}}next();});app.use(runtime);
 const server=app.listen(Number(process.env.REHEARSAL_PORT),'127.0.0.1',()=>process.send?.({event:'ready',pid:process.pid}));
 process.on('message',async(m:{command:string})=>{if(m.command==='uncertain')uncertain=true;if(m.command==='slow-on')slow=true;if(m.command==='slow-off')slow=false;if(m.command==='fail-read')fail=true;if(m.command==='stop'){await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));await pool.end();process.exit(0);}process.send?.({event:'ack',command:m.command});});
}catch{await pool.end();process.send?.({event:'startup-rejected'});process.exit(1);}
