import type { ClassificationCatalogReader } from './get-classification-catalog.js';
import type { ItemPhotoProcessor, ItemPhotoStorage } from './item-photos.js';
import { parseProductItemsCreationRequest } from './parse-product-items.js';
import { ProductInputError, ProductNotFoundError } from './product-errors.js';
import { validateProductPhotoContract } from './product-contracts.js';
import type { ProductItemsReader, ProductsRepository, ProductBatchInput, ProductUnit } from './product-persistence.js';
import { ProductPersistenceUncertainError, ProductPhotoConflictError } from './product-persistence.js';


export interface ProductCreationPhotos {
  processor: ItemPhotoProcessor;
  /** Instància exclusiva per operació, amb checker producte + legacy. */
  storage: () => ItemPhotoStorage;
  reportIncident: (error: unknown) => void;
}


/** Cas d'ús preparat. No connectat a HTTP ni al formulari actual. */
export async function createProductItems(rawRequest: unknown, catalogReader: ClassificationCatalogReader,
  reader: ProductItemsReader, repository: ProductsRepository, photos?: ProductCreationPhotos): Promise<ProductUnit[]> {
  const request=parseProductItemsCreationRequest(rawRequest);
  const data=request.data, selected=data.product;
  const invalid=(_message:string):never=>{throw new ProductInputError();};
  let input: ProductBatchInput;
  if (selected.mode==='new') {
    if (typeof selected.nom!=='string' || !selected.nom.trim() || !/\p{L}/u.test(selected.nom) || [...selected.nom].length>100 || /[\u0000\uD800-\uDFFF]/u.test(selected.nom)) invalid('Nom invàlid.');
    if (!Number.isInteger(selected.categoria_id) || !Number.isInteger(selected.subcategoria_id) || selected.categoria_id<1 || selected.subcategoria_id<1) invalid('Classificació invàlida.');
    const catalog=await catalogReader.read();
    if (!catalog.some(c=>c.id===selected.categoria_id && c.subcategories.some(s=>s.id===selected.subcategoria_id))) invalid('Classificació inexistent o incompatible.');
    input={product:{mode:'new',nom:selected.nom,subcategoria_id:selected.subcategoria_id,foto_ref:null},quantitat:data.quantitat,estat_preparacio:data.estat_preparacio};
    if (validateProductPhotoContract(request).length) invalid('Decisió de fotografia no admesa.');
  } else {
    if (!Number.isInteger(selected.producte_id) || selected.producte_id<1 || selected.producte_id>2147483647) invalid('Identificador de producte invàlid.');
    const current=await reader.findProductById(selected.producte_id);
    if (!current) throw new ProductNotFoundError();
    const errors=validateProductPhotoContract(request,current!);
    if (errors[0]==='PHOTO_VERSION_CONFLICT' || errors[0]==='PHOTO_CONFIRMATION_REQUIRED') throw new ProductPhotoConflictError(errors[0],current!);
    if (errors.length) invalid('Decisió de fotografia invàlida.');
    input={product:{mode:'existing',producte_id:selected.producte_id},quantitat:data.quantitat,estat_preparacio:data.estat_preparacio};
  }
  if (request.transport==='json') return repository.createBatchAtomically(input);
  if (!photos || !(request.photo instanceof Uint8Array)) invalid('Fotografia no disponible.');
  // Cap transacció ni bloqueig durant normalització i escriptura del fitxer.
  const normalized=await photos!.processor.normalize(request.photo);
  const storage=photos!.storage();
  const report=(error:unknown)=>{try{photos!.reportIncident(error);}catch{/* El logger no altera el resultat transaccional. */}};
  let reference:string;
  try { reference=await storage.save(normalized); }
  catch(error){report(error);throw error;}
  if (input.product.mode==='new') input.product={...input.product,foto_ref:reference};
  else input.photoChange={reference,decision:data.photo_decision!};
  try {return await repository.createBatchAtomically(input);}
  catch(error){
    if (error instanceof ProductPersistenceUncertainError) report(error);
    else {try{await storage.removeIfUnreferenced(reference);}catch(cleanupError){report(cleanupError);}}
    throw error;
  }
}
