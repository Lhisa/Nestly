import type {DataModel} from './data-model';
import {ProductCreateItemsPage} from './features/items/ProductCreateItemsPage';
import {ProductItemsPage,ProductItemDetailPage} from './features/items/ProductReadPages';
import { ItemsPage } from './features/items/ItemsPage';
import { CreateItemPage } from './features/items/CreateItemPage';
import { ItemDetailPage } from './features/items/ItemDetailPage';
import { Route, createRoutesFromElements } from 'react-router';
import { ApplicationShell } from './ApplicationShell';
import { LandingPage, MorePage, NotFoundPage, PlaceholderPage } from './pages';

export const createApplicationRoutes = (model:DataModel = 'legacy') => createRoutesFromElements(
  <>
    <Route path="/" element={<LandingPage />} />
    <Route element={<ApplicationShell />}>
      <Route path="/inici" element={<PlaceholderPage title="Inici" message="Dashboard pendent d’implementar." />} />
      <Route path="/items" element={model === 'products-v1' ? <ProductItemsPage /> : <ItemsPage />} />
      <Route path="/items/nou" element={model === 'products-v1' ? <ProductCreateItemsPage /> : <CreateItemPage />} />
      <Route path="/items/:id" element={model === 'products-v1' ? <ProductItemDetailPage /> : <ItemDetailPage />} />
      <Route path="/llistes" element={<PlaceholderPage title="Llistes" />} />
      <Route path="/recomanacions" element={<PlaceholderPage title="Recomanacions" />} />
      <Route path="/botigues" element={<PlaceholderPage title="Botigues" />} />
      <Route path="/mes" element={<MorePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </>
);

export const routes = createApplicationRoutes();
