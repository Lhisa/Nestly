import { ItemsPage } from './features/items/ItemsPage';
import { Route, Routes } from 'react-router';
import { ApplicationShell } from './ApplicationShell';
import { LandingPage, MorePage, NotFoundPage, PlaceholderPage } from './pages';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<ApplicationShell />}>
        <Route path="/inici" element={<PlaceholderPage title="Inici" message="Dashboard pendent d’implementar." />} />
        <Route path="/items" element={<ItemsPage />} />
        <Route path="/llistes" element={<PlaceholderPage title="Llistes" />} />
        <Route path="/recomanacions" element={<PlaceholderPage title="Recomanacions" />} />
        <Route path="/botigues" element={<PlaceholderPage title="Botigues" />} />
        <Route path="/mes" element={<MorePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
