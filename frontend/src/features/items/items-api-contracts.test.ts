// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { createItems, fetchItem } from './items-api';
import type { ItemDetailResponse, ItemResponse } from './items-api';

afterEach(() => { vi.unstubAllGlobals(); });

test.each([null, 'items/lot-a.webp', 'items/lot-b.webp'])('detail preserves photo reference %s', async (foto_ref) => {
  const item: ItemDetailResponse = { id: 1, nom: 'Body', subcategoria_id: 2, estat_preparacio: null, foto_ref, data_entrada_casa: null, data_creacio: '2026-10-13T00:00:00.000Z' };
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ item })));
  expect((await fetchItem('1'))?.foto_ref).toBe(foto_ref);
});

test.each([null, 'items/shared.webp'])('creation response preserves reference %s without changing JSON input', async (foto_ref) => {
  const unit: ItemResponse = { id: 1, nom: 'Body', subcategoria_id: 2, estat_preparacio: 'no_preparada', foto_ref, data_entrada_casa: null, data_creacio: '2026-10-13T00:00:00.000Z' };
  const units: ItemResponse[] = [unit, { ...unit, id: 2 }, { ...unit, id: 3 }];
  const request = vi.fn(async () => Response.json({ created_count: 3, items: units }, { status: 201 }));
  vi.stubGlobal('fetch', request);
  const input = { nom: 'Body', categoria_id: 1, subcategoria_id: 2, quantitat: 3, estat_preparacio: 'no_preparada' as const };
  const result = await createItems(input);
  expect(result.items.map((item) => item.foto_ref)).toEqual([foto_ref, foto_ref, foto_ref]);
  expect(request).toHaveBeenCalledWith('/api/items', expect.objectContaining({ body: JSON.stringify(input), headers: { 'Content-Type': 'application/json' } }));
});

test('photo creation uses exactly data and photo without Content-Type', async () => {
  const input = { nom: 'Body', categoria_id: 1, subcategoria_id: 2, quantitat: 3, estat_preparacio: 'preparada' as const };
  const photo = new File(['image'], 'body.png', { type: 'image/png' });
  const request = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({ created_count: 3, items: [] }, { status: 201 }));
  vi.stubGlobal('fetch', request);
  await createItems(input, photo);
  const init = request.mock.calls[0]?.[1] as RequestInit;
  expect(init.headers).toBeUndefined();
  const body = init.body as FormData;
  expect(Array.from(body.keys())).toEqual(['data', 'photo']);
  expect(JSON.parse(body.get('data') as string)).toEqual(input);
  expect((body.get('photo') as File).name).toBe('body.png');
});
test.each([413, 415, 503, 500])('HTTP %s yields a comprehensible error', async status => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({}, { status })));
  await expect(createItems({ nom: 'Body', categoria_id: 1, subcategoria_id: 2, quantitat: 1, estat_preparacio: 'preparada' }, new File(['x'], 'photo.png', { type: 'image/png' }))).rejects.toBeInstanceOf(Error);
});
