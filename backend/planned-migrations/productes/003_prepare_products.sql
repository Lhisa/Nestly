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

    EXECUTE format('LOCK TABLE %I.item IN ACCESS EXCLUSIVE MODE', target_schema);
    EXECUTE format($ddl$
        CREATE TABLE %1$I.producte (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            nom VARCHAR(100) NOT NULL CHECK (length(btrim(nom)) > 0),
            subcategoria_id INTEGER NOT NULL REFERENCES %1$I.subcategoria(id) ON DELETE RESTRICT,
            foto_ref TEXT NULL CHECK (foto_ref IS NULL OR foto_ref ~ '^items/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]webp$'),
            foto_versio INTEGER NOT NULL DEFAULT 0 CHECK (foto_versio >= 0)
        )
    $ddl$, target_schema);
    -- Sense unicitat per nom/subcategoria; identitat explícita.
    EXECUTE format('ALTER TABLE %I.item ADD COLUMN producte_id INTEGER NULL', target_schema);
    EXECUTE format('ALTER TABLE %1$I.item ADD CONSTRAINT fk_item_producte FOREIGN KEY (producte_id) REFERENCES %1$I.producte(id) ON DELETE RESTRICT', target_schema);
    EXECUTE format('CREATE INDEX idx_item_producte_id ON %I.item(producte_id)', target_schema);
END;
$migration$;
COMMIT;
