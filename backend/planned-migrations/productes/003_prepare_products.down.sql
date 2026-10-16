-- ESBORRANY fora de la cua activa; no executar sense aprovació.
-- Escriptors pausats durant tota la transacció.
-- Abans d'executar: SET nestly.migration_database = '<base aprovada>';
-- SET nestly.migration_schema = '<esquema aprovat>'; sense cap valor per defecte.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $migration$
DECLARE
    target_database TEXT := current_setting('nestly.migration_database', true);
    target_schema TEXT := current_setting('nestly.migration_schema', true);
    occupied BOOLEAN;
BEGIN
    IF target_database IS NULL OR target_database <> current_database()
       OR target_schema IS NULL OR btrim(target_schema) = ''
       OR target_schema = 'information_schema' OR target_schema LIKE 'pg_%' THEN
        RAISE EXCEPTION 'Destí de migració explícit invàlid.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = target_schema) THEN
        RAISE EXCEPTION 'Esquema destinatari inexistent.';
    END IF;

    -- Mateix ordre de bloqueig que preparació i activació; abans de comprovar.
    EXECUTE format('LOCK TABLE %I.item IN ACCESS EXCLUSIVE MODE', target_schema);
    EXECUTE format('LOCK TABLE %I.producte IN ACCESS EXCLUSIVE MODE', target_schema);
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %1$I.item WHERE producte_id IS NOT NULL) OR EXISTS (SELECT 1 FROM %1$I.producte)', target_schema) INTO occupied;
    IF occupied THEN
        RAISE EXCEPTION 'Reversió refusada: hi ha productes o assignacions.';
    END IF;
    EXECUTE format('ALTER TABLE %I.item DROP CONSTRAINT fk_item_producte', target_schema);
    EXECUTE format('DROP INDEX %I.idx_item_producte_id', target_schema);
    EXECUTE format('ALTER TABLE %I.item DROP COLUMN producte_id', target_schema);
    EXECUTE format('DROP TABLE %I.producte', target_schema);
END;
$migration$;
COMMIT;
-- No elimina fitxers. Un error avorta; el client ha de fer ROLLBACK abans de continuar.
