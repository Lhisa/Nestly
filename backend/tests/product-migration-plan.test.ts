import { expect, test } from 'vitest';
import { prepareConservativeProductPlan, inspectLegacyCandidates, validateProductMigrationPlan } from '../src/application/product-migration-plan.js';
const origin = { database: 'nestly_test', schema: 'isolated' };
const a = 'items/12345678-1234-4123-8123-123456789abc.webp';
const b = 'items/87654321-1234-4123-8123-123456789abc.webp';
const source = [
  { id: 1, nom: 'Body', subcategoria_id: 2, foto_ref: a, linked_to_list: false },
  { id: 2, nom: ' BODY ', subcategoria_id: 2, foto_ref: b, linked_to_list: true },
  { id: 3, nom: 'body', subcategoria_id: 2, foto_ref: null, linked_to_list: false },
];
test('conservative proposal preserves every individual identity and photo including list Items', () => {
  const original = structuredClone(source);
  const plan = prepareConservativeProductPlan(source,origin);
  expect(plan.products.map(p=>p.item_ids)).toEqual([[1],[2],[3]]);
  expect(plan.products.map(p=>p.foto_ref)).toEqual([a,b,null]);
  expect(validateProductMigrationPlan(plan,source,origin)).toEqual([]);
  expect(source).toEqual(original);
  expect(inspectLegacyCandidates(source)).toEqual([{item_ids:[1,2,3],photo_refs:[a,b],contains_null_photo:true,linked_item_ids:[2]}]);
});
test('explicit reviewed grouping may choose an original photo without merging by name automatically', () => {
  const plan = prepareConservativeProductPlan(source,origin);
  plan.products = [{key:'reviewed',nom:'Body',subcategoria_id:2,foto_ref:b,item_ids:[1,2,3]}];
  expect(validateProductMigrationPlan(plan,source,origin)).toEqual([]);
  plan.products[0].foto_ref = null;
  expect(validateProductMigrationPlan(plan,source,origin).length).toBeGreaterThan(0);
});
test('rejects omissions, double assignment, unknown Items and inconsistent classifications', () => {
  for (const mutate of [
    (p: ReturnType<typeof prepareConservativeProductPlan>) => { p.products.pop(); },
    (p: ReturnType<typeof prepareConservativeProductPlan>) => { p.products[0].item_ids.push(2); },
    (p: ReturnType<typeof prepareConservativeProductPlan>) => { p.products[0].item_ids=[99]; },
    (p: ReturnType<typeof prepareConservativeProductPlan>) => { p.products[0].subcategoria_id=99; },
    (p: ReturnType<typeof prepareConservativeProductPlan>) => { p.products[0].foto_ref='../outside.webp'; },
  ]) { const plan=prepareConservativeProductPlan(source,origin); mutate(plan); expect(validateProductMigrationPlan(plan,source,origin).length).toBeGreaterThan(0); }
});
test('rejects stale snapshots including concurrent photo and list changes', () => {
  for (const change of [{foto_ref:b},{linked_to_list:true},{nom:'Updated'},{subcategoria_id:3}]) {
    const current=structuredClone(source); Object.assign(current[0],change);
    expect(validateProductMigrationPlan(prepareConservativeProductPlan(source,origin),current,origin)).toContain('Snapshot obsolet: cal regenerar i revisar.');
  }
});

test('literal names match VARCHAR(100), including spaces and Unicode', () => {
  const plan=prepareConservativeProductPlan(source,origin);
  for(const name of [' '+ 'a'.repeat(100)+' ', 'a'.repeat(101), 'Body\u0000', 'Body\uD800']) {
    plan.products[0].nom=name;
    expect(validateProductMigrationPlan(plan,source,origin)).toContain('Nom de producte invàlid.');
  }
  plan.products[0].nom=' '+ 'a'.repeat(98)+' ';
  expect(validateProductMigrationPlan(plan,source,origin)).toEqual([]);
  expect(plan.products[0].nom.length).toBe(100);
  plan.products[0].nom='A'+'😀'.repeat(99);
  expect(validateProductMigrationPlan(plan,source,origin)).toEqual([]);
});
test('binds the plan to database and schema even for identical rows', () => {
  const plan=prepareConservativeProductPlan(source,origin);
  for(const wrong of [{...origin,database:'nestly_dev'},{...origin,schema:'public'}]) {
    expect(validateProductMigrationPlan(plan,source,wrong)).toContain('Origen del pla incorrecte.');
  }
});
test('rejects invalid keys, empty products and duplicate snapshot IDs', () => {
  for(const key of ['', '   ', 'legacy-item-2']) {
    const plan=prepareConservativeProductPlan(source,origin); plan.products[0].key=key;
    expect(validateProductMigrationPlan(plan,source,origin)).toContain('Clau provisional buida o duplicada.');
  }
  const empty=prepareConservativeProductPlan(source,origin); empty.products[0].item_ids=[];
  expect(validateProductMigrationPlan(empty,source,origin)).toContain('Producte sense Items assignats.');
  const duplicate=prepareConservativeProductPlan(source,origin); duplicate.source.push({...source[0]});
  expect(validateProductMigrationPlan(duplicate,source,origin)).toContain('IDs duplicats al snapshot del pla.');
  expect(validateProductMigrationPlan(prepareConservativeProductPlan(source,origin),[...source,source[0]],origin)).toContain('IDs originals duplicats.');
});
test('detects additions and deletions, ignores row order, rejects a foreign valid photo', () => {
  const plan=prepareConservativeProductPlan(source,origin);
  for(const changed of [source.slice(1),[...source,{...source[0],id:4}]]) {
    expect(validateProductMigrationPlan(plan,changed,origin)).toContain('Snapshot obsolet: cal regenerar i revisar.');
  }
  expect(validateProductMigrationPlan(plan,[...source].reverse(),origin)).toEqual([]);
  plan.products[0].foto_ref=b;
  expect(validateProductMigrationPlan(plan,source,origin).length).toBeGreaterThan(0);
});
