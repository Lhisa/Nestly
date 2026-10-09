# M1.2 — Catàleg de classificació i selectors dependents

Implementació limitada a consultar Categories/Subcategories reals i seleccionar la classificació a Items. No crea Items ni implementa quantitats, fotografies, agrupació o filtres. M1.2 està implementada i validada a `feature/m1-2-classificacio`, pendent de publicació, revisió de la Pull Request i integració a `main`.

## Contracte HTTP

`GET /api/categories` retorna HTTP 200 amb `{ categories: [...] }`. Cada Categoria conté `id`, `nom` i `subcategories`; cada Subcategoria conté `id` i `nom`. La Categoria pare determina inequívocament la relació. Els IDs són els persistents de PostgreSQL. Categories i Subcategories s’ordenen per ID ascendent, coherent amb l’ordre d’inserció del catàleg de M0, independent de collation o traduccions. La consulta inclou Categories sense Subcategories amb un array buit.

Un catàleg sense Categories retorna `{ categories: [] }`, no 404. Una fallada inesperada retorna HTTP 500 amb `{ code: "INTERNAL_ERROR", message: "No s’ha pogut carregar el catàleg de classificació." }`, sense detalls SQL ni stack al client; el backend registra l’error. No hi ha operacions d’escriptura de classificació.

## Responsabilitats i decisions

Domain descriu les dades del catàleg; no s’inventen regles de negoci per a una consulta. Application depèn d’un lector mínim. Infrastructure fa un únic LEFT JOIN SQL amb pg, sense paràmetres perquè aquesta consulta no rep criteris. HTTP retorna el contracte i controla els errors. index.ts compon les dependències i exigeix DATABASE_URL.

TanStack Query, ja adoptat a A10, gestiona el primer server state real. Els selectors mantenen localment els IDs escollits, sense preselecció ni fallback. Categoria determina les opcions de Subcategoria i canviar-la neteja una selecció incompatible. Pendent de classificar és una dada normal del catàleg. Es mostren càrrega, error persistent amb reintent, catàleg buit i Categoria sense Subcategories. El proxy de Vite /api permet la connexió local sense afegir CORS o URLs de backend als components.

No es crea encara un formulari de registre complet ni s’incorpora React Hook Form. A Items es mostra només la classificació amb labels, controls required i ajuda accessible; no hi ha cap acció de desament.

## Arrencada i prova manual

En aquest worktree només cal `backend/.env`, ignorat per Git, amb `DATABASE_URL` apuntant a `nestly_dev` al port local 5433. El backend el carrega amb els scripts `dev`/`start`; el frontend no necessita `.env`. Les dependències de backend/frontend estan instal·lades. PostgreSQL ha d’estar actiu i tenir les migracions M0 aplicades. El contenidor existent pertany al checkout principal: el launcher de l’arrel del worktree el rebutja; per provar M1.2 s’utilitzen els scripts de backend i frontend en dos terminals, sense executar Compose, migracions ni modificar la propietat del contenidor.

1. En dos terminals PowerShell, entra respectivament a `backend/` i `frontend/` d’aquest worktree i executa `npm run dev` a cadascun. Obre `http://localhost:5173` (o la URL indicada per Vite). El backend escolta a `http://127.0.0.1:3000`; el proxy `/api` de Vite hi dirigeix les consultes. Comprova abans que els ports no estiguin ocupats per un altre checkout. Per acabar, prem `Ctrl+C` en tots dos terminals.
2. Entra a Nestly Central i navega a Items.
3. Comprova que no hi ha cap Categoria seleccionada i Subcategoria està desactivada.
4. Selecciona Roba i Bodies; canvia a Mobles i comprova que Bodies desapareix i la selecció queda buida.
5. Selecciona Categoria Pendent de classificar i després la Subcategoria del mateix nom explícitament.
6. Comprova que no existeix botó per crear un Item.
7. Amb el backend aturat, recarrega Items: apareix l’error; arrenca’l i prem Torna-ho a provar.

L’absència de dades i de Subcategories es cobreix amb proves automatitzades: no cal buidar el catàleg personal per provar-les.

## Proves

Backend: npm test. Frontend: npm test. Tots dos: npm run typecheck i npm run build. No hi ha lint configurat.

Vitest és el runner adoptat a A11; React Testing Library, user-event i jsdom cobreixen els selectors sense afegir infraestructura E2E. Les fixtures només existeixen en tests i no substitueixen el catàleg real de l’aplicació.

La prova backend d’integració real només s’executa quan TEST_DATABASE_URL apunta a nestly_test; consulta les taules existents sense crear ni eliminar dades. Amb el catàleg M0 aplicat, comprova 8 Categories, 41 Subcategories, relacions, ordre determinista i Pendent de classificar. Si no hi ha URL, la prova queda explícitament omesa. No utilitzis development com a destinació de test ni executis migracions automàtiques.

## Resultat de verificació de M1.2

- TypeScript i build de backend/frontend: correctes.
- Backend: 4 proves correctes: 3 HTTP (catàleg, buit i error d’infraestructura) i 1 d’integració amb PostgreSQL real a `nestly_test`.
- Frontend: 5 proves correctes (càrrega, selecció dependent i neteja, Pendent de classificar explícit, reintent, buit i Categoria sense Subcategories).
- PostgreSQL real validat: `nestly_dev` i `nestly_test` disponibles, amb les migracions 001/002 aplicades i 8 Categories/41 Subcategories. `GET /api/categories` amb el lector real a `nestly_dev` retorna HTTP 200 i el catàleg correcte, també a través del proxy Vite.
- Prova manual al navegador superada i confirmada per la persona usuària: selectors dependents, canvi de Categoria i selecció explícita de Pendent de classificar.
- No hi ha lint configurat. Cap migració o dada personal modificada; cap push, integració a `main` ni inici de M1.3.

Per repetir la prova d’integració en PowerShell, amb nestly_test ja preparada, configura TEST_DATABASE_URL amb la seva URL local i executa npm test des de backend. La prova rebutja qualsevol base de dades diferent de nestly_test.
