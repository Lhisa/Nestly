import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { expect, test } from 'vitest';
import { PostgresProducts } from '../src/infrastructure/postgres-products.js';
import { PostgresClassificationCatalog } from '../src/infrastructure/postgres-classification-catalog.js';
import { getGroupedProductItems } from '../src/application/get-grouped-product-items.js';

/** Servei real obligatori: no skip ni fallback a nestly_dev. */
test('Productes PostgreSQL: identitat, lots atòmics, lectures derivades i regressions de projecció', async () => {
  const connectionString = process.env.NESTLY_ITEMS_TEST_DATABASE_URL;
  if (!connectionString || new URL(connectionString).pathname !== '/nestly_test') throw Error('Cal nestly_test explícit.');
  const admin = new Pool({ connectionString, connectionTimeoutMillis: 3000 });
  const schema = 'product_model_' + randomUUID().replaceAll('-','');
  let created = false;
  let pool: Pool | undefined;
  try {
    expect((await admin.query('SELECT current_database() d')).rows[0].d).toBe('nestly_test');
    await admin.query('CREATE SCHEMA '+schema); created = true;
    pool = new Pool({ connectionString, options: '-c search_path='+schema, connectionTimeoutMillis: 3000 });
    expect((await pool.query('SELECT current_schema() s')).rows[0].s).toBe(schema);
    await pool.query(await readFile(new URL('../migrations/001_create_initial_schema.sql',import.meta.url),'utf8'));
    const client = await pool.connect();
    try {
      await client.query("SELECT set_config('nestly.migration_database','nestly_test',false),set_config('nestly.migration_schema',$1,false)",[schema]);
      await client.query(await readFile(new URL('../planned-migrations/productes/003_prepare_products.sql',import.meta.url),'utf8'));
    } finally { client.release(); }
    await pool.query("INSERT INTO categoria(nom) VALUES ('Roba'),('Altres'); INSERT INTO subcategoria(nom,categoria_id) VALUES ('Bodies',1),('Altres',2)");
    const adapter = new PostgresProducts(pool);
    const catalog = new PostgresClassificationCatalog(pool);
    const ref = 'items/11111111-1111-4111-8111-111111111111.webp';
    const a = await adapter.createBatchAtomically({product:{mode:'new',nom:'Body',subcategoria_id:1,foto_ref:ref},quantitat:3,estat_preparacio:'preparada'});
    const b = await adapter.createBatchAtomically({product:{mode:'new',nom:'Body',subcategoria_id:1,foto_ref:null},quantitat:1,estat_preparacio:'no_preparada'});
    const added = await adapter.createBatchAtomically({product:{mode:'existing',producte_id:a[0].producte_id},quantitat:1,estat_preparacio:'no_preparada'});
    expect(new Set([...a,...added].map(i=>i.producte_id)).size).toBe(1);
    expect([...a,...added].every(i=>i.foto_ref===ref)).toBe(true);
    expect(b[0].producte_id).not.toBe(a[0].producte_id);
    await pool.query("INSERT INTO botiga(nom) VALUES ('Synthetic'); INSERT INTO llista_nado(nom,botiga_id) VALUES ('Synthetic',1)");
    await pool.query("INSERT INTO item_llista(item_id,llista_id,estat_comanda,preu_total) VALUES ($1,1,'demanat',1)",[added[0].id]);
    // Legacy deliberadament divergent: la lectura ha de derivar de producte.
    await pool.query("UPDATE item SET nom='Legacy',subcategoria_id=2,foto_ref=NULL,data_entrada_casa='2026-01-01T10:00:00Z',estat_preparacio=NULL WHERE id=$1",[a[0].id]);
    const detail = await adapter.findById(a[0].id);
    expect(detail).toMatchObject({nom:'Body',subcategoria_id:1,foto_ref:ref,estat_preparacio:null});
    expect(detail?.data_entrada_casa?.toISOString()).toBe('2026-01-01T10:00:00.000Z');
    expect(detail?.data_creacio).toBeInstanceOf(Date);
    expect(await adapter.findById(added[0].id)).toMatchObject({producte_id:a[0].producte_id,foto_ref:ref});
    expect(await adapter.findHomeById(added[0].id)).toBeNull();
    expect(await adapter.findById(99999)).toBeNull();
    const products = await adapter.listSelectableProducts();
    expect(products.map(p=>p.nom)).toEqual(['Body','Body']);
    expect(products.map(p=>p.id)).toEqual([...products.map(p=>p.id)].sort((x,y)=>x-y));
    expect(products[0]).toMatchObject({category:{id:1,nom:'Roba'},subcategory:{id:1,nom:'Bodies'},foto_ref:ref,foto_versio:0});
    const date='2026-02-01T10:00:00Z';
    // Mateix MAX(data); MAX(id) independent de la unitat més recent.
    await pool.query('UPDATE item SET data_creacio=$1 WHERE id=ANY($2::integer[])',[date,[a[0].id,b[0].id]]);
    await pool.query("UPDATE item SET data_creacio='2026-01-01T00:00:00Z' WHERE id=ANY($1::integer[])",[[a[1].id,a[2].id]]);
    // Una unitat antiga amb ID superior fa que el màxim independent d’A superi B.
    const more=await adapter.createBatchAtomically({product:{mode:'existing',producte_id:a[0].producte_id},quantitat:1,estat_preparacio:'no_preparada'});
    await pool.query("UPDATE item SET data_creacio='2026-01-01T00:00:00Z' WHERE id=$1",[more[0].id]);
    const grouped=await getGroupedProductItems([],adapter,catalog);
    expect(grouped.inventory_count).toBe(5); expect(grouped.matched_count).toBe(5);
    expect(grouped.groups.map(g=>g.producte_id)).toEqual([a[0].producte_id,b[0].producte_id]);
    expect(grouped.groups[0].units.map(u=>u.id)).toEqual([a[0].id,more[0].id,a[2].id,a[1].id]);
    expect(grouped.groups[0].preparation_counts).toEqual({prepared:2,not_prepared:1,unspecified:1});
    expect(grouped.groups[0].total_units).toBe(4);
    expect(grouped.groups[0].units.every(u=>u.foto_ref===ref)).toBe(true);
    expect(grouped.groups[0]).not.toHaveProperty('foto_ref');
    const filtered=await getGroupedProductItems([['subcategoria_id','1'],['subcategoria_id','1']],adapter,catalog);
    expect(filtered.filters).toEqual({categoria_id:1,subcategoria_id:1});
    expect(filtered.corrections.map(c=>c.reason)).toEqual(['duplicate','inferred']);
    expect(filtered.groups.map(g=>g.key)).toEqual(grouped.groups.map(g=>g.key));
    const empty=await getGroupedProductItems([['categoria_id','2']],adapter,catalog);
    expect(empty).toMatchObject({inventory_count:5,matched_count:0,groups:[]});
    // PostgreSQL failure after creating product: neither product nor units survive.
    await pool.query("CREATE FUNCTION reject_batch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.nom='Fallada' THEN RAISE EXCEPTION 'synthetic failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_batch BEFORE INSERT ON item FOR EACH ROW EXECUTE FUNCTION reject_batch()");
    await expect(adapter.createBatchAtomically({product:{mode:'new',nom:'Fallada',subcategoria_id:1,foto_ref:null},quantitat:3,estat_preparacio:'preparada'})).rejects.toThrow();
    expect((await pool.query("SELECT count(*)::int n FROM producte WHERE nom='Fallada'")).rows[0].n).toBe(0);
    expect((await pool.query('SELECT count(*)::int n FROM item')).rows[0].n).toBe(6);
    await expect(adapter.createBatchAtomically({product:{mode:'existing',producte_id:99999},quantitat:1,estat_preparacio:'preparada'})).rejects.toThrow('Producte inexistent');
    // Incomplete migration must not silently omit legacy inventory.
    await pool.query("INSERT INTO item(nom,subcategoria_id) VALUES ('Unassigned',1)");
    await expect(adapter.listHomeForProjection()).rejects.toThrow('sense producte');
  } finally {
    try { await pool?.end(); }
    finally { try { if(created) await admin.query('DROP SCHEMA '+schema+' CASCADE'); } finally { await admin.end(); } }
  }
},20000);

test('FOR SHARE impedeix actualitzar el producte durant la creació i allibera el bloqueig amb COMMIT', async () => {
  const connectionString = process.env.NESTLY_ITEMS_TEST_DATABASE_URL;
  if (!connectionString || new URL(connectionString).pathname !== '/nestly_test') throw Error('Cal nestly_test explícit.');
  const admin = new Pool({ connectionString, connectionTimeoutMillis: 3000 });
  const schema = 'product_lock_' + randomUUID().replaceAll('-','');
  let created = false;
  let pool: Pool | undefined;
  const held = Promise.withResolvers<void>();
  const proceed = Promise.withResolvers<void>();
  let batch: Promise<unknown> | undefined;
  let writer: import('pg').PoolClient | undefined;
  try {
    expect((await admin.query('SELECT current_database() d')).rows[0].d).toBe('nestly_test');
    await admin.query('CREATE SCHEMA '+schema); created=true;
    pool=new Pool({connectionString,options:'-c search_path='+schema,max:2,connectionTimeoutMillis:3000});
    expect((await pool.query('SELECT current_schema() s')).rows[0].s).toBe(schema);
    await pool.query(await readFile(new URL('../migrations/001_create_initial_schema.sql',import.meta.url),'utf8'));
    const preparation=await pool.connect();
    try {
      await preparation.query("SELECT set_config('nestly.migration_database','nestly_test',false),set_config('nestly.migration_schema',$1,false)",[schema]);
      await preparation.query(await readFile(new URL('../planned-migrations/productes/003_prepare_products.sql',import.meta.url),'utf8'));
    } catch (error) { await preparation.query('ROLLBACK'); throw error; }
    finally { preparation.release(); }
    await pool.query("INSERT INTO categoria(nom) VALUES ('Roba'); INSERT INTO subcategoria(nom,categoria_id) VALUES ('Bodies',1)");
    const product=(await pool.query("INSERT INTO producte(nom,subcategoria_id) VALUES ('Body',1) RETURNING id")).rows[0];
    // Connexió 1: el mateix adaptador real, pausat just després d'adquirir FOR SHARE.
    const adapter=new PostgresProducts({ connect: async () => {
      const client=await pool!.connect();
      return {
        query: async (sql: string, values?: unknown[]) => {
          const result=await client.query(sql,values);
          if (sql.includes('FOR SHARE')) { held.resolve(); await proceed.promise; }
          return result;
        },
        release: (error?: Error) => client.release(error),
      };
    } } as unknown as Pool);
    batch=adapter.createBatchAtomically({product:{mode:'existing',producte_id:product.id},quantitat:2,estat_preparacio:'preparada'});
    // Adjunta també el camí d'error abans d'esperar la barrera.
    await Promise.race([held.promise,batch.then(()=>{throw Error('El lot ha acabat sense adquirir FOR SHARE');})]);
    // Connexió 2: intent real d'UPDATE amb bloqueig previ NOWAIT, sense sleeps.
    writer=await pool.connect();
    const update=`WITH locked AS (SELECT id FROM producte WHERE id=$1 FOR NO KEY UPDATE NOWAIT)
      UPDATE producte p SET foto_versio=p.foto_versio+1 FROM locked l WHERE p.id=l.id RETURNING p.foto_versio`;
    await expect(writer.query(update,[product.id])).rejects.toMatchObject({code:'55P03'});
    expect((await writer.query('SELECT foto_versio FROM producte WHERE id=$1',[product.id])).rows[0].foto_versio).toBe(0);
    proceed.resolve();
    expect(await batch).toHaveLength(2);
    expect((await writer.query(update,[product.id])).rows[0].foto_versio).toBe(1);
    expect((await writer.query('SELECT count(*)::int n FROM item WHERE producte_id=$1',[product.id])).rows[0].n).toBe(2);
  } finally {
    proceed.resolve();
    await batch?.catch(()=>{});
    writer?.release();
    try { await pool?.end(); }
    finally { try { if(created) await admin.query('DROP SCHEMA '+schema+' CASCADE'); } finally { await admin.end(); } }
  }
},20000);
