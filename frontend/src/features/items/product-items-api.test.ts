// @vitest-environment jsdom
import {afterEach,expect,test,vi} from 'vitest';
import {createProductItems,fetchProducts,ProductApiError} from './product-items-api';
afterEach(()=>vi.unstubAllGlobals());
const input={product:{mode:'existing' as const,producte_id:7},quantitat:2,estat_preparacio:'preparada' as const};
const result={created_count:2,items:[{id:1,producte_id:7},{id:2,producte_id:7}]};

test('JSON sense foto i FormData amb un únic data/photo, sense Content-Type manual',async()=>{
  const fetch=vi.fn(async(_url:string,_init?:RequestInit)=>Response.json(result,{status:201}));vi.stubGlobal('fetch',fetch);
  expect(await createProductItems(input)).toEqual(result);
  expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual(input);
  expect(fetch.mock.calls[0][1]!.headers).toEqual({'Content-Type':'application/json','X-Nestly-Model':'products-v1'});
  const photo=new File(['photo'],'body.png',{type:'image/png'}),withPhoto={...input,photo_decision:{expected_version:3,replace_confirmed:true}};
  await createProductItems(withPhoto,photo);
  const init=fetch.mock.calls[1][1]!,form=init.body as FormData;
  expect(init.headers).toEqual({'X-Nestly-Model':'products-v1'});expect(form.getAll('photo')).toHaveLength(1);expect(form.getAll('data')).toHaveLength(1);expect(JSON.parse(form.get('data') as string)).toEqual(withPhoto);
  expect(JSON.parse(form.get('data') as string)).not.toHaveProperty('transport');
});

test('conflicte tipat conserva producte actual; incertesa i xarxa no reintenten ni mostren detalls interns',async()=>{
  const product={id:7,nom:'Body',category:{id:1,nom:'Roba'},subcategory:{id:2,nom:'Bodies'},foto_ref:null,foto_versio:4};
  const fetch=vi.fn().mockResolvedValueOnce(Response.json({code:'PHOTO_VERSION_CONFLICT',product},{status:409})).mockResolvedValueOnce(Response.json({code:'PERSISTENCE_UNCERTAIN',message:'SQL private password'},{status:503})).mockRejectedValueOnce(Error('private path'));
  vi.stubGlobal('fetch',fetch);
  await expect(createProductItems(input)).rejects.toMatchObject({code:'PHOTO_VERSION_CONFLICT',product});
  for(let i=0;i<2;i++){const error=await createProductItems(input).catch(e=>e);expect(error).toBeInstanceOf(ProductApiError);expect(error.code).toBe('PERSISTENCE_UNCERTAIN');expect(error.message).not.toContain('private');}
  expect(fetch).toHaveBeenCalledTimes(3);
});

test('catàleg manté productes duplicats i respecta AbortSignal',async()=>{
  const products=[{id:1,nom:'Body',category:{id:1,nom:'Roba'},subcategory:{id:2,nom:'Bodies'},foto_ref:null,foto_versio:0},{id:2,nom:'Body',category:{id:1,nom:'Roba'},subcategory:{id:2,nom:'Bodies'},foto_ref:null,foto_versio:0}];
  const fetch=vi.fn(async()=>Response.json({products}));vi.stubGlobal('fetch',fetch);
  const signal=new AbortController().signal;expect(await fetchProducts(signal)).toEqual(products);expect(fetch).toHaveBeenCalledWith('/api/products',{signal});
});
