// @vitest-environment jsdom
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ItemsPage } from './ItemsPage';
import type { GroupedHomeItemsResponse, ItemGroup } from './items-api';
import { canonicalItemsSearch, itemFilterQuery, provisionalItemFilters } from './items-url';

const categories = [{ id: 1, nom: 'Roba', subcategories: [{ id: 2, nom: 'Bodies' }] }, { id: 3, nom: 'Descans', subcategories: [{ id: 4, nom: 'Mantes' }] }];
const group = (count: number): ItemGroup => ({ key: 'opaque', name: 'Body', category: { id: 1, name: 'Roba' }, subcategory: { id: 2, name: 'Bodies' }, total_units: count, preparation_counts: { prepared: 0, not_prepared: 0, unspecified: count }, units: Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `body ${i + 1}`, preparation_status: null, created_at: '2026-10-01T00:00:00.000Z' })) });
const response = (count = 1): GroupedHomeItemsResponse => ({ filters: { categoria_id: null, subcategoria_id: null }, corrections: [], inventory_count: count, matched_count: count, groups: count ? [group(count)] : [] });
const clients: QueryClient[] = [];
const routers: ReturnType<typeof createMemoryRouter>[] = [];
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); routers.forEach((router) => router.dispose()); clients.length = 0; routers.length = 0; vi.unstubAllGlobals(); });
function mount(load: (url: string) => Promise<Response>, path = '/items') {
  const fetch = vi.fn((url: string) => url === '/api/categories' ? Promise.resolve(Response.json({ categories })) : load(url));
  vi.stubGlobal('fetch', fetch);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  const router = createMemoryRouter([{ path: '/items', element: <ItemsPage /> }], { initialEntries: [path] }); routers.push(router);
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  return { router, fetch, user: userEvent.setup() };
}

test('URL preserva repeticions de filtre i paràmetres aliens', () => {
  expect(itemFilterQuery('?view=home&categoria_id=1&categoria_id=01')).toBe('categoria_id=1&categoria_id=01');
  expect(canonicalItemsSearch('?view=home&view=other&categoria_id=x&subcategoria_id=02', { categoria_id: 1, subcategoria_id: 2 })).toBe('?view=home&view=other&categoria_id=1&subcategoria_id=2');
});

test.each([
  ['categoria_id=01&subcategoria_id=02', 1, 2],
  ['subcategoria_id=2', null, 2],
  ['categoria_id=1&categoria_id=1', 1, null],
  ['categoria_id=1&categoria_id=01', null, null],
  ['categoria_id=%201&subcategoria_id=2147483648', null, null],
])('representació provisional de %s sense corregir ni inferir', (search, category, subcategory) => {
  expect(provisionalItemFilters(search)).toEqual({ categoria_id: category, subcategoria_id: subcategory });
});

test('selectors coherents durant càrrega i error inicial amb filtres a URL', async () => {
  let finish!: (value: Response) => void;
  const { router } = mount(() => new Promise((resolve) => { finish = resolve; }), '/items?categoria_id=01&subcategoria_id=02&view=home');
  const category = await screen.findByLabelText<HTMLSelectElement>('Categoria', { selector: '#desktop-category' });
  const subcategory = screen.getByLabelText<HTMLSelectElement>('Subcategoria', { selector: '#desktop-subcategory' });
  expect(category.value).toBe('1');
  expect(subcategory.value).toBe('2');
  await act(async () => { finish(new Response('', { status: 500 })); });
  await screen.findByRole('alert');
  expect(category.value).toBe('1');
  expect(subcategory.value).toBe('2');
  expect(router.state.location.search).toBe('?categoria_id=01&subcategoria_id=02&view=home');
});

test('subcategoria sense categoria es representa provisionalment sense inferir URL', async () => {
  mount(async () => new Response('', { status: 500 }), '/items?subcategoria_id=2');
  await screen.findByRole('alert');
  expect(screen.getByLabelText<HTMLSelectElement>('Categoria', { selector: '#desktop-category' }).value).toBe('');
  expect(screen.getByLabelText<HTMLSelectElement>('Subcategoria', { selector: '#desktop-subcategory' }).value).toBe('2');
});

test('resposta antiga retardada no sobreescriu el canvi més recent', async () => {
  const pending = new Map<string, (value: Response) => void>();
  const { router, user } = mount((url) => new Promise((resolve) => { pending.set(url, resolve); }), '/items?view=home');
  const category = await screen.findByLabelText<HTMLSelectElement>('Categoria', { selector: '#desktop-category' });
  await user.selectOptions(category, '1');
  await waitFor(() => expect(pending.has('/api/items?categoria_id=1')).toBe(true));
  expect(category.value).toBe('1');
  await user.selectOptions(category, '3');
  await waitFor(() => expect(pending.has('/api/items?categoria_id=3')).toBe(true));
  expect(category.value).toBe('3');
  await act(async () => { pending.get('/api/items?categoria_id=3')!(Response.json({ ...response(), filters: { categoria_id: 3, subcategoria_id: null } })); });
  await screen.findByText('Item 1');
  await act(async () => {
    pending.get('/api/items?categoria_id=1')!(Response.json({ ...response(), filters: { categoria_id: 1, subcategoria_id: 2 } }));
    pending.get('/api/items')!(Response.json(response()));
  });
  expect(router.state.location.search).toBe('?view=home&categoria_id=3');
  expect(category.value).toBe('3');
  expect(screen.getByLabelText<HTMLSelectElement>('Subcategoria', { selector: '#desktop-subcategory' }).value).toBe('');
});

test('unitat individual sense desplegable ni comptador i amb enllaç de detall', async () => {
  mount(async () => Response.json(response()));
  await screen.findByText('Item 1');
  expect(screen.getByText('Estat no indicat')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Desplega/ })).toBeNull();
  expect(screen.queryByText('1 unitats')).toBeNull();
  expect(screen.getByRole('link', { name: /body/ }).getAttribute('href')).toBe('/items/1');
});

test('grup plegat, cinc unitats inicials i paginació en blocs de cinc', async () => {
  const { user } = mount(async () => Response.json(response(12)));
  const toggle = await screen.findByRole('button', { name: 'Desplega Body' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByText('Item 1')).toBeNull();
  expect(screen.getByRole('list', { name: 'Recomptes de preparació' }).textContent).toContain('12 amb estat no indicat');
  await user.click(toggle);
  expect(screen.getAllByText(/^Item \d/)).toHaveLength(5);
  await user.click(screen.getByRole('button', { name: "Mostra'n més" }));
  expect(screen.getAllByText(/^Item \d/)).toHaveLength(10);
  await user.click(screen.getByRole('button', { name: "Mostra'n més" }));
  expect(screen.getAllByText(/^Item \d/)).toHaveLength(12);
  expect(screen.queryByRole('button', { name: "Mostra'n més" })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Plega Body' }));
  await user.click(screen.getByRole('button', { name: 'Desplega Body' }));
  expect(screen.getAllByText(/^Item \d/)).toHaveLength(5);
});

test('corregeix i infereix URL amb replace, conservant paràmetres aliens', async () => {
  const { router, fetch } = mount(async () => Response.json({ ...response(), filters: { categoria_id: 1, subcategoria_id: 2 } }), '/items?view=home&subcategoria_id=02');
  await waitFor(() => expect(router.state.location.search).toBe('?view=home&categoria_id=1&subcategoria_id=2'));
  expect(router.state.historyAction).toBe('REPLACE');
  expect(fetch.mock.calls.some(([url]) => url === '/api/items?subcategoria_id=02')).toBe(true);
});

test('canvi de categoria elimina subcategoria incompatible', async () => {
  const { router, user } = mount(async (url) => Response.json({ ...response(), filters: url.includes('categoria_id=3') ? { categoria_id: 3, subcategoria_id: null } : { categoria_id: 1, subcategoria_id: 2 } }), '/items?categoria_id=1&subcategoria_id=2');
  await screen.findByText('Item 1');
  await user.selectOptions(screen.getByLabelText('Categoria', { selector: '#desktop-category' }), '3');
  await waitFor(() => expect(router.state.location.search).toBe('?categoria_id=3'));
});

test.each([
  ['categoria_id=1&categoria_id=01', null],
  ['categoria_id=1&categoria_id=1', 1],
  ['categoria_id=x', null],
])('aplica silenciosament correccions de %s sense eliminar altres paràmetres', async (query, category) => {
  const { router } = mount(async () => Response.json({ ...response(), filters: { categoria_id: category, subcategoria_id: null } }), `/items?view=home&${query}`);
  await waitFor(() => expect(router.state.location.search).toBe(category === null ? '?view=home' : '?view=home&categoria_id=1'));
  expect(router.state.historyAction).toBe('REPLACE');
  expect(screen.queryByRole('alert')).toBeNull();
});

test.each(['preparada', 'no_preparada', null] as const)('unitat amb estat %s mostra text i icona', async (state) => {
  const data = response();
  data.groups[0].units[0].preparation_status = state;
  mount(async () => Response.json(data));
  const label = await screen.findByText(state === null ? 'Estat no indicat' : state === 'preparada' ? 'Preparat' : 'No preparat');
  const icon = label.parentElement?.querySelector('svg');
  expect(icon?.getAttribute('aria-hidden')).toBe('true');
  expect(icon?.getAttribute('focusable')).toBe('false');
  expect(icon?.querySelector(state === 'no_preparada' ? 'circle[stroke-dasharray]' : 'path')).toBeTruthy();
  expect(label.parentElement?.textContent).not.toContain('?');
});

test('panell de filtres manté esborrany fins a Aplica i permet cancel·lar', async () => {
  const { router, user } = mount(async (url) => Response.json({ ...response(), filters: { categoria_id: url.includes('categoria_id=1') ? 1 : null, subcategoria_id: null } }));
  await screen.findByText('Item 1');
  await user.click(screen.getByRole('button', { name: 'Filtres' }));
  const sheet = screen.getByRole('dialog');
  await user.selectOptions(within(sheet).getByLabelText('Categoria'), '1');
  expect(router.state.location.search).toBe('');
  await user.click(within(sheet).getByRole('button', { name: 'Cancel·la' }));
  expect(router.state.location.search).toBe('');
  await user.click(screen.getByRole('button', { name: 'Filtres' }));
  await user.selectOptions(within(sheet).getByLabelText('Categoria'), '1');
  await user.click(within(sheet).getByRole('button', { name: 'Aplica' }));
  await waitFor(() => expect(router.state.location.search).toBe('?categoria_id=1'));
});

test('inventari buit separat de consulta sense coincidències', async () => {
  const { router, user } = mount(async (url) => Response.json(url.includes('categoria_id') ? { ...response(0), inventory_count: 3, filters: { categoria_id: 3, subcategoria_id: null } } : response(0)), '/items?categoria_id=3&view=home');
  await screen.findByText('Cap Item coincideix amb els filtres');
  expect(screen.queryByText('Encara no hi ha Items a casa')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Netejar filtres' }));
  await screen.findByText('Encara no hi ha Items a casa');
  expect(router.state.location.search).toBe('?view=home');
});

test('càrrega i error no simulen buit; reintent conserva filtres', async () => {
  let finish!: (value: Response) => void;
  let attempts = 0;
  const urls: string[] = [];
  const { router, user } = mount((url) => { urls.push(url); attempts++; return attempts === 1 ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve(Response.json({ ...response(), filters: { categoria_id: 1, subcategoria_id: null } })); }, '/items?categoria_id=1');
  expect(screen.getByText('Carregant Items…')).toBeTruthy();
  expect(screen.queryByText('Encara no hi ha Items a casa')).toBeNull();
  finish(new Response('', { status: 500 }));
  await screen.findByRole('alert');
  expect(router.state.location.search).toBe('?categoria_id=1');
  await user.click(screen.getByRole('button', { name: 'Torna-ho a provar' }));
  await screen.findByText('Item 1');
  expect(urls).toEqual(['/api/items?categoria_id=1', '/api/items?categoria_id=1']);
});
