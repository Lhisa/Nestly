// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClassificationSelectors } from './ClassificationSelectors';

const categories = [
  { id: 1, nom: 'Roba', subcategories: [{ id: 10, nom: 'Bodies' }] },
  { id: 2, nom: 'Mobles', subcategories: [{ id: 20, nom: 'Bressol' }] },
  { id: 3, nom: 'Pendent de classificar', subcategories: [{ id: 30, nom: 'Pendent de classificar' }] },
];
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
});

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><ClassificationSelectors /></QueryClientProvider>);
}
function respond(data = categories) {
  return new Response(JSON.stringify({ categories: data }), { status: 200 });
}

test('carrega, filtra Subcategories i neteja la selecció incompatible', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond()));
  const user = userEvent.setup();
  mount();
  const category = await screen.findByLabelText<HTMLSelectElement>('Categoria (obligatòria)');
  const subcategory = screen.getByLabelText<HTMLSelectElement>('Subcategoria (obligatòria)');
  expect(category.value).toBe('');
  expect(subcategory.disabled).toBe(true);
  await user.selectOptions(category, '1');
  expect(subcategory.value).toBe('');
  expect(screen.queryByRole('option', { name: 'Bressol' })).toBeNull();
  await user.selectOptions(subcategory, '10');
  await user.selectOptions(category, '2');
  expect(subcategory.value).toBe('');
  expect(screen.queryByRole('option', { name: 'Bodies' })).toBeNull();
  await user.selectOptions(category, '1');
  expect(subcategory.value).toBe('');
  await user.selectOptions(category, '3');
  expect(subcategory.value).toBe('');
  await user.selectOptions(subcategory, '30');
  expect(subcategory.value).toBe('30');
});

test('mostra càrrega sense camps seleccionables', () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  mount();
  expect(screen.getByRole('status').textContent).toContain('Carregant');
  expect(screen.queryByRole('combobox')).toBeNull();
});

test('error persistent i reintent amb èxit', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 500 })).mockResolvedValueOnce(respond());
  vi.stubGlobal('fetch', fetch);
  const user = userEvent.setup();
  mount();
  expect((await screen.findByRole('alert')).textContent).toContain('No s’ha pogut');
  await user.click(screen.getByRole('button', { name: 'Torna-ho a provar' }));
  await screen.findByLabelText('Categoria (obligatòria)');
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('catàleg buit', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond([])));
  mount();
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('No hi ha Categories'));
  expect(screen.queryByRole('combobox')).toBeNull();
});

test('categoria sense Subcategories', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond([{ id: 4, nom: 'Buida', subcategories: [] }])));
  const user = userEvent.setup();
  mount();
  await user.selectOptions(await screen.findByLabelText('Categoria (obligatòria)'), '4');
  expect(screen.getByLabelText<HTMLSelectElement>('Subcategoria (obligatòria)').disabled).toBe(true);
  expect(screen.getByRole('status').textContent).toContain('no té Subcategories');
});
