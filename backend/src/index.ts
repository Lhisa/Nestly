import { Pool } from 'pg';
import { createApp } from './http/app.js';
import { PostgresClassificationCatalog } from './infrastructure/postgres-classification-catalog.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Cal configurar DATABASE_URL abans d’arrencar el backend.');
}
const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
pool.on('error', (error) => console.error('Error inesperat de PostgreSQL:', error));
const app = createApp(new PostgresClassificationCatalog(pool));
const port = 3000;

app.listen(port, '127.0.0.1', () => {
  console.log(`Nestly backend: http://127.0.0.1:${port}`);
});
