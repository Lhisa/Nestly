import type {RequestHandler} from 'express';
/** Barrera local al procés. Cap endpoint permet obrir-la. */
export class WriteBarrier {
 private accepting=false;private active=0;private uncertain=false;
 private waiters=new Set<{resolve:()=>void;reject:(error:Error)=>void}>();
 constructor(initial:'blocked'|'open'='blocked'){this.accepting=initial==='open';}
 get status(){return {accepting:this.accepting,inFlight:this.active,uncertain:this.uncertain};}
 open(){if(this.uncertain||this.active)throw Error('DRAIN_NOT_CONFIRMED');this.accepting=true;}
 block(){this.accepting=false;}
 async closeAndDrain(timeoutMs=15000):Promise<void>{
  this.block();if(this.uncertain)throw Error('DRAIN_UNCERTAIN');if(!this.active)return;
  await new Promise<void>((resolve,reject)=>{
   const waiter={resolve:()=>{clearTimeout(timer);this.waiters.delete(waiter);resolve();},reject:(e:Error)=>{clearTimeout(timer);this.waiters.delete(waiter);reject(e);}};
   const timer=setTimeout(()=>waiter.reject(Error('DRAIN_TIMEOUT')),timeoutMs);this.waiters.add(waiter);
  });
 }
 readonly middleware:RequestHandler=(request,response,next)=>{
  if(['GET','HEAD','OPTIONS'].includes(request.method)){next();return;}
  if(!this.accepting){response.set('Cache-Control','no-store').status(503).json({code:'MAINTENANCE',message:'Nestly està en manteniment. No s’ha iniciat cap modificació.'});return;}
  this.active++;let finished=false,aborted=false;
  response.once('finish',()=>{if(aborted)return;finished=true;this.active--;if(!this.active)for(const w of [...this.waiters])w.resolve();});
  response.once('close',()=>{if(finished)return;aborted=true;this.accepting=false;this.uncertain=true;for(const w of [...this.waiters])w.reject(Error('DRAIN_UNCERTAIN'));});
  next();
 };
}
export function productWriteBarrier(value?:string){
 if(value===undefined||value==='blocked')return new WriteBarrier();
 if(value==='open')return new WriteBarrier('open');
 throw Error('NESTLY_PRODUCT_WRITES invàlid');
}
