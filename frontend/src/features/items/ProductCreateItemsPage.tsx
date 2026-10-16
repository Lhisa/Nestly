import {useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {Link,useLocation,useNavigate} from 'react-router';
import {CreateProductItemsForm} from './CreateProductItemsForm';
import {fetchCategories} from './classification-api';
import {getInventoryContext} from './product-inventory-context';
import {invalidateProductCreation,productCreationDestination} from './product-navigation';
import type {ProductCreationResponse} from './product-items-api';
/** Wrapper seleccionat només amb les pàgines de products-v1. */
export function ProductCreateItemsPage(){
  const cache=useQueryClient(),navigate=useNavigate(),location=useLocation();
  const [navigationError,setNavigationError]=useState(false);
  const previousSearch=getInventoryContext(location.state?.inventoryContextKey)?.search??location.search;
  const complete=async(result:ProductCreationResponse)=>{
    await invalidateProductCreation(cache);
    try{
      const catalog=await cache.fetchQuery({queryKey:['categories'],queryFn:({signal})=>fetchCategories(signal)});
      const destination=productCreationDestination(result,previousSearch,catalog);
      void navigate(destination.to,{state:destination.state});
    }catch{setNavigationError(true);}
  };
  return <>{navigationError&&<section className="general-error"><p role="alert">Les unitats s’han registrat, però no s’ha pogut preparar el retorn contextual. No repeteixis la creació.</p><Link to={{pathname:'/items',search:previousSearch}}>Tornar a l’inventari</Link></section>}<CreateProductItemsForm onCreated={result=>void complete(result)}/></>;
}
