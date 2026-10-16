import type { Pool } from 'pg';
import type { NormalizedItemPhoto } from '../application/item-photos.js';
import { LocalItemPhotoStorage } from './local-item-photo-storage.js';
import { PostgresProductPhotoReferences } from './postgres-product-photo-references.js';

/** Lectura preparada amb wiring explícit producte + legacy, sense composition root actiu. */
export class LocalProductPhotoReader {
  private readonly storage:LocalItemPhotoStorage;
  constructor(root:string,pool:Pool){
    const references=new PostgresProductPhotoReferences(pool);
    this.storage=new LocalItemPhotoStorage(root,ref=>references.hasReferences(ref));
  }
  readReferenced(reference:string):Promise<NormalizedItemPhoto|null>{return this.storage.readReferenced(reference);}
}
