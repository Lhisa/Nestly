# Arrencada local de Nestly

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
