import type { Pool } from 'pg';

export class PostgresItemPhotoReferences {
  constructor(private readonly pool: Pool) {}
  async hasReferences(reference: string): Promise<boolean> {
    // All Items, including item_llista: compensation must never ignore linked Items.
    const { rows } = await this.pool.query<{ referenced: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM item WHERE foto_ref = $1) AS referenced', [reference],
    );
    if (typeof rows[0]?.referenced !== 'boolean') throw new Error('Uncertain photo reference check');
    return rows[0].referenced;
  }
}
