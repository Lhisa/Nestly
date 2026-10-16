# Arrencada local de Nestly

## Model vigent: products-v1

M1.5 utilitza identitat explícita de producte. `producte_id` identifica el producte;
nom i subcategoria no en determinen la identitat. Dos productes amb el mateix nom
poden coexistir i no es fusionen automàticament.

Un producte té nom, classificació i una fotografia compartida. Cada Item és una unitat
amb identificador, estat de preparació i dates propis. L'inventari agrupa per
`producte_id`; els Items vinculats a llistes mantenen aquesta identitat, però queden
exclosos de l'inventari de casa. Els camps legacy es conserven temporalment i no són
la font activa del nom, la classificació o la fotografia en aquest model.

El formulari comença en «Crear producte nou» i permet afegir d'1 a 100 unitats o
seleccionar explícitament un producte existent. Els noms duplicats es distingeixen
amb classificació, identificador i fotografia. Sense fotografia nova s'hereta l'actual.
La primera fotografia s'afegeix en crear unitats addicionals. Substituir una fotografia
existent exigeix confirmació explícita i la versió observada; afecta totes les unitats,
també les antigues. Un conflicte conserva el formulari i exigeix revisar de nou la
confirmació. Una persistència incerta no es reintenta automàticament.

Les capçaleres de grup són neutres; cada unitat i el detall mostren la fotografia
compartida o un placeholder. Formats admesos: JPEG, PNG i WebP, fins a 10.000.000 bytes.
El backend valida el contingut real, rebutja animacions, corregeix l'orientació i genera
WebP de màxim 1600 px sense ampliar imatges petites. HEIC/HEIF continua pendent d'I5;
no s'anuncia ni s'accepta com a suportat.

## Prerequisits i estat de la base

Cal Node.js 24, npm i PostgreSQL. El Compose del projecte publica PostgreSQL a
`127.0.0.1:5433`. Comprova ports i processos abans d'arrencar; no substitueixis serveis
d'altres worktrees. Si PostgreSQL ja està saludable, reutilitza'l sense recrear volums.
Les dependències es preparen amb `npm ci` a `backend/` i `frontend/`, respectant lockfiles.

Prepara `backend/.env` a partir de `backend/.env.example`, amb `DATABASE_URL` privada
apuntant explícitament a `nestly_dev`, port 5433 i esquema `public`. No imprimeixis la
URL ni versionis aquest fitxer. El projecte és local i no incorpora autenticació.

Distingeix aquests dos estats abans de continuar:

| Estat | Arrencada compatible |
| --- | --- |
| Base legacy, sense estructura de productes | Backend i frontend legacy; no seleccionar `products-v1` abans d'una activació aprovada. |
| Base activada, amb `producte`, FK validada i `item.producte_id NOT NULL` | Backend i frontend `products-v1`; no tornar a l'escriptor legacy. |

L'entorn local de desenvolupament de M1.5 ja s'ha activat i verificat.
**No repeteixis l'executor ni els SQL preparatoris sobre aquesta base.**
Una instal·lació nova que només hagi executat les migracions ordinàries continua
sent legacy: l'arrencada no la transforma automàticament en una base de productes.

## Fotografies persistents i privades

`products-v1` exigeix `NESTLY_PHOTO_ROOT`: arrel existent, absoluta, accessible en
lectura/escriptura, fora de repositoris, worktrees i directoris temporals, sense enllaços.
Exemple privat per usuari: `Join-Path $env:LOCALAPPDATA 'Nestly\photos\products-v1'`.
Prepara la carpeta només si no existeix i verifica'n els permisos abans d'arrencar.
A Windows, revisa l'ACL perquè l'accés quedi limitat al compte que executa el backend;
`fs.access` no substitueix aquesta revisió. A Unix no s'admet accés de grup o altres.

Mantén exactament la mateixa arrel entre arrencades. El backend crea el subdirectori
`items` en desar la primera fotografia, però no crea l'arrel exigida pel model nou.
No utilitzis `frontend/public`, no moguis fotografies existents ni netegis orfes
manualment sense comprovar referències. La base desa referències, no bytes.
`GET /api/item-photos/:uuid` serveix només fitxers normalitzats i referenciats.
Les fotografies anteriors es conserven després d'una substitució; davant incertesa
transaccional o de referències també es conserven els fitxers.

## Arrencada products-v1 amb PowerShell

Utilitza dos terminals del mateix checkout. Les variables següents només afecten els
processos d'aquell terminal i no modifiquen configuracions permanents.

Terminal backend, des de `backend/`, amb `.env` privat preparat:

```powershell
$env:NESTLY_DATA_MODEL = 'products-v1'
$env:NESTLY_PRODUCT_WRITES = 'blocked'
$env:NESTLY_PHOTO_ROOT = Join-Path $env:LOCALAPPDATA 'Nestly\photos\products-v1'
$env:PGOPTIONS = '-c search_path=public'
node --env-file=.env --import tsx src/index.ts
```

El backend escolta a `http://127.0.0.1:3000`. Aquesta ordre evita el launcher i el
watcher durant les comprovacions operatives. La connexió procedeix de `.env`;
confirma'n el destí sense mostrar credencials.

Terminal frontend, des de `frontend/`:

```powershell
$env:VITE_NESTLY_DATA_MODEL = 'products-v1'
npm.cmd --% run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Aquesta és la sintaxi verificada a PowerShell: `npm.cmd --%` preserva literalment els
arguments després del separador `--`. Obre `http://127.0.0.1:5173/items`.
El proxy `/api` de Vite apunta al backend del port 3000; `strictPort` evita que Vite
canviï silenciosament de port. Les rutes són `/items`, `/items/nou` i `/items/:id`.

`VITE_NESTLY_DATA_MODEL` es resol en arrencar Vite o construir el bundle. Canviar només
el backend no actualitza el frontend: reinicia Vite o reconstrueix el bundle i recarrega
les pestanyes. El bootstrap verifica `GET /api/runtime-model`; una discrepància o un
error mostra manteniment, sense fallback a legacy. La memòria cau i el context de
navegació del model nou es mantenen separats dels legacy.

## Barrera i comprovacions

En `products-v1`, `NESTLY_PRODUCT_WRITES` absent o `blocked` tanca les escriptures;
només `open` les obre a l'arrencada. Un valor desconegut impedeix arrencar.
La barrera del servidor permet lectures i rebutja la resta de mètodes amb
`503 MAINTENANCE`, abans de parsejar el cos, desar fotografies o modificar PostgreSQL.
No hi ha endpoint públic per obrir-la. `X-Nestly-Model` comprova compatibilitat,
però no és autenticació ni permet eludir el manteniment.

Amb la barrera tancada, verifica `/api/runtime-model` (`products-v1`), `/api/categories`,
`/api/products`, `/api/items` i les pantalles sense desar. Un inventari buit i un detall
inexistent són estats vàlids; les lectures no creen dades.

Obrir escriptures requereix una decisió operativa explícita: atura ordenadament el
backend, confirma'n la sortida i el drenatge, canvia la variable del seu terminal a
`$env:NESTLY_PRODUCT_WRITES = 'open'` i repeteix l'ordre Node anterior. Conserva model,
connexió, esquema i arrel fotogràfica. Per tornar a bloquejar, repeteix l'aturada
verificada i arrenca amb `blocked`. No deixis `open` com a valor inadvertit per a
una futura finestra d'activació.

`SIGINT`/`SIGTERM` tanquen admissions, esperen les escriptures en curs i després
aturen HTTP i el pool. Si apareix «DRENATGE NO CONFIRMAT», no assumeixis rollback ni
una aturada completa: mantén la pausa i investiga processos, connexions i persistència.
Una desconnexió del client tampoc prova que no s'hagi confirmat una operació.
No utilitzis el launcher amb `taskkill /F` com a mecanisme de drenatge.

## Activació manual i recuperació

L'activació de l'esquema és una operació excepcional, separada de l'arrencada i amb
aprovació humana, backup verificat i escriptors pausats. Els SQL de
`backend/planned-migrations/productes/` no pertanyen a la cua ordinària i no s'executen
en iniciar serveis. No els copiïs a `backend/migrations/` per reaplicar-los.

L'executor manual existent és específic de la via B aprovada: exigeix exactament els
IDs ficticis 1, 2 i 3, sense fotografies ni vincles de llista, catàlegs 8/41 i un manifest
verificat que coincideixi amb l'origen. No és un inicialitzador genèric, no migra dades
reals i no és reutilitzable sobre una base activada. La prevalidació és de només lectura;
l'aplicació exigeix confirmacions addicionals i revalida dins d'una única transacció.
Consulta les [garanties de l'executor](decisions/m1-5-productes-fase-e-pas-5.md) i el
[procediment de backup i recuperació](decisions/m1-5-productes-fase-e-pas-4.md).

Un backup complet ha d'incloure esquema, dades, restriccions i seqüències, amb manifest,
mida, SHA-256 i restauració comprovada en una base nova. Inclou una còpia privada de
les fotografies referenciades quan n'hi hagi. Conserva també permisos i informació
necessària de rols per restaurar en un altre clúster, sense publicar credencials.

Abans del COMMIT, confirma el rollback abans de reprendre. Davant COMMIT incert, no
reexecutis DELETE/DDL ni creacions: verifica l'estat real i conserva fitxers. Després
del COMMIT però abans de noves escriptures, mantén la pausa i assaja la restauració en
una base nova abans de canviar la connexió. Després de noves escriptures, preserva
l'estat nou i les fotografies i acorda una reconciliació; restaurar cegament el backup
antic perdria dades. Tornar al backend legacy tampoc és segur: no representa la identitat
explícita i les seves insercions no satisfan `producte_id NOT NULL`.

## Proves i entorns separats

Les proves PostgreSQL utilitzen exclusivament `nestly_test`; no executis la suite contra
`nestly_dev`. Configura `NESTLY_ITEMS_TEST_DATABASE_URL` per als fixtures que creen
esquemes temporals nous. `TEST_DATABASE_URL` és per al test de catàleg legacy, que només
consulta: configura-hi `default_transaction_read_only=on` i `search_path=public`.
Les dues URLs han d'apuntar a `nestly_test`; no les versionis ni les imprimeixis.

Els tests aïllats preparen catàlegs sintètics i arrels fotogràfiques temporals pròpies,
i retiren només els recursos que han creat. No pressuposis que esquemes preexistents
de test siguin prescindibles. No eliminis volums per preparar proves.
La validació final de M1.5 ha superat 268 proves backend, 102 frontend i els dos typechecks.
Els antics documents d'increment són registre històric: no redefineixen el model vigent.

## Arrencada legacy i launcher de M0.6

Aquesta secció només correspon a una base que continua en estat legacy. Sense variables
de model, backend i frontend seleccionen legacy per compatibilitat. En una base activada,
utilitza les instruccions `products-v1` anteriors: el backend legacy en rebutja l'estructura.

El launcher de M0.6 s’utilitza des del checkout habitual, amb Node.js 24, npm i Docker Desktop amb el motor Linux disponible. Cal preparar una vegada el `.env` de l’arrel a partir de `.env.example` i instal·lar les dependències existents amb `npm ci` dins de `backend/` i `frontend/`. No cal instal·lar dependències a l’arrel.

Des de l’arrel, executa `npm run dev`. El launcher valida la configuració Compose i la propietat del contenidor a partir de l’etiqueta del `compose.yaml`, resolent els camins i ignorant majúscules a Windows. Rebutja un contenidor d’un altre checkout. Espera PostgreSQL healthy abans d’executar els scripts `dev` existents d’Express i Vite en paral·lel. Els seus logs apareixen al mateix terminal.

Les migracions són manuals: `npm run migrate:dev` des de `backend/`, amb el seu `.env` preparat. El launcher no les executa ni crea configuració o dades. La configuració de test és independent i no participa en l’arrencada.

En una primera instal·lació, prepara també `backend/.env` a partir de `backend/.env.example`, amb DATABASE_URL apuntant a nestly_dev. Inicia PostgreSQL amb `docker compose up -d postgres`, espera que estigui healthy i executa `npm run migrate:dev` dins de backend abans d’utilitzar dades reals. Per preparar test, crea backend/.env.test amb DATABASE_URL apuntant exclusivament a nestly_test i executa `npm run migrate:test`. No reutilitzis la URL de development per a test. Després pots utilitzar `npm run dev`; si PostgreSQL ja està actiu, el launcher el deixarà actiu en sortir.

Els scripts `migrate:dev:down` i `migrate:test:down` existeixen, però les migracions SQL actuals no defineixen operacions inverses. No constitueixen un mecanisme de reset. Un reset de test requereix un procediment controlat exclusiu de `nestly_test`, amb comprovació de destinació, còpia restaurable i verificació que development no canvia; no s’executa com a part de l’arrencada. No eliminis el volum compartit per reinicialitzar test.

Durant l’arrencada, `Ctrl+C` mostra «Arrencada cancel·lada» i executa el cleanup. La cancel·lació voluntària conserva el codi de sortida 0 si no hi ha errors reals ni fallades del cleanup. Una comanda en curs pot retardar la cancel·lació fins que acabi o expiri el seu timeout. Es comprova la cancel·lació entre fases abans d’iniciar més recursos.

`Ctrl+C` inicia el cleanup. A Windows s’utilitza `taskkill /PID … /T /F` exclusivament sobre els processos npm iniciats pel launcher i encara actius. És de millor esforç: si un pare desapareix abans del cleanup, poden quedar descendents orfes. No es maten processos per nom ni per port. En aquest cas, comprova manualment els processos propis i els terminals. No s’utilitzen Job Objects ni helpers.

PostgreSQL només s’atura si inicialment estava aturat i el launcher l’ha iniciat. El cleanup comprova l’ID, la propietat i l’instant d’arrencada abans d’aturar aquest contenidor exacte. Si ja funcionava, es deixa actiu. No s’eliminen contenidors ni volums. Si cal crear el contenidor i s’interromp l’arrencada abans d’iniciar-lo, pot quedar creat i aturat.

No executis launchers simultanis sobre el mateix servei ni modifiquis el contenidor mentre el launcher està actiu. La detecció de propietat, múltiples contenidors i reinicis externs cobreix conflictes simples; no és un sistema de coordinació atòmic. El healthcheck comprova PostgreSQL, no les migracions ni la integració funcional. Les fallades d’Express o Vite activen el cleanup; els missatges d’arrencada d’aquests processos són la referència de disponibilitat.

Si el pare d’un procés ja ha finalitzat o desapareix durant el cleanup, el launcher avisa de possibles descendents orfes. No reutilitza el PID antic per intentar aturar-los. Si Docker ha iniciat PostgreSQL però falla la comprovació posterior abans de registrar l’instant d’arrencada, el cleanup no atura el contenidor actiu: mostra l’ID i demana revisió manual, amb sortida d’error. La supervisió de PostgreSQL cada dos segons es conserva per activar el cleanup si deixa d’estar healthy.

La prova manual de l’Usuària en PowerShell habitual ha confirmat l’arrencada i el cleanup amb Ctrl+C. La incidència anterior al terminal de proves de Codex no s’hi ha reproduït i no té una causa demostrada. L’estat i les evidències de tancament es mantenen al [pla d’implementació, §3.8](./pla-implementacio-v1.md#38-m06-i-revisió-de-tancament-de-m0--2026-10-08).
