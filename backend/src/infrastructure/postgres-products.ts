import { ProductNotFoundError } from '../application/product-errors.js';
import type { Pool } from 'pg';
import type { ProductSummary } from '../application/product-contracts.js';
import type { ProductBatchInput, ProductItemsReader, ProductsRepository, ProductUnit } from '../application/product-persistence.js';
import { ProductPersistenceUncertainError, ProductPhotoConflictError } from '../application/product-persistence.js';

const units = `SELECT i.id, p.id AS producte_id, p.nom, p.subcategoria_id,
  i.estat_preparacio, p.foto_ref, i.data_entrada_casa, i.data_creacio
  FROM item i LEFT JOIN producte p ON p.id = i.producte_id`;
const home = 'NOT EXISTS (SELECT 1 FROM item_llista il WHERE il.item_id = i.id)';

/** Requereix un esquema preparat; no s'instancia al composition root actiu. */
export class PostgresProducts implements ProductsRepository, ProductItemsReader {
  constructor(private readonly pool: Pool) {}

  async listHomeForProjection(): Promise<ProductUnit[]> {
    const { rows } = await this.pool.query<ProductUnit>(`${units} WHERE ${home}`);
    // Una sola sentència: mateix snapshot per a files i detecció de buits.
    if (rows.some(row => row.producte_id === null)) throw Error('Inventari amb Items sense producte assignat.');
    return rows;
  }
  async findById(id: number): Promise<ProductUnit | null> {
    return this.find(id, false);
  }
  async findHomeById(id: number): Promise<ProductUnit | null> {
    return this.find(id, true);
  }
  private async find(id: number, onlyHome: boolean): Promise<ProductUnit | null> {
    const { rows } = await this.pool.query<ProductUnit>(`${units} WHERE i.id=$1${onlyHome ? ` AND ${home}` : ''}`, [id]);
    if (rows[0]?.producte_id === null) throw Error('Item sense producte assignat.');
    return rows[0] ?? null;
  }
  async listSelectableProducts(): Promise<ProductSummary[]> {
    const { rows } = await this.pool.query<ProductSummary>(`SELECT p.id, p.nom, p.foto_ref, p.foto_versio,
      json_build_object('id', c.id, 'nom', c.nom) AS category,
      json_build_object('id', s.id, 'nom', s.nom) AS subcategory
      FROM producte p JOIN subcategoria s ON s.id=p.subcategoria_id
      JOIN categoria c ON c.id=s.categoria_id ORDER BY p.nom, p.id`);
    return rows;
  }

  async findProductById(id: number): Promise<ProductSummary | null> {
    const { rows } = await this.pool.query<ProductSummary>(`SELECT p.id,p.nom,p.foto_ref,p.foto_versio,
      json_build_object('id',c.id,'nom',c.nom) AS category,
      json_build_object('id',s.id,'nom',s.nom) AS subcategory
      FROM producte p JOIN subcategoria s ON s.id=p.subcategoria_id
      JOIN categoria c ON c.id=s.categoria_id WHERE p.id=$1`,[id]);
    return rows[0] ?? null;
  }

  async createBatchAtomically(input: ProductBatchInput): Promise<ProductUnit[]> {
    if (!Number.isInteger(input.quantitat) || input.quantitat < 1 || input.quantitat > 100) throw Error('Quantitat invàlida.');
    if (!['preparada', 'no_preparada'].includes(input.estat_preparacio)) throw Error('Estat invàlid.');
    if (input.photoChange) {
      const decision=input.photoChange.decision;
      if (input.product.mode !== 'existing' || !Number.isInteger(decision.expected_version) || decision.expected_version < 0 || decision.expected_version > 2147483647 || typeof decision.replace_confirmed !== 'boolean') throw Error('Decisió de fotografia invàlida.');
    }
    const client = await this.pool.connect();
    let begun = false, commitSent = false;
    let releaseError: Error | undefined;
    try {
      await client.query('BEGIN'); begun = true;
      let product: { id: number; nom: string; subcategoria_id: number; foto_ref: string | null };
      if (input.product.mode === 'new') {
        const selected = input.product;
        if (!selected.nom.trim() || !/\p{L}/u.test(selected.nom) || [...selected.nom].length > 100 || /[\u0000\uD800-\uDFFF]/u.test(selected.nom)) throw Error('Nom de producte invàlid.');
        const { rows } = await client.query(`INSERT INTO producte (nom, subcategoria_id, foto_ref)
          VALUES ($1,$2,$3) RETURNING id,nom,subcategoria_id,foto_ref`, [selected.nom, selected.subcategoria_id, selected.foto_ref]);
        product = rows[0];
      } else {
        const { rows } = input.photoChange
          ? await client.query(`SELECT p.id,p.nom,p.subcategoria_id,p.foto_ref,p.foto_versio,
              json_build_object('id',c.id,'nom',c.nom) AS category,
              json_build_object('id',s.id,'nom',s.nom) AS subcategory
              FROM producte p JOIN subcategoria s ON s.id=p.subcategoria_id
              JOIN categoria c ON c.id=s.categoria_id WHERE p.id=$1 FOR UPDATE OF p`, [input.product.producte_id])
          : await client.query('SELECT id,nom,subcategoria_id,foto_ref FROM producte WHERE id=$1 FOR SHARE', [input.product.producte_id]);
        if (!rows[0]) throw new ProductNotFoundError();
        product = rows[0];
        if (input.photoChange) {
          const current=rows[0] as ProductSummary;
          const {decision,reference}=input.photoChange;
          if (current.foto_versio !== decision.expected_version) throw new ProductPhotoConflictError('PHOTO_VERSION_CONFLICT',current);
          if (current.foto_ref !== null && decision.replace_confirmed !== true) throw new ProductPhotoConflictError('PHOTO_CONFIRMATION_REQUIRED',current);
          // Un desbordament INTEGER falla i reverteix tota l’operació.
          await client.query('UPDATE producte SET foto_ref=$1,foto_versio=foto_versio+1 WHERE id=$2',[reference,product.id]);
          product = {...product,foto_ref:reference};
        }
      }
      // Legacy sincronitzat només com a pont; totes les lectures noves usen producte.
      const { rows } = await client.query<ProductUnit>(`INSERT INTO item
        (producte_id,nom,subcategoria_id,foto_ref,estat_preparacio,data_entrada_casa)
        SELECT $1,$2,$3,$4,$5,NULL FROM generate_series(1,$6::integer)
        RETURNING id,producte_id,nom,subcategoria_id,foto_ref,estat_preparacio,data_entrada_casa,data_creacio`,
        [product.id, product.nom, product.subcategoria_id, product.foto_ref, input.estat_preparacio, input.quantitat]);
      commitSent = true; await client.query('COMMIT');
      return rows;
    } catch (error) {
      try { if (begun) await client.query('ROLLBACK'); }
      catch (rollbackError) {
        releaseError = rollbackError instanceof Error ? rollbackError : Error('ROLLBACK fallit');
        throw new ProductPersistenceUncertainError(new AggregateError([error, rollbackError]));
      }
      if (commitSent) {
        releaseError = error instanceof Error ? error : Error('COMMIT incert');
        throw new ProductPersistenceUncertainError(error);
      }
      if (!begun) releaseError = error instanceof Error ? error : Error('BEGIN fallit');
      throw error;
    } finally { client.release(releaseError); }
  }
}
