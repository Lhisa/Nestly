import type { QueryClient } from '@tanstack/react-query';
import type { Category } from './classification-api';
import type { ProductCreationResponse } from './product-items-api';
import {canonicalItemsSearch,provisionalItemFilters} from './items-url';
import {saveCreationContext} from './product-inventory-context';

export async function invalidateProductCreation(cache:QueryClient):Promise<void>{
  // Prefixes inclouen també totes les variants de filtres i tots els detalls antics.
  await Promise.allSettled(['items','item','products'].map(key=>cache.invalidateQueries({queryKey:[key]})));
}
export function productCreationDestination(result:ProductCreationResponse,previousSearch:string,catalog:Category[]){
  const first=result.items[0];
  if(!first||result.created_count!==result.items.length||result.items.some(i=>i.producte_id!==first.producte_id||i.subcategoria_id!==first.subcategoria_id))throw Error('No s’ha pogut resoldre la classificació del lot confirmat.');
  const category=catalog.find(c=>c.subcategories.some(s=>s.id===first.subcategoria_id));
  if(!category)throw Error('Classificació del lot confirmat no disponible.');
  const old=provisionalItemFilters(previousSearch);
  const filters={categoria_id:old.categoria_id!==null&&old.categoria_id!==category.id?null:old.categoria_id,subcategoria_id:old.subcategoria_id!==null&&old.subcategoria_id!==first.subcategoria_id?null:old.subcategoria_id};
  const creationKey=saveCreationContext({ids:result.items.map(i=>i.id),count:result.created_count,previousSearch,filters,filtersChanged:filters.categoria_id!==old.categoria_id||filters.subcategoria_id!==old.subcategoria_id});
  return {to:{pathname:'/items',search:canonicalItemsSearch(previousSearch,filters)},state:{creationKey,createdCount:result.created_count}};
}
