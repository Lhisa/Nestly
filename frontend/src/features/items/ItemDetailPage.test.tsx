// @vitest-environment jsdom
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../../App';
import type { EffectiveFilters, ItemGroup } from './items-api';
import { getCreationContext, getInventoryContext, saveCreationContext, saveInventoryContext } from './inventory-context';

const catalog = [{ id: 1, nom: 'Roba', subcategories: [{ id: 2, nom: 'Bodies' }, { id: 5, nom: 'Pitets' }] }, { id: 3, nom: 'Descans', subcategories: [{ id: 4, nom: 'Mantes' }] }];
const unit = (id: number) => ({ id, name: `body ${id}`, preparation_status: null, foto_ref: null, created_at: '2026-10-01T00:00:00.000Z' });
const group = (count: number): ItemGroup => ({ key: 'stable-group', name: 'Body', category: { id: 1, name: 'Roba' }, subcategory: { id: 2, name: 'Bodies' }, total_units: count, preparation_counts: { prepared: 0, not_prepared: 0, unspecified: count }, units: Array.from({ length: count }, (_, index) => unit(index + 1)) });
const detail = { id: 1, nom: 'body 1', subcategoria_id: 2, estat_preparacio: null, foto_ref: null, data_entrada_casa: null, data_creacio: '2026-10-01T00:00:00.000Z' };
const inventory = (count = 1, filters: EffectiveFilters = { categoria_id: null, subcategoria_id: null }) => ({ groups: count ? [group(count)] : [], filters, corrections: [], inventory_count: count, matched_count: count });
const clients: QueryClient[] = [];
const routers: ReturnType<typeof createMemoryRouter>[] = [];
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); routers.forEach((router) => router.dispose()); clients.length = 0; routers.length = 0; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function mount(path: string, load: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetch = vi.fn((url: string, init?: RequestInit) => url === '/api/categories' ? Promise.resolve(Response.json({ categories: catalog })) : load(url, init));
  vi.stubGlobal('fetch', fetch);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  const router = createMemoryRouter(routes, { initialEntries: [path] }); routers.push(router);
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  return { router, user: userEvent.setup(), fetch };
}

test('detall des de targeta individual mostra nom original, null i classificació', async () => {
  const { router, user } = mount('/items', async (url) => Response.json(url === '/api/items/1' ? { item: detail } : inventory()));
  const access = await screen.findByRole('link', { name: 'Veure el detall de body 1 (Item 1)' });
  expect(access.closest('h2')?.textContent).toBe('body 1');
  expect(access.querySelector('.item-detail-access')?.getAttribute('aria-hidden')).toBe('true');
  expect(access.querySelector('svg path')?.getAttribute('d')).toBe('M7 17 17 7M7 7h10v10');
  await user.click(access);
  await screen.findByRole('heading', { name: 'body 1', level: 1 });
  expect(router.state.location.pathname).toBe('/items/1');
  expect(screen.getByText('Estat no indicat')).toBeTruthy();
  expect(screen.getByText('Roba', { selector: '.item-detail-category' })).toBeTruthy();
  expect(screen.getByText('Bodies', { selector: '.item-detail-subcategory' })).toBeTruthy();
  expect(screen.getByText('Item 1')).toBeTruthy();
});

test('retorn del detall conserva URL, expansió, unitats revelades i scroll', async () => {
  const filters = { categoria_id: 1, subcategoria_id: 2 };
  const { router, user } = mount('/items?subcategoria_id=2&view=home', async (url) => Response.json(url.startsWith('/api/items/8') ? { item: { ...detail, id: 8, nom: 'body 8' } } : inventory(12, filters)));
  await user.click(await screen.findByRole('button', { name: 'Desplega Body' }));
  await user.click(screen.getByRole('button', { name: "Mostra'n més" }));
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(420);
  const access = screen.getByRole('link', { name: 'Veure el detall de body 8 (Item 8)' });
  expect(access.closest('h3')?.textContent).toBe('body 8');
  expect(access.querySelector('.item-detail-access')).toBeTruthy();
  await user.click(access);
  await screen.findByRole('heading', { level: 1, name: 'body 8' });
  await user.click(screen.getByRole('link', { name: 'Tornar a l’inventari' }));
  await screen.findByRole('button', { name: 'Plega Body' });
  expect(screen.getAllByText(/^Item \d/)).toHaveLength(10);
  expect(new URLSearchParams(router.state.location.search).get('subcategoria_id')).toBe('2');
  expect(new URLSearchParams(router.state.location.search).get('view')).toBe('home');
  await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 420, behavior: 'auto' }));
});

test('accés directe només recupera filtres URL, sense expansions ni scroll', async () => {
  const { user } = mount('/items/1?categoria_id=1', async (url) => Response.json(url.startsWith('/api/items/1') ? { item: detail } : inventory(12, { categoria_id: 1, subcategoria_id: null })));
  await screen.findByRole('heading', { name: 'body 1', level: 1 });
  await user.click(screen.getByRole('link', { name: 'Tornar a l’inventari' }));
  await screen.findByRole('button', { name: 'Desplega Body' });
  expect(screen.queryByText('Item 1')).toBeNull();
  expect(window.scrollTo).not.toHaveBeenCalled();
});

test('detall amb càrrega, error i reintent', async () => {
  let finish!: (response: Response) => void;
  let calls = 0;
  const { user } = mount('/items/1', () => ++calls === 1 ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve(Response.json({ item: detail })));
  expect(screen.getByText('Carregant Item…')).toBeTruthy();
  await act(async () => { finish(new Response('', { status: 500 })); });
  await screen.findByRole('alert');
  await user.click(screen.getByRole('button', { name: 'Torna-ho a provar' }));
  await screen.findByRole('heading', { name: 'body 1', level: 1 });
});

test('404 mostra Item inexistent i retorn disponible', async () => {
  mount('/items/99', async () => new Response('', { status: 404 }));
  await screen.findByRole('heading', { name: 'Item inexistent' });
  expect(screen.getByRole('link', { name: 'Tornar a l’inventari' })).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('enllaç de detall té URL estable i clic modificat no navega internament', async () => {
  const { router } = mount('/items?categoria_id=1', async () => Response.json(inventory(1, { categoria_id: 1, subcategoria_id: null })));
  const link = await screen.findByRole('link', { name: 'Veure el detall de body 1 (Item 1)' });
  expect(link.getAttribute('href')).toBe('/items/1?categoria_id=1');
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
  act(() => { link.dispatchEvent(event); });
  expect(event.defaultPrevented).toBe(false);
  expect(router.state.location.pathname).toBe('/items');
});

test('canviar filtres després de tornar del detall descarta expansió i scroll antics', async () => {
  const { router, user } = mount('/items', async (url) => {
    if (url.startsWith('/api/items/1')) return Response.json({ item: detail });
    const category = new URL(url, 'http://localhost').searchParams.get('categoria_id');
    return Response.json(inventory(12, { categoria_id: category ? Number(category) : null, subcategoria_id: null }));
  });
  await user.click(await screen.findByRole('button', { name: 'Desplega Body' }));
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(350);
  await user.click(screen.getByRole('link', { name: 'Veure el detall de body 1 (Item 1)' }));
  await screen.findByRole('heading', { level: 1, name: 'body 1' });
  await user.click(screen.getByRole('link', { name: 'Tornar a l’inventari' }));
  await screen.findByRole('button', { name: 'Plega Body' });
  await waitFor(() => expect(window.scrollTo).toHaveBeenCalled());
  vi.mocked(window.scrollTo).mockClear();
  await user.selectOptions(screen.getByRole('combobox', { name: 'Categoria' }), '3');
  await screen.findByRole('button', { name: 'Desplega Body' });
  expect(router.state.location.state?.inventoryContextKey).toBeUndefined();
  expect(screen.queryByText('Item 1')).toBeNull();
  expect(window.scrollTo).not.toHaveBeenCalled();
  await act(async () => { await router.navigate('/items'); });
  await screen.findByRole('button', { name: 'Desplega Body' });
});

test('retorns successius esperen la consulta lenta i restauren el scroll de cada visita', async () => {
  let slow = false;
  let finish!: (response: Response) => void;
  const { user } = mount('/items', async (url) => {
    if (url === '/api/items/1') return Response.json({ item: detail });
    if (slow) return new Promise((resolve) => { finish = resolve; });
    return Response.json(inventory(12));
  });
  const scroll = vi.spyOn(window, 'scrollY', 'get');
  await screen.findByRole('button', { name: 'Desplega Body' });
  for (const top of [420, 760]) {
    if (screen.queryByRole('button', { name: 'Desplega Body' })) await user.click(screen.getByRole('button', { name: 'Desplega Body' }));
    scroll.mockReturnValue(top);
    await user.click(await screen.findByRole('link', { name: 'Veure el detall de body 1 (Item 1)' }));
    await screen.findByRole('heading', { level: 1, name: 'body 1' });
    clients[0].removeQueries({ queryKey: ['items'] });
    vi.mocked(window.scrollTo).mockClear();
    slow = true;
    await user.click(screen.getByRole('link', { name: 'Tornar a l’inventari' }));
    await screen.findByText('Carregant Items…');
    expect(window.scrollTo).not.toHaveBeenCalled();
    slow = false;
    await act(async () => { finish(Response.json(inventory(12))); });
    await screen.findByRole('button', { name: 'Plega Body' });
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top, behavior: 'auto' }));
    expect(vi.mocked(window.scrollTo).mock.calls).toHaveLength(1);
  }
});

test.each([[[], [1, 2]], [[1], [1, 2]], [[1], []]])('creació amb IDs absents o parcialment visibles %j informa i permet continuar', async (ids, returnedIds) => {
  const { router, user } = mount('/items', async () => Response.json(inventory(ids.length)));
  await screen.findByRole('heading', { name: 'Items a casa' });
  const creationKey = saveCreationContext({ ids: returnedIds, count: 2, previousSearch: '', filters: { categoria_id: null, subcategoria_id: null }, filtersChanged: false });
  await act(async () => { await router.navigate('/items', { state: { createdCount: 2, creationKey } }); });
  await screen.findByRole('heading', { name: 'No hem pogut localitzar tots els Items creats' });
  expect(screen.getByText('S’han creat 2 Items.')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Continua amb l’inventari' }));
  expect(screen.queryByRole('heading', { name: 'No hem pogut localitzar tots els Items creats' })).toBeNull();
  expect(router.state.location.state.creationKey).toBeUndefined();
});

test('reintent localitza els IDs creats sense inventar unitats', async () => {
  const returnedIds = [1, 2];
  let available = false;
  const { router, user } = mount('/items', async () => Response.json(inventory(available ? 2 : 0)));
  const creationKey = saveCreationContext({ ids: returnedIds, count: 2, previousSearch: '', filters: { categoria_id: null, subcategoria_id: null }, filtersChanged: false });
  await act(async () => { await router.navigate('/items', { state: { creationKey } }); });
  await screen.findByRole('heading', { name: 'No hem pogut localitzar tots els Items creats' });
  expect(screen.queryByText('Item 2')).toBeNull();
  available = true;
  await user.click(screen.getByRole('button', { name: 'Torna a consultar l’inventari' }));
  await screen.findByRole('button', { name: 'Plega Body' });
  expect(screen.getByText('Item 2')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'No hem pogut localitzar tots els Items creats' })).toBeNull();
  await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
});

test('contextos temporals limitats i claus desconegudes no restauren res', () => {
  const context = { search: '', hash: '', scrollY: 12, groups: {} };
  const first = saveInventoryContext(context);
  const creation = { ids: [1], count: 1, previousSearch: '', filters: { categoria_id: null, subcategoria_id: null }, filtersChanged: false };
  const firstCreation = saveCreationContext(creation);
  let last = first;
  let lastCreation = firstCreation;
  for (let index = 0; index < 30; index++) { last = saveInventoryContext(context); lastCreation = saveCreationContext(creation); }
  expect(getInventoryContext(first)).toBeUndefined();
  expect(getCreationContext(firstCreation)).toBeUndefined();
  expect(getInventoryContext(last)).toEqual(context);
  expect(getCreationContext(lastCreation)).toEqual(creation);
  expect(getInventoryContext('unknown-history-token')).toBeUndefined();
});

test.each([
  ['?categoria_id=1&subcategoria_id=5', '?categoria_id=1', true],
  ['?categoria_id=3&subcategoria_id=4', '', true],
  ['?categoria_id=1&subcategoria_id=2', '?categoria_id=1&subcategoria_id=2', false],
])('creació múltiple des de %s ajusta només filtres incompatibles', async (previous, adjusted, changed) => {
  let created = false;
  const { router, user } = mount('/items' + previous, async (url, init) => {
    if (init?.method === 'POST') { created = true; return Response.json({ created_count: 2, items: [{ ...detail, id: 7 }, { ...detail, id: 8 }] }, { status: 201 }); }
    const params = new URL(url, 'http://localhost').searchParams;
    const filters = { categoria_id: params.has('categoria_id') ? Number(params.get('categoria_id')) : null, subcategoria_id: params.has('subcategoria_id') ? Number(params.get('subcategoria_id')) : null };
    return Response.json(inventory(created ? 8 : 1, filters));
  });
  await user.click(await screen.findByRole('link', { name: 'Registrar Items' }));
  await user.type(screen.getByLabelText('Nom de l’Item (obligatori)'), 'body');
  await user.selectOptions(await screen.findByLabelText('Categoria (obligatòria)'), '1');
  await user.selectOptions(screen.getByLabelText('Subcategoria (obligatòria)'), '2');
  await user.clear(screen.getByLabelText('Quantitat (obligatòria)'));
  await user.type(screen.getByLabelText('Quantitat (obligatòria)'), '2');
  await user.click(screen.getByRole('button', { name: 'Registrar Items' }));
  await screen.findByText('S’han creat 2 Items.');
  await screen.findByRole('button', { name: 'Plega Body' });
  expect(router.state.location.search).toBe(adjusted);
  expect(screen.getByText('Item 8')).toBeTruthy();
  expect(screen.getByText('Item 7').parentElement?.classList.contains('newly-created')).toBe(true);
  await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' }));
  if (changed) {
    await user.click(screen.getByRole('button', { name: 'Recuperar filtres anteriors' }));
    await waitFor(() => expect(router.state.location.search).toBe(previous));
  } else expect(screen.queryByRole('button', { name: 'Recuperar filtres anteriors' })).toBeNull();
});


test('individual detail displays its persisted photo safely', async () => {
  mount('/items/1', async url => Response.json(url === '/api/items/1' ? { item: { ...detail, foto_ref: 'items/12345678-1234-4123-8123-123456789abc.webp' } } : inventory()));
  expect((await screen.findByRole('img', { name: 'Fotografia de body 1' })).getAttribute('src')).toBe('/api/item-photos/12345678-1234-4123-8123-123456789abc');
});
