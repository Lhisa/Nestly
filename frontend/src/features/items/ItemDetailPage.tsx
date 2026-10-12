import { Link, useLocation, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchItem } from './items-api';
import { fetchCategories } from './classification-api';
import { getInventoryContext } from './inventory-context';
import { Preparation } from './ItemsPage';
import './items.css';

export function ItemDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const context = getInventoryContext(location.state?.inventoryContextKey);
  const item = useQuery({ queryKey: ['item', id], queryFn: ({ signal }) => fetchItem(id, signal), retry: false });
  const catalog = useQuery({ queryKey: ['categories'], queryFn: ({ signal }) => fetchCategories(signal), retry: false });
  const category = catalog.data?.find((entry) => entry.subcategories.some((sub) => sub.id === item.data?.subcategoria_id));
  const subcategory = category?.subcategories.find((entry) => entry.id === item.data?.subcategoria_id);
  const missing = item.isSuccess && item.data === null;
  const error = item.isError || (!missing && catalog.isError) || (item.data && catalog.isSuccess && !subcategory);
  return <div className="items-page item-detail-page"><Link className="action-link" to={{ pathname: '/items', search: context?.search ?? location.search, hash: context?.hash ?? '' }} state={context ? { inventoryContextKey: location.state.inventoryContextKey } : null}>Tornar a l’inventari</Link>
    {missing ? <section className="inventory-empty"><h1>Item inexistent</h1><p>Aquest Item no està disponible a l’inventari.</p></section> : error ? <div className="general-error"><p role="alert">No s’ha pogut carregar el detall de l’Item.</p><button onClick={() => { void item.refetch(); void catalog.refetch(); }}>Torna-ho a provar</button></div> : item.isPending || catalog.isPending ? <p role="status">Carregant Item…</p> : item.data && <article className="item-card item-detail-card">
      <header className="item-detail-heading"><h1>{item.data.nom}</h1><p className="item-identifier">Item {item.data.id}</p></header>
      <dl className="item-detail-facts">
        <div><dt>Classificació</dt><dd><p className="item-detail-category">{category?.nom}</p><p className="item-detail-subcategory">{subcategory?.nom}</p></dd></div>
        <div><dt>Estat de preparació</dt><dd><Preparation state={item.data.estat_preparacio} /></dd></div>
      </dl>
    </article>}
  </div>;
}
