import type { Pool } from 'pg';
import type { HomeItemsRepository } from '../application/create-home-items.js';
import type { CreateHomeItemsInput, Item } from '../domain/item.js';

export class PostgresHomeItemsRepository implements HomeItemsRepository {
  constructor(private readonly pool: Pool) {}

  async createAtomically(input: CreateHomeItemsInput): Promise<Item[]> {
    const client = await this.pool.connect();
    let transactionStarted = false;
    let releaseError: Error | undefined;
    try {
      await client.query('BEGIN');
      transactionStarted = true;
      const items: Item[] = [];
      for (let index = 0; index < input.quantitat; index++) {
        const { rows } = await client.query<Item>(`
          INSERT INTO item (nom, subcategoria_id, estat_preparacio, foto_ref, data_entrada_casa)
          VALUES ($1, $2, $3, NULL, NULL)
          RETURNING id, nom, subcategoria_id, estat_preparacio, foto_ref, data_entrada_casa, data_creacio
        `, [input.nom, input.subcategoria_id, input.estat_preparacio]);
        items.push(rows[0]);
      }
      await client.query('COMMIT');
      return items;
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          releaseError = rollbackError instanceof Error ? rollbackError : new Error('Ha fallat ROLLBACK');
          throw new AggregateError([error, rollbackError], 'Han fallat la persistència i el ROLLBACK.');
        }
      } else {
        releaseError = error instanceof Error ? error : new Error('Ha fallat BEGIN');
      }
      throw error;
    } finally {
      client.release(releaseError);
    }
  }
}
