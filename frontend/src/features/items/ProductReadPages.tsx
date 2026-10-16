import {ItemsPage} from './ItemsPage';
import {ItemDetailPage} from './ItemDetailPage';
import {fetchProductInventory,fetchProductItem} from './product-reads-api';
import * as context from './product-inventory-context';
/** Pàgines seleccionades només amb products-v1. Cache/context separats del legacy. */
export function ProductItemsPage(){return <ItemsPage loadItems={fetchProductInventory} queryScope="products-v1" context={context}/>;}
export function ProductItemDetailPage(){return <ItemDetailPage loadItem={fetchProductItem} queryScope="products-v1" context={context}/>;}
