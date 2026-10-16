import { PhotoHttpError } from './items-multipart.js';
import { ProductTransportError } from './product-http-errors.js';
import { ProductInputError, ProductNotFoundError } from '../application/product-errors.js';
import { ProductPersistenceUncertainError, ProductPhotoConflictError } from '../application/product-persistence.js';
import { PhotoProcessingError } from '../application/item-photos.js';

/** Mapatge pur preparatori: cap controlador actiu l'importa. Mai serialitza Error/cause. */
export function mapProductCreationError(error:unknown):{status:number;body:object} {
  if(error instanceof ProductTransportError)return {status:415,body:{code:'UNSUPPORTED_CONTENT_TYPE',message:'Utilitza application/json o multipart/form-data.'}};
  if(error instanceof PhotoHttpError){
    if(error.status===413)return {status:413,body:{code:'UPLOAD_TOO_LARGE',message:'La fotografia o les dades superen el límit permès.'}};
    if(error.status===503)return {status:503,body:{code:error.code==='PHOTO_BUSY'?'PHOTO_BUSY':'PHOTO_UNAVAILABLE',message:'El servei de fotografies no està disponible. Torna-ho a provar més tard.'}};
    return {status:400,body:{code:'INVALID_MULTIPART',message:'La petició multipart no és vàlida.'}};
  }
  // Errors coneguts del parser JSON: només codis fixos, mai el contingut rebut.
  if(error instanceof Error && 'type' in error){
    if(error.type==='entity.parse.failed')return {status:400,body:{code:'INVALID_JSON',message:'El cos JSON no és vàlid.'}};
    if(error.type==='entity.too.large')return {status:413,body:{code:'UPLOAD_TOO_LARGE',message:'Les dades superen el límit permès.'}};
    if(error.type==='charset.unsupported'||error.type==='encoding.unsupported')return {status:415,body:{code:'UNSUPPORTED_CONTENT_TYPE',message:'La codificació de la petició no és compatible.'}};
  }
  if(error instanceof ProductInputError)return {status:400,body:{code:'INVALID_INPUT',message:'Revisa les dades de creació.'}};
  if(error instanceof ProductNotFoundError)return {status:404,body:{code:'PRODUCT_NOT_FOUND',message:'El producte ja no està disponible.'}};
  if(error instanceof ProductPhotoConflictError) {
    const p=error.product;
    return {status:409,body:{code:error.code,message:error.code==='PHOTO_VERSION_CONFLICT'?'La fotografia ha canviat. Revisa-la abans de continuar.':'Confirma la substitució de la fotografia.',product:{id:p.id,nom:p.nom,category:{id:p.category.id,nom:p.category.nom},subcategory:{id:p.subcategory.id,nom:p.subcategory.nom},foto_ref:p.foto_ref,foto_versio:p.foto_versio}}};
  }
  if(error instanceof ProductPersistenceUncertainError)return {status:503,body:{code:'PERSISTENCE_UNCERTAIN',message:'No podem confirmar el resultat. Comprova l’inventari abans de repetir l’operació.'}};
  if(error instanceof PhotoProcessingError)return {status:error.code==='SIZE'?413:error.code==='BUSY'?503:422,body:{code:'PHOTO_'+error.code,message:error.code==='BUSY'?'El processament està ocupat. Torna-ho a provar més tard.':'No s’ha pogut processar la fotografia. Revisa el format i la mida.'}};
  return {status:500,body:{code:'INTERNAL_ERROR',message:'No s’ha pogut completar l’operació.'}};
}
