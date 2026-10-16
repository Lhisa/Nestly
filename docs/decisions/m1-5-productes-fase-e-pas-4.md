# M1.5 — Fase E, pas 4: backup i restauració verificats

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

## Estat: recuperació assajada, activació NO executada
Data: 2026-10-16. Worktree m1-5-photos/Nestly; branca codex/m1-5.
HEAD: 03d304e877b3cbec2df0227b5a98872df5cac5ae.
Cap canvi de codi, composition root, rutes, dades originals o serveis.

## Origen verificat
nestly_dev.public, PostgreSQL 18.6, 127.0.0.1:5433.
Transacció REPEATABLE READ READ ONLY amb transaction_read_only=on.
Items 1, 2 i 3 presents; cap altre Item, cap vinculació a item_llista, cap foto_ref.
8 categories, 41 subcategories; botiga, llista_nado, recomanacio i item_llista buides.
pgmigrations conserva 2 registres. producte i item.producte_id encara inexistents.
Única FK entrant a item: item_llista.item_id -> item.id, ON DELETE CASCADE.
Les altres FK relacionen item/subcategoria, item_llista/llista_nado,
llista_nado/botiga, subcategoria/categoria i recomanacio/subcategoria.
No s'han modificat els esquemes de nestly_test.

## Backup privat conservat
Directori local (fora de Git):
<directori-privat-de-backup>

- Arxiu: nestly_dev.dump, format custom, 19.483 bytes.
- SHA-256: 02eebb3174c30b1513c60b39304c7f473dbf5289b8d4720ece7a474cb375fdc5
- Manifest: manifest.json; instant UTC exacte, origen, mida, checksum,
  recomptes/empremtes, estructura, seqüències i resultat de restauració.
- Directori amb herència ACL desactivada i FullControl concedit a l'usuari actual.
- Sense credencials al manifest, documentació ni arguments del procés de backup.

pg_dump 18.6 executat al contenidor existent, amb connexió local i --no-password,
format custom i snapshot exportat des de la transacció de lectura.
Flux binari desat directament a un fitxer nou; no s'ha sobreescrit cap backup anterior.
pg_restore --list ha llegit el catàleg; el checksum s'ha tornat a verificar després.
No calia copiar fotografies: l'origen no conté cap referència fotogràfica.
No s'han obert ni copiat fotografies d'altres entorns.
El backup és complet per a aquesta base, no un backup global del clúster.
Per restaurar en un clúster diferent cal preparar rols/propietaris/permisos equivalents;
no s'han exportat contrasenyes de rols.

## Restauració executada i verificada
Base nova exclusiva:
nestly_restore_e_584d485b3ce94e50a9c65adf0eb97476
Creada amb TEMPLATE template0, mai sobre nestly_dev ni nestly_test.
pg_restore 18.6 amb --exit-on-error, conservant propietaris i objectes del dump.

Comparació amb l'origen:
- 8 taules, mateix conjunt i nombre de files.
- Contingut complet comparat mitjançant empremtes de totes les files ordenades.
- Items 1/2/3, catàlegs, migracions i taules buides idèntics.
- 33 columnes, identitat, tipus, nul·labilitat i defaults.
- 54 restriccions, incloses FK, CHECK, PK, UNIQUE i NOT NULL del catàleg PostgreSQL 18.
- 13 índexs; cap trigger d'usuari inesperat.
- 8 seqüències: propietari, tipus, inici, límits, increment, cicle, cache,
  last_value i is_called idèntics. No s'ha executat nextval per comprovar-les.
- Codificació UTF8, locale i proveïdor coincidents.
- Relacions de llista i referències fotogràfiques buides en ambdues bases.

La primera comparació textual va aturar la verificació: dos CHECK d'estat tenien
casts d'array reescrits com a casts dels elements. Es va conservar la base temporal.
El diagnòstic va comprovar exactament aquesta reescriptura i l'equivalència amb SELECT
sobre NULL, estats vàlids i invàlids. No es va ignorar genèricament cap diferència SQL
ni es van modificar restriccions. La incidència consta al manifest.

Després de verificar-ho tot, DROP DATABASE exclusivament sobre la base nova creada;
absència confirmada a pg_database. Backup i manifest conservats.
La comparació final de l'origen coincideix amb la capturada abans del backup,
incloses dades, estructura i seqüències. No s'han pausat serveis per fer aquest assaig.

## Ordre exacte proposat per a la via B — pendent d'autorització
1. Aprovar el codi d'activació coordinada, l'executor SQL i la configuració persistent
   privada de NESTLY_PHOTO_ROOT. Els adaptadors preparats continuen desconnectats.
2. Identificar cada escriptor que apunta a nestly_dev.public (PID, ordre, connexió i
   esquema); acordar finestra de manteniment i impedir noves escriptures.
   Quan s'autoritzi, aturar només els backends/escriptors d'aquest origen; no els
   serveis d'altres worktrees o esquemes. Tancar el formulari al navegador no és suficient.
   No confiar només en els bloquejos: els escriptors legacy no han de reprendre's al COMMIT.
3. Revalidar que origen, Items 1/2/3, valors originals, FK, triggers, catàlegs i seqüències
   coincideixen amb el manifest. Si han canviat, aturar-se i fer nova revisió/backup.
   És recomanable un backup nou amb els escriptors ja pausats abans de l'activació.
4. BEGIN en la connexió explícita nestly_dev/public, amb lock_timeout limitat.
   Bloquejar item i item_llista en ACCESS EXCLUSIVE; mantenir la pausa d'escriptors.
   Repetir les comprovacions dins de la transacció abans de modificar res.
5. Exigir exactament IDs 1/2/3, foto_ref NULL i item_llista buit. DELETE FROM
   public.item WHERE id IN (1,2,3); exigir rowCount=3. No TRUNCATE, CASCADE ni reset
   de seqüències. Si apareixen relacions de llista o fotos, avortar: cal una altra decisió.
6. Executar el cos revisat de 003 amb nestly.migration_database=nestly_dev i
   nestly.migration_schema=public: producte, columna producte_id, FK i índex.
7. Executar el cos revisat de 004: cobertura buida vàlida i producte_id NOT NULL.
   Un únic BEGIN/COMMIT extern: els fitxers actuals tenen embolcalls propis, que
   l'executor coordinat encara pendent haurà de gestionar explícitament.
8. Verificar item/item_llista/producte buits, 8/41 catàlegs i la resta de dades
   intactes, FK/checks/índexs presents, seqüències originals conservades; COMMIT.
9. Iniciar backend i frontend aprovats amb el model nou; no iniciar l'antic escriptor.
   Comprovar DATABASE_URL/esquema/arrel de fotos sense imprimir secrets.
10. Abans d'obrir escriptures: GET /api/products amb catàleg explícit; GET /api/items
    amb grups per producte_id, inventari buit i filtres correctes. El frontend ha de
    muntar CreateProductItemsForm/ProductCreateItemsPage i les lectures de productes,
    no les pàgines legacy. Verificar el bundle servit i les peticions de xarxa.
    Detall: router de productes a /items/:id, amb 404 correcte per IDs eliminats.
    Fotos: comprovació de referències producte + legacy, sense fallback de lectures.
11. Autoritzar la reobertura d'escriptures només si totes les comprovacions passen.
    Una creació real de comprovació o substitució fotogràfica necessita autorització
    perquè trencaria l'estat buit; aquests fluxos ja s'han assajat aïlladament.

## Condicions d'aturada
Origen, esquema o permisos inesperats; escriptors no identificats o encara actius;
backup absent/il·legible o checksum diferent; dades diferents del manifest; Items nous;
llistes/fotos no previstes; canvis de FK/triggers; locks no obtinguts dins del timeout;
DDL parcial; incoherències de catàleg; ruta o bundle legacy; arrel fotogràfica insegura;
errors de lectures o resultat COMMIT incert. No repetir automàticament una operació incerta.

## Recuperació
- Abans del COMMIT: ROLLBACK de dades i estructura; comprovar estat abans de reprendre.
- COMMIT incert: mantenir pausa i diagnosticar amb una connexió nova. No repetir DELETE/DDL.
- COMMIT confirmat, sense noves escriptures: mantenir pausa; restaurar el backup en
  una base nova equivalent, verificar-la i aprovar el canvi de connexió al backend
  compatible amb aquell estat. No pg_restore --clean sobre la base habitual.
- Després de noves escriptures: congelar, guardar backup de l'estat nou i fotos noves,
  reconciliar o corregir endavant. No restaurar l'antic perdent Items/fotos silenciosament.
- Tornar al backend legacy no és segur després de noves dades: ignora identitats
  explícites i pot veure noms/classificacions/fotos legacy obsolets; les seves insercions
  tampoc satisfan producte_id NOT NULL. Cal pla aprovat i estat compatible.

## Pendent abans d'activar
Aprovació específica; executor coordinat revisat; registre de migracions coherent;
canvis explícits de composition root/frontend; configuració persistent de fotografies;
identificació i pausa real dels escriptors; revalidació/backup final en aquella finestra.
HEIC/HEIF i I5 fora d'abast. Cap staging, commit, push o PR.
