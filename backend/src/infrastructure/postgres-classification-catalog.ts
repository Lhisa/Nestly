import type { Pool } from 'pg';
import type { Category } from '../domain/classification.js';
import type { ClassificationCatalogReader } from '../application/get-classification-catalog.js';

interface CatalogRow {
  categoria_id: number;
  categoria_nom: string;
  subcategoria_id: number | null;
  subcategoria_nom: string | null;
}

export class PostgresClassificationCatalog implements ClassificationCatalogReader {
  constructor(private readonly pool: Pool) {}

  async read(): Promise<Category[]> {
    const { rows } = await this.pool.query<CatalogRow>(`
      SELECT c.id AS categoria_id, c.nom AS categoria_nom,
             s.id AS subcategoria_id, s.nom AS subcategoria_nom
      FROM categoria c
      LEFT JOIN subcategoria s ON s.categoria_id = c.id
      ORDER BY c.id ASC, s.id ASC
    `);
    const categories = new Map<number, Category>();
    for (const row of rows) {
      let category = categories.get(row.categoria_id);
      if (!category) {
        category = { id: row.categoria_id, nom: row.categoria_nom, subcategories: [] };
        categories.set(category.id, category);
      }
      if (row.subcategoria_id !== null && row.subcategoria_nom !== null) {
        category.subcategories.push({ id: row.subcategoria_id, nom: row.subcategoria_nom });
      }
    }
    return [...categories.values()];
  }
}
