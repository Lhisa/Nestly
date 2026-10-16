import type { GroupedHomeItemsResponse, ItemGroup } from './items-api';
import type { ProductUnitResponse } from './product-items-api';
export interface ProductItemGroup extends ItemGroup {producte_id:number}
export interface GroupedProductItemsResponse extends GroupedHomeItemsResponse {groups:ProductItemGroup[]}
/** Lectures explícites, sense fallback legacy. */
export async function fetchProductInventory(signal?:AbortSignal,query=''):Promise<GroupedProductItemsResponse>{
  const response=await fetch('/api/items'+(query?'?'+query:''),{signal});
  if(!response.ok)throw Error('No s’ha pogut carregar l’inventari de productes.');
  const data:GroupedProductItemsResponse=await response.json();
  if(!Array.isArray(data.groups)||data.groups.some(g=>!Number.isInteger(g.producte_id)||g.producte_id<1||g.key!==`home-products:v1:${g.producte_id}`))throw Error('Contracte de productes incompatible.');
  return data;
}
export async function fetchProductItem(id:string,signal?:AbortSignal):Promise<ProductUnitResponse|null>{
  const response=await fetch('/api/items/'+encodeURIComponent(id),{signal});
  if(response.status===404)return null;
  if(!response.ok)throw Error('No s’ha pogut carregar l’Item.');
  const {item}=await response.json();
  if(!item||!Number.isInteger(item.producte_id)||item.producte_id<1)throw Error('Contracte de productes incompatible.');
  return item;
}
