# M1.5 — Model de productes · Increment 1

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.
## Estat
Direcció funcional aprovada; esquema i contractes d'aquest document proposats per a revisió.
No s'han executat migracions ni activat comportaments. Els canvis I1–I4 es conserven.

## Invariants
La identitat és producte_id, mai el nom ni la subcategoria. Noms duplicats admesos.
Fotografia única propietat de producte, foto_versio >= 0. La primera foto migrada té versió 0:
la versió és un comptador de concurrència, no el nombre històric de fotografies.
Items mantenen identificadors, nom original, preparació i dates.
Items d'item_llista també han de quedar assignats. La relació de llista no canvia.
Després de l'activació, classificació i fotografia sempre es llegeixen de producte;
camps legacy només per restauració, sense escriptura dual permanent.

## Esquema preparat, no actiu
DDL a backend/planned-migrations/productes, deliberadament fora de backend/migrations.
No s'han canviat scripts. Els fitxers no són encara una migració registrada pel gestor:
abans d'aplicar, cal aprovar i integrar-ne numeració, format i transaccionalitat.
003 crea producte i FK nullable/index a item, sense backfill; conserva tot el legacy.
004 imposa identitat completa, però no canvia la font de veritat de l'aplicació.
Reversió 003 refusada si hi ha dades/assignacions. Després de backfill/activació,
no prometem down automàtic: còpia restaurable i procediment explícit.
No s'ha preparat cap eliminació de fotografies ni retirada dels camps legacy.

## Revisió i assignació
Exportació futura READ ONLY de tots els Items, inclosos els vinculats, amb id, nom,
subcategoria_id, foto_ref i linked_to_list. Font/schema i instant s'han de registrar al dossier.
inspectLegacyCandidates informa coincidències textuals, refs diferents i nulls; no prova identitat.
prepareConservativeProductPlan proposa un producte diferent per Item i preserva cada foto.
Això pot separar lots reals: és una proposta conservadora, no el mapa final ni una assignació aplicada.
La persona usuària pot unir explícitament item_ids i triar una foto original.
validateProductMigrationPlan comprova cobertura exacta, classificació, referències i snapshot.
És un validador de dades tipades, no un parser de JSON extern ni una prova d'aprovació humana.
No aplica SQL. El futur aplicador haurà de revalidar el snapshot dins d'una transacció amb
escriptors pausats o bloqueig adequat; validar fora de la transacció no evita carreres.
També cal comprovar el catàleg real, fitxers absents i l'inventari complet de fotos.
Les fotos no seleccionades es conserven, juntament amb el mapa i la còpia dels camps legacy.

## Contracte proposat
GET /api/products: products amb id, nom, categoria/subcategoria, foto_ref i foto_versio.
POST /api/items: product {mode: new, nom, categoria_id, subcategoria_id} o
{mode: existing, producte_id}; quantitat i estat_preparacio comuns.
Sense fitxer: JSON. Amb fitxer: data JSON + un photo, límits existents.
Cap foto_ref client. El futur parser ha de rebutjar camps desconeguts i combinacions incompatibles.
Producte existent sense upload hereta fotografia actual. Upload existent requereix expected_version.
Si ja té foto, també replace_confirmed=true; no es compara contingut de fitxers.
409 PHOTO_CONFIRMATION_REQUIRED o PHOTO_VERSION_CONFLICT retorna estat actual per revisar.
201 conserva created_count/items i incorpora producte_id; foto_ref derivada.
Contractes product-contracts.ts no connectats a HTTP; no afegeixen rutes ni canvien POST actual.
El futur formulari seleccionarà producte existent o nou explícitament; duplicats es distingiran
per identificador, classificació i fotografia, sense suggerir que el mateix nom implica identitat.

## Transacció prevista, no implementada
Validar dades i producte, detectar confirmació absent abans de persistir foto.
Normalitzar/desar fitxer fora del bloqueig llarg. En transacció: bloquejar producte,
revalidar foto_versio/confirmació, assignar referència, incrementar versió i inserir N unitats.
Si la primera foto arriba concurrentment, versió antiga retorna 409 sense substitució silenciosa.
Producte nou i N Items es creen atòmicament. No hi ha deduplicació automàtica de productes.
Compensació només del fitxer propi amb absència certa de referències; COMMIT incert conserva.
Checker ha de comptar producte i legacy mentre coexisteixin. Fotos antigues: neteja posterior separada.

## Activació i proves futures
1. Revisió humana de contractes/DDL i política de mapa.
2. Còpia DB/fotos, inventari i assaig autoritzat sobre entorn separat.
3. Aprovar mapa; backfill transaccional i verificació, sense pèrdua de refs.
4. Backend/frontend compatibles: grup producte_id, nom/classificació producte, estats individuals.
5. Aplicar NOT NULL i activar lectures producte; mantenir filtres, ordre/comptatges i URLs de detall.
Claus de grup noves invaliden només contextos temporals antics; filtres URL es mantenen.
Proves PostgreSQL futures: FK/NOT NULL, noms repetits, mapes conflictus, item_llista,
rollback i versions concurrents. No s'han executat en aquest increment.
Proves actuals pures: no fusió, preservació, conflictes, mapa complet i snapshot obsolet.
Cap migració, dada, foto o servei existent s'ha alterat.

## Punts pendents d'aprovació
Payload exacte i noms de camps; revisió del mapa real i fotografia seleccionada per unions;
estratègia d'activació amb pausa d'escriptures; còpies/restauració i assaig SQL.
L'eliminació dels camps legacy i la neteja de fotos no seleccionades es revisaran separadament.

## Garanties corregides després de l'auditoria
Nom conservat literalment: el pla conté exactament el nom que es persistirà, sense trim.
Límit de 100 punts de codi Unicode incloent espais; NUL i surrogates aïllats refusats.
Nom normalitzat només per informar candidates, no per identificar productes.
Claus blanques/duplicades, IDs duplicats en ambdós snapshots, productes sense Items,
omissions i assignacions inconsistents es rebutgen. Cap unió automàtica.
plan.origin conté database/schema i ha de coincidir exactament amb el destí actual.
Snapshots detecten altes, baixes, nom/classificació/foto/vinculació a llista; ordre irrellevant.
Estats i dates individuals no són transformats ni sobreescrits pel futur aplicador.

Transport és una envolupant interna derivada de Content-Type, no un camp del client:
JSON sense photo_decision; multipart nou sense decisió; multipart existent amb decisió obligatòria.
Versió entera de 0 a 2147483647 i confirmació booleana sense coerció.
Si hi ha foto, només true confirma; si no hi ha foto, false vàlid però versió obligatòria.
El validador pur no parseja JSON ni s'ha connectat a HTTP. El futur parser ha de rebutjar
camps desconeguts a tots els nivells (inclòs foto_ref), parts extra/duplicades i combinacions invàlides.

SQL amb BEGIN/COMMIT i search_path pg_catalog. Requereix nestly.migration_database i
nestly.migration_schema explícits, verifica current_database i existència de schema,
rebutja esquemes de sistema i qualifica totes les relacions via format %I.
Runner futur: aturar al primer error i ROLLBACK; integrar amb el gestor sense embolcalls transaccionals incompatibles.
Reversió: ACCESS EXCLUSIVE sobre item i producte, en aquest ordre, abans de comprovar
taules buides; bloquejos fins a COMMIT. Escriptors pausats. SQL assajat únicament en un esquema nou i aïllat de nestly_test; no executat sobre entorns existents.

Prerequisits obligatoris abans de NOT NULL: mapa humà aprovat del mateix origen,
snapshot revalidat dins de la transacció d'aplicació, cobertura exacta incloent item_llista,
assignacions iguals al mapa, classificacions legacy compatibles, foto escollida entre originals,
còpia restaurable i inventari de totes les fotos no seleccionades, fitxers referenciats
existents/llegibles i WebP vàlids, aplicació compatible i checker producte + legacy.
004 comprova cobertura/FK/classificació però no acredita revisió humana ni inspecciona el disc.
L'aplicador haurà de repetir les comprovacions sota bloqueig amb escriptors pausats fins a activació.
Cal refusar replays sobre producte_id ja assignat. El mapa no modifica estats/dates originals.
Assaig estructural SQL completat satisfactòriament a nestly_test, esquema exclusiu
rehearsal_products_d022485f5e7542b3af35a90522d5f393: preparació, restriccions, FK nullable,
noms duplicats, compatibilitat amb item_llista, rebuig d’activació amb assignacions absents,
reversió i bloquejos comprovats amb una segona connexió.
Això no valida la migració de dades ni una activació completa. Continuen pendents
l’inventari real de fitxers, les còpies/restauració, l’aplicació i aprovació del mapa.
