import type { Pool } from 'pg';
import type { Item } from '../domain/item.js';
import type { HomeItemsReader } from '../application/get-home-items.js';

const projection = `SELECT i.id, i.nom, i.subcategoria_id, i.estat_preparacio,
  i.foto_ref, i.data_entrada_casa, i.data_creacio FROM item i
  WHERE NOT EXISTS (SELECT 1 FROM item_llista il WHERE il.item_id = i.id)`;

export class PostgresHomeItemsReader implements HomeItemsReader {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<Item[]> {
    const { rows } = await this.pool.query<Item>(`${projection} ORDER BY i.data_creacio DESC, i.id DESC`);
    return rows;
  }

  async findById(id: number): Promise<Item | null> {
    const { rows } = await this.pool.query<Item>(`${projection} AND i.id = $1`, [id]);
    return rows[0] ?? null;
  }
}
