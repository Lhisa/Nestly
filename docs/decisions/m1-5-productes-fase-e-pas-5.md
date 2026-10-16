# M1.5 — Fase E, pas 5: preparació tècnica de l'activació

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

## Estat
Preparat per a revisió, NO activat. Legacy és el valor per defecte dels dos costats.
No s'ha executat l'executor a nestly_dev, ni tan sols en prevalidació durant aquest pas.
Totes les execucions de l'executor han utilitzat esquemes nous de nestly_test.
El backup i el manifest del pas 4 es conserven sense modificacions.

## Executor manual
Fitxers: backend/src/operations/activate-empty-products-cli.ts,
activate-empty-products.ts i activation-inventory.ts. Cap importació des d'index.ts.
No hi ha execució automàtica a l'arrencada ni scripts npm que apliquin canvis.
La migració continua fora de backend/migrations: el registre normal pgmigrations no
s'inventa ni s'actualitza amb files incompatibles. Aquesta operació és manual i el seu
registre és el manifest aprovat + versió del codi + resultat conservat de l'executor.
No s'han de copiar després 003/004 a la cua normal i reaplicar-los sobre l'esquema activat.

CLI amb arguments estrictes (sense repetits/desconeguts):
- --mode prevalidate (per defecte) o apply.
- --database i --schema obligatoris: el CLI només autoritza nestly_dev/public.
- --manifest: ruta privada al manifest verificat.
- --approved-manifest-sha256: empremta explícita de l'artefacte revisat.
- apply exigeix a més --enable-activation yes --writers-paused yes --confirm-delete 1,2,3.
Aquests flags documenten la confirmació operativa, no proven que la pausa sigui efectiva
ni substitueixen l'autorització humana. No hi ha autenticació de la persona per checksum.
La capacitat de test és una dependència explícita de la funció, no disponible al CLI:
només nestly_test i l'esquema migration_e_<uuid> concret creat pel fixture.

Exemple futur de PREVALIDACIÓ, NO executat en aquest pas:
Des de backend, amb DATABASE_URL preparada de manera privada:
node --import tsx src/operations/activate-empty-products-cli.ts --mode prevalidate --database nestly_dev --schema public --manifest <ruta-privada/manifest.json> --approved-manifest-sha256 <empremta-revisada>
L'operador ha de carregar la connexió sense imprimir-la (p. ex. --env-file d'un fitxer privat).
No es proporciona una ordre apply preexecutada: requereix una autorització posterior específica.

Manifest revisat del pas 4:
<directori-privat-de-backup>/manifest.json
SHA-256 del MANIFEST: 9f0ae671d7a8c51f59b65f8245b527319d92247d449b9c8feb9efe1301789faa
No confondre amb el checksum de l'arxiu .dump, que també es comprova.

## Garanties de l'executor
- Pin del manifest, status verified, restore_verified/source_unchanged, IDs aprovats.
- Arxiu adjacent amb nom simple, no symlink, mida, capçalera PGDMP i SHA-256 exactes.
- Base real i endpoint del pool coincideixen amb l'origen; esquema explícit sense fallback.
- Prevalidació: transacció REPEATABLE READ READ ONLY, comprovació readonly=on i ROLLBACK;
  només SELECT/configuració local, cap DDL/DML ni escriptura de fitxers.
- Apply: transacció única, lock_timeout 3 s, statement_timeout 15 s, bloqueig de totes
  les taules legacy. Revalidació completa sota bloqueig abans de DELETE.
- Comparació exacta de dades, columnes, restriccions, índexs, triggers i seqüències
  amb el manifest; rebuig de dependències FK externes, vistes dependents, regles i herència.
- Exigeix exactament Items 1/2/3, sense fotos ni item_llista, i catàleg 8/41.
- DELETE restringit als tres IDs; no TRUNCATE, no reinici de seqüències, cap foto eliminada.
- Cossos 003/004 dins d'una sola transacció externa, amb comprovació dels embolcalls SQL.
- Abans de COMMIT: producte/item buits, NOT NULL/FK validada, catàlegs i altres dades
  intactes, estructura original preservada i seqüències antigues idèntiques.
- Errors esperats amb codis fixos; errors SQL/paths/causes no es mostren al CLI.
- COMMIT o ROLLBACK incert: PERSISTENCE_UNCERTAIN, connexió descartada i cap reintent.
L'executor no pot impedir un administrador extern de fer escriptures: pausa operativa obligatòria.
Tampoc és una eina genèrica per a altres esquemes, altres IDs o migracions amb fotos/llistes.

## Selecció backend
NESTLY_DATA_MODEL absent o legacy -> routers legacy.
NESTLY_DATA_MODEL=products-v1 -> únicament catàleg, creació, lectures i fotos de productes.
Qualsevol altre valor es rebutja. No es canvia cap .env existent.
createRuntimeApp comprova l'esquema abans d'arrencar; legacy es rebutja si existeix
estructura producte/producte_id. products-v1 exigeix NOT NULL, FK validada i assignacions.
Abans de cada escriptura es torna a comprovar el model estructural: un backend legacy
arrencat abans d'una activació no pot seguir escrivint quan l'esquema ja és nou.

GET /api/runtime-model retorna {model} amb Cache-Control: no-store.
Les escriptures de productes exigeixen X-Nestly-Model: products-v1; una pestanya antiga
sense aquest identificador o amb un altre model rep 409 MODEL_MISMATCH, sense crear Items.
El header és una garantia de compatibilitat, no un mecanisme d'autorització o autenticació.
Els routers preparatoris aïllats mantenen els seus contractes per als assajos; la política
s'aplica en el composition root nou. Sense selecció explícita no s'activa el model nou.

## Selecció frontend
VITE_NESTLY_DATA_MODEL absent o legacy -> pàgines legacy.
VITE_NESTLY_DATA_MODEL=products-v1 -> ProductItemsPage, ProductCreateItemsPage i ProductItemDetailPage.
URL conservades: /items, /items/nou, /items/:id.
El bootstrap verifica /api/runtime-model abans de crear router i QueryClient.
Si el model no coincideix o no es pot verificar, mostra manteniment; no fa fallback.
VITE_* és configuració de build/arrencada Vite: requereix recompilar/reiniciar el frontend
quan s'autoritzi activar. Canviar només la variable del backend no canvia un bundle existent.
Es munta un únic conjunt de pàgines; no es reutilitza la cache/context legacy en productes.
FormData només afegeix el header de model: Content-Type i boundary els decideix el navegador.
No hi ha reintents automàtics de creació.
Durant el desplegament coordinat, mantenir escriptors pausats i renovar les pestanyes.
El nou frontend també necessita el backend actualitzat en mode legacy per al handshake;
amb un backend antic sense /api/runtime-model queda en manteniment fins a coordinar versions.
No s'ha arrencat/reiniciat manualment cap servei habitual en aquest pas.

## Arrel persistent preparada (encara no seleccionada als serveis)
$LOCALAPPDATA/Nestly/photos/products-v1
Directori nou, buit, fora de Git i de Temp; ACL sense herència, FullControl només per a
l'usuari actual. Cap fitxer o fotografia preexistent mogut, reutilitzat o eliminat.
Configurar NESTLY_PHOTO_ROOT amb aquesta ruta quan s'autoritzi l'activació.
products-v1 exigeix una arrel existent, absoluta, accessible en lectura/escriptura,
sense symlinks, fora de Git i de Temp. Unix: rebutja permisos de grup/altres.
Windows: l'ACL privada s'ha preparat/verificat explícitament; cal repetir-ho si canvia
l'usuari del servei o la ruta. fs.access no equival a una auditoria completa d'ACL Windows.
Només nestly_test admet arrels temporals per als assajos aïllats.
Es conserva el mateix processador Sharp i storage per operació; checker producte + legacy.
Compensació conservadora i retenció davant incertesa continuen intactes; fotos antigues no s'eliminen.

## Assaig i validació
L'assaig crea legacy sintètic, catàleg 8/41 i registre de migracions sintètic.
Genera pg_dump real, restaura el SQL en un altre esquema nou de nestly_test amb psql,
compara l'estat i emet un manifest de prova; elimina només els recursos del fixture.
La requalificació SQL per a aquesta restauració és exclusiva de dades sintètiques,
amb noms d'esquema generats; NO és un procediment de restauració de dades personals.

Proves: destí no autoritzat, activació deshabilitada, pin incorrecte, backup alterat,
snapshot obsolet, FK/vista dependent, taula imprevista, prevalidació sense canvis,
fallada després del DDL amb rollback, activació atòmica i preservació de seqüències.
HTTP real amb la composició seleccionada: legacy per defecte, productes desactivats
abans de migrar, legacy impedit després, bloqueig de pestanya antiga, creació multipart,
substitució compartida, inventari, catàleg, detall i servei de fotos.
Frontend: selecció exclusiva, mateixes URL, handshake incompatible/indisponible,
regressions de formularis i navegació. Arrels: temporals/Git/relatives rebutjades.

## Pendent abans d'activar
Revisió humana del diff, nova autorització, identificació/pausa efectiva d'escriptors,
revalidació del backup durant la finestra, configuració explícita dels dos models i
arrel persistent. Conservar registre de l'execució amb versió del codi i checksum del
manifest; no reutilitzar la prevalidació com si congelés les dades indefinidament.
No tornar a legacy després de noves escriptures sense recuperació/reconciliació aprovada.
HEIC/HEIF i I5 continuen fora d'abast. Sense staging, commit, push o PR.

## Resultats finals d'aquest pas
- Backend: 264 proves, 26 fitxers, totes superades i cap omesa entre les seleccionades.
- catalog-postgres.test.ts no executat: consulta public preexistent; no necessari per a aquest canvi.
- Frontend: suite completa, 102 proves en 10 fitxers, totes superades.
- Typechecks backend/frontend superats.
- nestly_dev reconsultat READ ONLY (no executor): idèntic al manifest del backup,
  amb Items 1/2/3 presents i estructura/seqüències intactes.
- nestly_test conserva exactament els tres esquemes preexistents; empremtes d'Items
  idèntiques a les anteriors (manual 23, public 6, assaig estructural 2).
- Recursos temporals nous de les proves retirats; arrel persistent preparada encara buida.
- Cap dependència o lockfile modificat en aquest pas; cap servei habitual arrencat o aturat manualment.
- No s'ha fet inspecció visual amb navegador en aquest pas; les validacions són automatitzades.

## Fitxers d'aquest pas
Nous:
- backend/src/operations/activation-inventory.ts
- backend/src/operations/activate-empty-products.ts
- backend/src/operations/activate-empty-products-cli.ts
- backend/src/http/runtime-app.ts
- backend/src/infrastructure/product-photo-root.ts
- backend/tests/activation-postgres.test.ts
- backend/tests/runtime-config.test.ts
- backend/tests/support/activation-backup.ts
- frontend/src/data-model.ts
- frontend/src/data-model.test.tsx
- docs/decisions/m1-5-productes-fase-e-pas-5.md
Modificats respecte de l'estat acumulat anterior (alguns encara no seguits per Git):
- backend/src/index.ts
- frontend/src/App.tsx
- frontend/src/main.tsx
- frontend/src/features/items/product-items-api.ts
- frontend/src/features/items/product-items-api.test.ts
- frontend/src/features/items/ProductReadPages.tsx
- frontend/src/features/items/ProductCreateItemsPage.tsx
