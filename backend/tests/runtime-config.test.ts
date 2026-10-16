import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect,test} from 'vitest';
import {selectDataModel} from '../src/http/runtime-app.js';
import {validateProductPhotoRoot} from '../src/infrastructure/product-photo-root.js';
test('selecció estricta i arrel persistent: sense fallback, ni temporals o Git en producció',async()=>{
 expect(selectDataModel()).toBe('legacy');expect(selectDataModel('products-v1')).toBe('products-v1');expect(()=>selectDataModel('invalid')).toThrow();
 const root=await mkdtemp(join(tmpdir(),'nestly-root-policy-'));
 try{
  await expect(validateProductPhotoRoot(root)).rejects.toThrow('temporal');
  await expect(validateProductPhotoRoot(root,true)).resolves.toBeUndefined();
  await expect(validateProductPhotoRoot('relative')).rejects.toThrow('absoluta');
  const repo=join(root,'repo'),photos=join(repo,'photos');await mkdir(join(repo,'.git'),{recursive:true});await mkdir(photos,{mode:0o700});
  await expect(validateProductPhotoRoot(photos,true)).rejects.toThrow('Git');
 }finally{await rm(root,{recursive:true});}
});
