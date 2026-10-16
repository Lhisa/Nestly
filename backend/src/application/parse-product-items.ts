import type { ProductItemsCreationRequest } from './product-contracts.js';
import { ProductInputError } from './product-errors.js';

const invalid=():never=>{throw new ProductInputError();};
function object(value:unknown):Record<string,unknown> {
  if(value===null||typeof value!=='object'||Array.isArray(value))return invalid();
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null)return invalid();
  return value as Record<string,unknown>;
}
function keys(value:Record<string,unknown>,allowed:string[]):void {
  if(Object.keys(value).some(key=>!allowed.includes(key)))invalid();
}
function integer(value:unknown,min:number,max=2147483647):number {
  if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max)return invalid();
  return value;
}
/** Envolupant intern: transport és derivat pel futur controlador de Content-Type.
 * No parseja el wire multipart ni substitueix els límits de parts/fitxers. */
export function parseProductItemsCreationRequest(value:unknown):ProductItemsCreationRequest {
  const request=object(value),transport=request.transport;
  if(transport!=='json'&&transport!=='multipart')return invalid();
  keys(request,transport==='json'?['transport','data']:['transport','data','photo']);
  const data=object(request.data),product=object(data.product);
  keys(data,['product','quantitat','estat_preparacio','photo_decision']);
  const quantitat=integer(data.quantitat,1,100),state=data.estat_preparacio;
  if(state!=='preparada'&&state!=='no_preparada')return invalid();
  const base={quantitat,estat_preparacio:state} as const;
  if(product.mode==='new') {
    keys(product,['mode','nom','categoria_id','subcategoria_id']);
    const nom=product.nom;
    if(typeof nom!=='string'||!nom.trim()||!/\p{L}/u.test(nom)||[...nom].length>100||/[\u0000\uD800-\uDFFF]/u.test(nom))return invalid();
    if(Object.hasOwn(data,'photo_decision'))return invalid();
    const selection={mode:'new' as const,nom,categoria_id:integer(product.categoria_id,1),subcategoria_id:integer(product.subcategoria_id,1)};
    const parsed={...base,product:selection};
    if(transport==='json')return {transport,data:parsed};
    if(!(request.photo instanceof Uint8Array))return invalid();
    return {transport,data:parsed,photo:request.photo};
  }
  if(product.mode!=='existing')return invalid();
  keys(product,['mode','producte_id']);
  const selection={mode:'existing' as const,producte_id:integer(product.producte_id,1)};
  if(transport==='json') {
    if(Object.hasOwn(data,'photo_decision'))return invalid();
    return {transport,data:{...base,product:selection}};
  }
  const decision=object(data.photo_decision);
  keys(decision,['expected_version','replace_confirmed']);
  const expected_version=integer(decision.expected_version,0);
  if(typeof decision.replace_confirmed!=='boolean'||!(request.photo instanceof Uint8Array))return invalid();
  return {transport,data:{...base,product:selection,photo_decision:{expected_version,replace_confirmed:decision.replace_confirmed}},photo:request.photo};
}
