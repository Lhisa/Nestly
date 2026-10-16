import {expect,test,vi} from 'vitest';
import {createProductItems} from '../src/application/create-product-items.js';
import {ProductPersistenceUncertainError} from '../src/application/product-persistence.js';
import type {ProductItemsReader,ProductsRepository} from '../src/application/product-persistence.js';
import type {ProductItemsCreationRequest} from '../src/application/product-contracts.js';

const request:ProductItemsCreationRequest={transport:'multipart',data:{product:{mode:'new',nom:'Body',categoria_id:1,subcategoria_id:1},quantitat:2,estat_preparacio:'preparada'},photo:new Uint8Array([1])};
const catalog={read:async()=>[{id:1,nom:'Roba',subcategories:[{id:1,nom:'Bodies'}]}]};
const reader={} as ProductItemsReader;

test.each(['rollback','uncertain','cleanup-uncertain'] as const)('compensació conservadora: %s',async mode=>{
  const original=mode==='uncertain'?new ProductPersistenceUncertainError(Error('COMMIT')):Error('SQL');
  const removeIfUnreferenced=vi.fn(async()=>{if(mode==='cleanup-uncertain')throw Error('SQL check uncertain');});
  const save=vi.fn(async()=> 'items/11111111-1111-4111-8111-111111111111.webp');
  const reportIncident=vi.fn();
  const repository:ProductsRepository={createBatchAtomically:vi.fn(async()=>{throw original;})};
  await expect(createProductItems(request,catalog,reader,repository,{processor:{normalize:async()=>({format:'webp',bytes:new Uint8Array([2])})},storage:()=>({save,removeIfUnreferenced}),reportIncident})).rejects.toBe(original);
  if(mode==='uncertain'){expect(removeIfUnreferenced).not.toHaveBeenCalled();expect(reportIncident).toHaveBeenCalledWith(original);}
  else expect(removeIfUnreferenced).toHaveBeenCalledExactlyOnceWith(await save.mock.results[0].value);
  if(mode==='cleanup-uncertain')expect(reportIncident).toHaveBeenCalledOnce();
});

test('referències del client i classificació invàlida es rebutgen abans de processar o desar',async()=>{
  const normalize=vi.fn(),save=vi.fn(),persist=vi.fn();
  const photos={processor:{normalize},storage:()=>({save,removeIfUnreferenced:vi.fn()}),reportIncident:vi.fn()};
  for(const data of [{...request.data,product:{...request.data.product,foto_ref:'items/client.webp'}},{...request.data,product:{mode:'new',nom:'Body',categoria_id:2,subcategoria_id:1}}]){
    await expect(createProductItems({...request,data} as ProductItemsCreationRequest,catalog,reader,{createBatchAtomically:persist},photos)).rejects.toThrow();
  }
  expect(normalize).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled();expect(persist).not.toHaveBeenCalled();
});

test('el checker combinat propaga errors SQL i rebutja resultats incerts',async()=>{
  const {PostgresProductPhotoReferences}=await import('../src/infrastructure/postgres-product-photo-references.js');
  const sqlError=Error('SQL unavailable');
  const failed=new PostgresProductPhotoReferences({query:async()=>{throw sqlError;}} as unknown as import('pg').Pool);
  await expect(failed.hasReferences('items/test.webp')).rejects.toBe(sqlError);
  const uncertain=new PostgresProductPhotoReferences({query:async()=>({rows:[{}]})} as unknown as import('pg').Pool);
  await expect(uncertain.hasReferences('items/test.webp')).rejects.toThrow('incerta');
});
