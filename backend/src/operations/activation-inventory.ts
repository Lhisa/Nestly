import type {PoolClient} from 'pg';
export const identifier=(s:string)=>'"'+s.replaceAll('"','""')+'"';
/** Metadades i empremtes: no retorna contingut personal de les files. */
export async function activationInventory(c:PoolClient,schema:string){
 const tables=(await c.query<{table_schema:string;table_name:string}>('SELECT table_schema,table_name FROM information_schema.tables WHERE table_type=\'BASE TABLE\' AND table_schema=$1 ORDER BY 1,2',[schema])).rows;
 const data=[];
 for(const t of tables){const row=(await c.query('SELECT count(*)::int count,md5(coalesce(string_agg(j,\'|\' ORDER BY j),\'\')) content_digest FROM (SELECT to_jsonb(t)::text j FROM '+identifier(schema)+'.'+identifier(t.table_name)+' t) rows')).rows[0];data.push({...t,...row});}
 const structure={
 columns:(await c.query('SELECT table_schema,table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default,character_maximum_length,numeric_precision,numeric_scale,is_identity,identity_generation FROM information_schema.columns WHERE table_schema=$1 ORDER BY 1,2,4',[schema])).rows,
 constraints:(await c.query('SELECT n.nspname schema,t.relname table_name,c.conname,c.contype,c.convalidated,c.condeferrable,c.condeferred,pg_get_constraintdef(c.oid) definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace JOIN pg_class t ON t.oid=c.conrelid WHERE n.nspname=$1 ORDER BY 1,2,3',[schema])).rows,
 indexes:(await c.query('SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname=$1 ORDER BY 1,2,3',[schema])).rows,
 triggers:(await c.query('SELECT n.nspname schema,t.relname table_name,g.tgname,pg_get_triggerdef(g.oid) definition FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE NOT g.tgisinternal AND n.nspname=$1 ORDER BY 1,2,3',[schema])).rows,
 sequences:[] as Record<string,unknown>[],
 database_settings:(await c.query('SELECT pg_encoding_to_char(encoding) encoding,datcollate,datctype,datlocprovider FROM pg_database WHERE datname=current_database()')).rows[0]
 };
 for(const s of (await c.query('SELECT schemaname,sequencename,sequenceowner,data_type,start_value,min_value,max_value,increment_by,cycle,cache_size FROM pg_sequences WHERE schemaname=$1 ORDER BY 1,2',[schema])).rows){structure.sequences.push({...s,...(await c.query('SELECT last_value::text,is_called FROM '+identifier(schema)+'.'+identifier(s.sequencename))).rows[0]});}
 return {data,structure};
}
