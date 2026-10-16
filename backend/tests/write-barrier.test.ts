import {EventEmitter} from 'node:events';
import type {Request,Response} from 'express';
import {expect,test} from 'vitest';
import {WriteBarrier,productWriteBarrier} from '../src/http/write-barrier.js';
test('configuració tancada per defecte i drenatge conservador davant client desconnectat',async()=>{
 expect(productWriteBarrier().status.accepting).toBe(false);expect(()=>productWriteBarrier('yes')).toThrow();
 const gate=productWriteBarrier('open'),response=new EventEmitter();
 gate.middleware({method:'POST'} as Request,response as Response,()=>{});
 expect(gate.status.inFlight).toBe(1);const drain=gate.closeAndDrain();const check=expect(drain).rejects.toThrow('DRAIN_UNCERTAIN');
 response.emit('close');response.emit('finish');await check;
 expect(gate.status).toEqual({accepting:false,inFlight:1,uncertain:true});expect(()=>gate.open()).toThrow();await expect(gate.closeAndDrain()).rejects.toThrow('DRAIN_UNCERTAIN');
});
test('timeout de drenatge no reobre la barrera ni assumeix que el treball ha acabat',async()=>{
 const gate=new WriteBarrier('open'),response=new EventEmitter();gate.middleware({method:'POST'} as Request,response as Response,()=>{});
 await expect(gate.closeAndDrain(0)).rejects.toThrow('DRAIN_TIMEOUT');expect(()=>gate.open()).toThrow();
 response.emit('finish');await gate.closeAndDrain();expect(gate.status.inFlight).toBe(0);gate.open();expect(gate.status.accepting).toBe(true);
});
