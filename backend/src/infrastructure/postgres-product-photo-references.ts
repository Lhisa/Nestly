import type { Pool } from 'pg';

/** Només per al nou model preparat; no connectat als serveis actius. */
export class PostgresProductPhotoReferences {
  constructor(private readonly pool: Pool) {}
  async hasReferences(reference: string): Promise<boolean> {
    const {rows}=await this.pool.query<{referenced:boolean}>(`SELECT
      EXISTS(SELECT 1 FROM producte WHERE foto_ref=$1)
      OR EXISTS(SELECT 1 FROM item WHERE foto_ref=$1) AS referenced`,[reference]);
    if (typeof rows[0]?.referenced !== 'boolean') throw Error('Comprovació de referències incerta.');
    return rows[0].referenced;
  }
}
