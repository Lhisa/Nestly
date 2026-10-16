export type PreparationState='preparada'|'no_preparada';
export interface ProductSummary {
  id:number;nom:string;category:{id:number;nom:string};subcategory:{id:number;nom:string};
  foto_ref:string|null;foto_versio:number;
}
export type ProductItemsInput={quantitat:number;estat_preparacio:PreparationState}&(
  |{product:{mode:'new';nom:string;categoria_id:number;subcategoria_id:number};photo_decision?:never}
  |{product:{mode:'existing';producte_id:number};photo_decision?:{expected_version:number;replace_confirmed:boolean}}
);
export interface ProductUnitResponse {
  id:number;producte_id:number;nom:string;subcategoria_id:number;foto_ref:string|null;
  estat_preparacio:PreparationState|null;data_creacio:string;data_entrada_casa:string|null;
}
export interface ProductCreationResponse {created_count:number;items:ProductUnitResponse[]}
export type ProductApiErrorCode='INVALID_INPUT'|'PRODUCT_NOT_FOUND'|'PHOTO_CONFIRMATION_REQUIRED'|'PHOTO_VERSION_CONFLICT'|'PERSISTENCE_UNCERTAIN'|'PHOTO_INVALID'|'PHOTO_UNAVAILABLE'|'INTERNAL_ERROR';
export class ProductApiError extends Error {
  constructor(public readonly code:ProductApiErrorCode,message:string,public readonly product?:ProductSummary){super(message);}
}
function summary(value:unknown):value is ProductSummary {
  if(!value||typeof value!=='object')return false;
  const p=value as ProductSummary;
  return Number.isInteger(p.id)&&p.id>0&&typeof p.nom==='string'&&Number.isInteger(p.category?.id)&&typeof p.category?.nom==='string'&&Number.isInteger(p.subcategory?.id)&&typeof p.subcategory?.nom==='string'&&(p.foto_ref===null||typeof p.foto_ref==='string')&&Number.isInteger(p.foto_versio)&&p.foto_versio>=0;
}
export async function fetchProducts(signal?:AbortSignal):Promise<ProductSummary[]>{
  const response=await fetch('/api/products',{signal});
  if(!response.ok)throw new Error('No s’ha pogut carregar el catàleg de productes.');
  const body=await response.json();
  if(!Array.isArray(body.products)||!body.products.every(summary))throw new Error('No s’ha pogut carregar el catàleg de productes.');
  return body.products;
}
/** Client separat del legacy. Cap reintent; el transport de FormData el determina el navegador. */
export async function createProductItems(input:ProductItemsInput,photo?:File|null):Promise<ProductCreationResponse>{
  let request:RequestInit;
  if(photo){const body=new FormData();body.append('data',JSON.stringify(input));body.append('photo',photo);request={method:'POST',headers:{'X-Nestly-Model':'products-v1'},body};}
  else request={method:'POST',headers:{'Content-Type':'application/json','X-Nestly-Model':'products-v1'},body:JSON.stringify(input)};
  let response:Response;
  try{response=await fetch('/api/items',request);}
  catch{throw new ProductApiError('PERSISTENCE_UNCERTAIN','No podem confirmar el resultat. Revisa l’inventari abans de repetir l’operació.');}
  const body=await response.json().catch(()=>null);
  if(response.status===201){
    if(body&&Number.isInteger(body.created_count)&&Array.isArray(body.items))return body;
    throw new ProductApiError('PERSISTENCE_UNCERTAIN','No podem confirmar el resultat. Revisa l’inventari abans de repetir l’operació.');
  }
  if(response.status===409&&(body?.code==='PHOTO_CONFIRMATION_REQUIRED'||body?.code==='PHOTO_VERSION_CONFLICT')&&summary(body.product))throw new ProductApiError(body.code,body.code==='PHOTO_VERSION_CONFLICT'?'La fotografia ha canviat. Revisa l’estat actual i confirma de nou.':'Confirma la substitució per a totes les unitats.',body.product);
  if(body?.code==='PERSISTENCE_UNCERTAIN')throw new ProductApiError('PERSISTENCE_UNCERTAIN','No podem confirmar el resultat. Revisa l’inventari abans de repetir l’operació.');
  if(response.status===400)throw new ProductApiError('INVALID_INPUT','Revisa les dades del formulari.');
  if(response.status===404)throw new ProductApiError('PRODUCT_NOT_FOUND','El producte ja no està disponible. Selecciona’n un altre.');
  if(response.status===413)throw new ProductApiError('PHOTO_INVALID','La fotografia o les dades superen el límit permès. Màxim 10.000.000 bytes per fotografia.');
  if(response.status===415||response.status===422)throw new ProductApiError('PHOTO_INVALID','No s’ha pogut processar la fotografia. Utilitza JPEG, PNG o WebP.');
  if(response.status===503)throw new ProductApiError('PHOTO_UNAVAILABLE','El servei no està disponible. Conserva les dades i torna-ho a provar més tard.');
  throw new ProductApiError('INTERNAL_ERROR','No s’ha pogut completar l’operació. Revisa l’inventari abans de repetir-la.');
}
