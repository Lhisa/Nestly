// @vitest-environment jsdom
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../../App';

const clients: QueryClient[] = [];
const routers: ReturnType<typeof createMemoryRouter>[] = [];
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector<HTMLButtonElement>('button')?.focus(); };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0; routers.forEach((router) => router.dispose()); routers.length = 0; vi.unstubAllGlobals(); });
const categories = [{ id: 1, nom: 'Roba', subcategories: [{ id: 2, nom: 'Bodies' }] }, { id: 3, nom: 'Mobles', subcategories: [{ id: 4, nom: 'Bressol' }] }];
const item = { id: 27, nom: 'Body', subcategoria_id: 2, estat_preparacio: 'no_preparada', foto_ref: null, data_entrada_casa: null, data_creacio: '2026-10-10T15:00:00.000Z' };
function mount(path = '/items/nou', post?: (init?: RequestInit) => Promise<Response>, entries?: string[], index?: number) {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/categories') return Response.json({ categories });
    if (init?.method === 'POST') return post ? post(init) : Response.json({ created_count: 3, items: [item] }, { status: 201 });
    return Response.json({ items: [] });
  });
  vi.stubGlobal('fetch', fetch);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); clients.push(client);
  const router = createMemoryRouter(routes, { initialEntries: entries ?? [path], initialIndex: index }); routers.push(router);
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  return { router, fetch, user: userEvent.setup() };
}
async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nom de l’Item (obligatori)'), 'Body');
  await user.selectOptions(await screen.findByLabelText('Categoria (obligatòria)'), '1');
  await user.selectOptions(screen.getByLabelText('Subcategoria (obligatòria)'), '2');
}
test('valors inicials i dependència de classificació', async () => {
  const { user } = mount();
  const category = await screen.findByLabelText<HTMLSelectElement>('Categoria (obligatòria)');
  expect(category.value).toBe('');
  expect(screen.getByLabelText<HTMLInputElement>('Quantitat (obligatòria)').value).toBe('1');
  expect(screen.getByLabelText<HTMLInputElement>('No preparat').checked).toBe(true);
  await user.selectOptions(category, '1'); await user.selectOptions(screen.getByLabelText('Subcategoria (obligatòria)'), '2');
  await user.selectOptions(category, '3');
  expect(screen.getByLabelText<HTMLSelectElement>('Subcategoria (obligatòria)').value).toBe('');
});
test('errors en enviar enfoquen el nom i no fan POST', async () => {
  const { user, fetch } = mount(); await screen.findByLabelText('Categoria (obligatòria)');
  await user.click(screen.getByRole('button', { name: 'Registrar Items' }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Nom de l’Item (obligatori)')));
  expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
});
test.each(['0', '101', '1.5', ''])('quantitat invàlida %s', async (value) => {
  const { user, fetch } = mount(); await fill(user);
  fireEvent.change(screen.getByLabelText('Quantitat (obligatòria)'), { target: { value } });
  await user.click(screen.getByRole('button', { name: 'Registrar Items' }));
  await screen.findByText('La quantitat ha de ser un enter entre 1 i 100.');
  expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
});
test.each(['123!', 'a'.repeat(101)])('nom invàlid en blur', async (value) => {
  const { user } = mount(); await screen.findByLabelText('Categoria (obligatòria)');
  fireEvent.change(screen.getByLabelText('Nom de l’Item (obligatori)'), { target: { value } }); await user.tab();
  fireEvent.blur(screen.getByLabelText('Nom de l’Item (obligatori)'));
  await screen.findByText('El nom ha de contenir una lletra i tenir entre 1 i 100 caràcters.');
});
test('errors servidor conserven dades i focus', async () => {
  const { user } = mount('/items/nou', async () => Response.json({ code: 'VALIDATION_ERROR', fieldErrors: { nom: 'Nom rebutjat' } }, { status: 400 })); await fill(user);
  await user.click(screen.getByRole('button', { name: 'Registrar Items' })); await screen.findByText('Nom rebutjat');
  expect(screen.getByLabelText<HTMLInputElement>('Nom de l’Item (obligatori)').value).toBe('Body');
  expect(document.activeElement).toBe(screen.getByLabelText('Nom de l’Item (obligatori)'));
});
test('xarxa: error persistent i dades conservades', async () => {
  const { user } = mount('/items/nou', async () => { throw new Error('offline'); }); await fill(user);
  await user.click(screen.getByRole('button', { name: 'Registrar Items' })); await screen.findByRole('alert');
  expect(screen.getByLabelText<HTMLInputElement>('Nom de l’Item (obligatori)').value).toBe('Body');
});
test('enviament únic pendent, cinc camps i confirmació real sense blocker', async () => {
  let resolve!: (response: Response) => void;
  const { user, fetch, router } = mount('/items/nou', () => new Promise((done) => { resolve = done; })); await fill(user);
  await user.click(screen.getByLabelText('Preparat'));
  await user.dblClick(screen.getByRole('button', { name: 'Registrar Items' }));
  expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  expect(screen.queryByText(/S’han creat/)).toBeNull();
  const posted = JSON.parse(fetch.mock.calls.find(([, init]) => init?.method === 'POST')![1]!.body as string);
  expect(posted).toEqual({ nom: 'Body', categoria_id: 1, subcategoria_id: 2, quantitat: 1, estat_preparacio: 'preparada' });
  resolve(Response.json({ created_count: 3, items: [item] }, { status: 201 }));
  await screen.findByText('S’han creat 3 Items.'); expect(router.state.location.pathname).toBe('/items');
  expect(screen.queryByRole('dialog')).toBeNull();
});
test('formulari buit abandona sense avisos', async () => {
  const { user, router } = mount(); await user.click(screen.getByRole('button', { name: 'Cancel·lar' }));
  await waitFor(() => expect(router.state.location.pathname).toBe('/items'));
});
test('sortida interna: continuar, Escape i descartar', async () => {
  const { user, router } = mount(); await fill(user); await user.click(screen.getByRole('button', { name: 'Cancel·lar' }));
  const dialog = await screen.findByRole('dialog'); expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continuar editant' }));
  await user.click(screen.getByRole('button', { name: 'Continuar editant' })); expect(router.state.location.pathname).toBe('/items/nou');
  expect(screen.getByLabelText<HTMLInputElement>('Nom de l’Item (obligatori)').value).toBe('Body');
  await user.click(screen.getAllByRole('link', { name: 'Inici' })[0]);
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(router.state.location.pathname).toBe('/items/nou');
  await user.click(screen.getByRole('button', { name: 'Cancel·lar' })); await user.click(await screen.findByRole('button', { name: 'Descartar canvis' }));
  await waitFor(() => expect(router.state.location.pathname).toBe('/items'));
});
test.each([-1, 1])('Enrere/Endavant %s bloqueja i permet continuar o descartar', async (delta) => {
  const entries = ['/items', '/items/nou', '/inici'];
  const { user, router } = mount('/items/nou', undefined, entries, 1); await fill(user);
  void router.navigate(delta); await screen.findByRole('dialog'); await user.click(screen.getByRole('button', { name: 'Continuar editant' }));
  expect(router.state.location.pathname).toBe('/items/nou');
  void router.navigate(delta); await screen.findByRole('dialog'); await user.click(screen.getByRole('button', { name: 'Descartar canvis' }));
  await waitFor(() => expect(router.state.location.pathname).toBe(delta === -1 ? '/items' : '/inici'));
});
test('beforeunload només amb canvis', async () => {
  const { user } = mount();
  let event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
  await fill(user); event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
});
test('llistat buit, dades independents i error amb reintent', async () => {
  const { fetch, user } = mount('/items'); await screen.findByText(/Encara no hi ha Items/);
  fetch.mockImplementationOnce(async () => new Response('', { status: 500 }));
  await routers[0].navigate('/inici'); await routers[0].navigate('/items');
  // Força una nova lectura amb error i després reintent amb dades.
  await clients[0].invalidateQueries({ queryKey: ['items'] }); await screen.findByRole('alert');
  fetch.mockImplementationOnce(async () => Response.json({ items: [item, { ...item, id: 28 }] }));
  await user.click(screen.getByRole('button', { name: 'Torna-ho a provar' })); await screen.findAllByText('Body');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});


test.each(['1', '100'])('quantitat límit %s i nom de 100 caràcters admesos', async (quantity) => {
  const { user, fetch } = mount(); await fill(user);
  fireEvent.change(screen.getByLabelText('Nom de l’Item (obligatori)'), { target: { value: 'a'.repeat(100) } });
  fireEvent.change(screen.getByLabelText('Quantitat (obligatòria)'), { target: { value: quantity } });
  await user.click(screen.getByRole('button', { name: 'Registrar Items' }));
  await screen.findByText('S’han creat 3 Items.');
  const posted = JSON.parse(fetch.mock.calls.find(([, init]) => init?.method === 'POST')![1]!.body as string);
  expect(posted.quantitat).toBe(Number(quantity)); expect(posted.nom).toHaveLength(100);
  const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
});
