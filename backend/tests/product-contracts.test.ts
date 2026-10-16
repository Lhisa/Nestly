import { expect, test } from 'vitest';
import { validateProductPhotoContract } from '../src/application/product-contracts.js';
import type { ProductItemsCreationRequest } from '../src/application/product-contracts.js';
const units = { quantitat: 2, estat_preparacio: 'preparada' as const };
const existing = { mode: 'existing' as const, producte_id: 1 };
const fresh = { mode: 'new' as const, nom: 'Body', categoria_id: 1, subcategoria_id: 2 };
function upload(version: number, confirmed: boolean): ProductItemsCreationRequest {
  return { transport: 'multipart', data: {...units,product:existing,photo_decision:{expected_version:version,replace_confirmed:confirmed}},photo:new Uint8Array([1]) };
}
test('valid variants: JSON inherits photo, new upload needs no decision, existing upload checks current state', () => {
  expect(validateProductPhotoContract({transport:'json',data:{...units,product:existing}})).toEqual([]);
  expect(validateProductPhotoContract({transport:'json',data:{...units,product:fresh}})).toEqual([]);
  expect(validateProductPhotoContract({transport:'multipart',data:{...units,product:fresh},photo:new Uint8Array([1])})).toEqual([]);
  expect(validateProductPhotoContract(upload(0,false),{foto_ref:null,foto_versio:0})).toEqual([]);
  expect(validateProductPhotoContract(upload(1,true),{foto_ref:'stored',foto_versio:1})).toEqual([]);
});
test('requires explicit confirmation and matching integer version without coercion', () => {
  expect(validateProductPhotoContract(upload(1,false),{foto_ref:'stored',foto_versio:1})).toEqual(['PHOTO_CONFIRMATION_REQUIRED']);
  expect(validateProductPhotoContract(upload(0,true),{foto_ref:'stored',foto_versio:1})).toEqual(['PHOTO_VERSION_CONFLICT']);
  for (const version of [-1,0.5,NaN,2147483648]) expect(validateProductPhotoContract(upload(version,true),{foto_ref:null,foto_versio:0}).length).toBeGreaterThan(0);
  const invalid=upload(0,true); invalid.data.photo_decision!.replace_confirmed='true' as unknown as boolean;
  expect(validateProductPhotoContract(invalid,{foto_ref:'stored',foto_versio:0}).length).toBeGreaterThan(0);
  expect(validateProductPhotoContract(upload(0,false)).length).toBeGreaterThan(0);
});
test('forbids a photo decision for JSON or a new product', () => {
  for(const request of [
    {transport:'json',data:{...units,product:existing,photo_decision:{expected_version:0,replace_confirmed:true}}},
    {transport:'multipart',data:{...units,product:fresh,photo_decision:{expected_version:0,replace_confirmed:true}},photo:new Uint8Array([1])},
    {transport:'multipart',data:{...units,product:existing},photo:new Uint8Array([1])},
  ]) expect(validateProductPhotoContract(request as ProductItemsCreationRequest,{foto_ref:null,foto_versio:0}).length).toBeGreaterThan(0);
});
