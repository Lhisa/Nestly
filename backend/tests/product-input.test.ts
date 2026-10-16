import {expect,test} from 'vitest';
import {parseProductItemsCreationRequest as parse} from '../src/application/parse-product-items.js';
import {ProductInputError,ProductNotFoundError} from '../src/application/product-errors.js';
import {ProductPersistenceUncertainError,ProductPhotoConflictError} from '../src/application/product-persistence.js';
import {mapProductCreationError as map} from '../src/http/product-error-mapping.js';
import {PhotoProcessingError} from '../src/application/item-photos.js';
const data={product:{mode:'new',nom:' Body ',categoria_id:1,subcategoria_id:1},quantitat:2,estat_preparacio:'preparada'};
const existing={...data,product:{mode:'existing',producte_id:7}};
const decision={expected_version:0,replace_confirmed:false};
const photo=new Uint8Array([1]);

test('variants JSON i multipart vàlides, sense coercions ni normalització del nom',()=>{
  for(const request of [{transport:'json',data},{transport:'json',data:existing},{transport:'multipart',data,photo},{transport:'multipart',data:{...existing,photo_decision:decision},photo}]){
    expect(parse(request)).toEqual(request);
  }
  expect(parse({transport:'json',data})).not.toBe(data);
});

test('formes malformades i camps desconeguts, inclòs foto_ref, sempre donen error tipat',()=>{
  const malformed=[null,undefined,[],1,'data',{}, {transport:'json'}, {transport:'json',data:null}, {transport:'json',data:[]}, {transport:'json',data:{...data,product:null}}, {transport:'json',data:{...data,product:[]}}, {transport:'xml',data}, {transport:'json',data,photo}, {transport:'json',data:{...data,foto_ref:'private'}}, {transport:'json',data:{...data,product:{...data.product,foto_ref:'private'}}}, {transport:'json',data,foto_ref:'private'}, {transport:'multipart',data:{...existing,photo_decision:{...decision,foto_ref:'private'}},photo}];
  for(const value of malformed)expect(()=>parse(value)).toThrow(ProductInputError);
});

test('discriminants, límits numèrics, preparació i decisions incompatibles es rebutgen',()=>{
  const invalidData=[
    ...[null,'2',0,101,1.5,NaN].map(quantitat=>({...data,quantitat})),
    ...[null,'PREPARAT',true].map(estat_preparacio=>({...data,estat_preparacio})),
    ...['', '123','a'.repeat(101),' x'+'a'.repeat(100), '\u0000x','\uD800x'].map(nom=>({...data,product:{...data.product,nom}})),
    ...[0,-1,1.5,'1',2147483648].map(categoria_id=>({...data,product:{...data.product,categoria_id}})),
    ...[0,null,'1'].map(subcategoria_id=>({...data,product:{...data.product,subcategoria_id}})),
    ...[0,1.5,'7',2147483648].map(producte_id=>({...existing,product:{mode:'existing',producte_id}})),
    {...data,product:{...data.product,mode:'other'}},{...data,product:{...data.product,producte_id:7}},
    {...existing,product:{...existing.product,nom:'Injected'}}, {...data,photo_decision:decision},{...existing,photo_decision:decision},
  ];
  for(const value of invalidData)expect(()=>parse({transport:'json',data:value})).toThrow(ProductInputError);
  for(const value of [null,[],{}, {...decision,expected_version:-1},{...decision,expected_version:1.5},{...decision,expected_version:2147483648},{...decision,replace_confirmed:'true'}])expect(()=>parse({transport:'multipart',data:{...existing,photo_decision:value},photo})).toThrow(ProductInputError);
  for(const value of [undefined,null,'bytes',[]])expect(()=>parse({transport:'multipart',data,photo:value})).toThrow(ProductInputError);
  expect(()=>parse({transport:'multipart',data:{...data,photo_decision:decision},photo})).toThrow(ProductInputError);
});

test('mapatge pur diferencia errors esperats i no exposa missatges, causes ni propietats internes',()=>{
  const secret=Error('SQL password C:/private/photo.webp stack');
  expect(map(new ProductInputError()).status).toBe(400);
  expect(map(new ProductNotFoundError()).status).toBe(404);
  const product={id:7,nom:'Body',category:{id:1,nom:'Roba'},subcategory:{id:1,nom:'Bodies'},foto_ref:null,foto_versio:2,private_path:'C:/private'};
  for(const code of ['PHOTO_CONFIRMATION_REQUIRED','PHOTO_VERSION_CONFLICT'] as const){
    const mapped=map(new ProductPhotoConflictError(code,product));
    expect(mapped.status).toBe(409);expect(mapped.body).toMatchObject({code,product:{id:7,foto_versio:2}});expect(JSON.stringify(mapped)).not.toContain('private_path');
  }
  const uncertain=map(new ProductPersistenceUncertainError(secret));
  expect(uncertain).toMatchObject({status:503,body:{code:'PERSISTENCE_UNCERTAIN'}});
  expect(JSON.stringify(uncertain)).toContain('abans de repetir');
  for(const error of [secret,new ProductPersistenceUncertainError(secret),{message:secret.message,stack:'secret'}]){
    expect(JSON.stringify(map(error))).not.toContain('SQL');expect(JSON.stringify(map(error))).not.toContain('private');expect(JSON.stringify(map(error))).not.toContain('stack');
  }
  expect(map(secret).status).toBe(500);
  expect(map(new PhotoProcessingError('SIZE')).status).toBe(413);
});
