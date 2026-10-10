// Executar des de backend amb Node --env-file=.env.test --import tsx.
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;
if (!connectionString || new URL(connectionString).pathname !== '/nestly_test') {
  throw new Error('DATABASE_URL ha de tenir com a desti exclusiu nestly_test.');
}
const portProbe = createServer();
await new Promise((resolve, reject) => { portProbe.once('error', reject); portProbe.listen(3000, '127.0.0.1', resolve); });
await new Promise((resolve, reject) => portProbe.close((error) => error ? reject(error) : resolve()));
const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
try {
  const { rows } = await pool.query('SELECT current_database() AS name');
  if (rows[0].name !== 'nestly_test') throw new Error('La base real no es nestly_test.');
  console.log('Destinacio verificada: nestly_test. Port 3000 disponible.');
} finally { await pool.end(); }
await import('../backend/src/index.ts');
