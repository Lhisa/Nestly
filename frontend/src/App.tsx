import { ItemsPage } from './features/items/ItemsPage';
import { CreateItemPage } from './features/items/CreateItemPage';
import { Route, createRoutesFromElements } from 'react-router';
import { ApplicationShell } from './ApplicationShell';
import { LandingPage, MorePage, NotFoundPage, PlaceholderPage } from './pages';

export const routes = createRoutesFromElements(
  <>
    <Route path="/" element={<LandingPage />} />
    <Route element={<ApplicationShell />}>
      <Route path="/inici" element={<PlaceholderPage title="Inici" message="Dashboard pendent d’implementar." />} />
      <Route path="/items" element={<ItemsPage />} />
      <Route path="/items/nou" element={<CreateItemPage />} />
      <Route path="/llistes" element={<PlaceholderPage title="Llistes" />} />
      <Route path="/recomanacions" element={<PlaceholderPage title="Recomanacions" />} />
      <Route path="/botigues" element={<PlaceholderPage title="Botigues" />} />
      <Route path="/mes" element={<MorePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </>
);
