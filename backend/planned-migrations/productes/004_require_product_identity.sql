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

    -- PREREQUISITS HUMANS abans d'aquest SQL, amb els escriptors pausats:
    -- mapa aprovat del mateix origen; snapshot revalidat sota bloqueig;
    -- cada Item (inclòs item_llista) assignat exactament segons el mapa;
    -- subcategoria legacy compatible i foto escollida entre refs originals;
    -- originals i fotos no escollides conservats en còpia restaurable;
    -- fitxers referenciats existents, llegibles i WebP vàlids;
    -- backend/frontend compatibles preparats; checker producte + legacy.
    -- Aquest esborrany no acredita l'aprovació ni inspecciona fitxers del disc.
    EXECUTE format('LOCK TABLE %I.item IN ACCESS EXCLUSIVE MODE', target_schema);
    EXECUTE format('LOCK TABLE %I.producte IN ACCESS EXCLUSIVE MODE', target_schema);
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %1$I.item i LEFT JOIN %1$I.producte p ON p.id=i.producte_id WHERE i.producte_id IS NULL OR p.id IS NULL OR i.subcategoria_id <> p.subcategoria_id)', target_schema) INTO occupied;
    IF occupied THEN RAISE EXCEPTION 'Assignacions absents o classificacions incompatibles.'; END IF;
    EXECUTE format('ALTER TABLE %I.item ALTER COLUMN producte_id SET NOT NULL', target_schema);
END;
$migration$;
COMMIT;
-- No activa lectures ni retira camps legacy; no és un aplicador de mapa.
