# M1.3 — Formulari i prova humana de la fase 3

Estat: implementat, pendent de revisió humana del codi i autorització explícita del commit. La usuària ha comunicat que ha completat les 9 proves manuals de la guia. Els tests automàtics no substitueixen aquesta validació. No hi ha commit de la fase 3.

## Abast i decisions

Registre directe a casa a /items/nou, llistat no agrupat en targetes individuals a /items, sense fotografies ni filtres. Un Item persistent correspon a una targeta; es conserva l’ordre de l’API. React Hook Form gestiona blur, enviament, errors i dirty state; TanStack Query gestiona cataleg, lectura i mutació sense retries de POST. Valors inicials: nom buit, classificacio buida, quantitat 1 i no_preparada. La confirmació utilitza created_count real, dura 8 segons com a candidat provisional i s'anuncia amb role=status.

Fonts locals originals Newsreader i Source Sans 3 obtingudes de google/fonts, amb OFL preservades a frontend/public/fonts. Els colors, mesures i distribucio de v0.1 continuen provisionals; no es modifica el Design System documental. Dos blocs editorials i radios natius. La navegació del shell es conserva.

## Excepció de React Router aprovada

App.tsx exporta les mateixes rutes mitjancant createRoutesFromElements i afegeix /items/nou. main.tsx crea createBrowserRouter i renderitza RouterProvider dins dels proveïdors existents. No hi ha loaders ni actions. ApplicationShell no canvia.

UnsavedChangesGuard utilitza useBlocker per navegacións internes i historial. El diàleg natiu modal té títol, descripció, focus inicial a Continuar editant, Escape per continuar i retorn del focus. Descartar continua la navegació pendent. useBeforeUnload protegeix descarrega/recarrega mentre hi ha canvis. Després de resposta 201 la protecció es desactiva abans de navegar.

Límits: el navegador controla el text i els botons de beforeunload, necessita normalment interacció prèvia i pot no mostrar-lo en alguns escenaris mòbils, tancament forcat o finalització del procés. No es pot garantir recuperació de dades després de recarregar: no hi ha drafts. El blocker requereix historial creat pel router; les sortides fora del document depenen de beforeunload. Si es perd la resposta després que PostgreSQL hagi completat el COMMIT, els Items poden haver quedat desats encara que el formulari mostri un error. L’atomicitat no evita duplicats si es repeteix l’operació: el POST no té un mecanisme d’idempotència. No hi ha retry automàtic i cal consultar el llistat abans de tornar a enviar-lo.

## Arrencada segura des del worktree

Arrel: C:\Users\Mireia\.codex\worktrees\m1-3-items\Nestly. PostgreSQL existent ha d'estar disponible; no executar el launcher del checkout principal ni docker compose up des d'aquest worktree. No executar migracions.

Prepara backend/.env.test local, ignorat per Git, amb DATABASE_URL exclusivament a nestly_test. Pots copiar la configuració de test existent del checkout principal després de comprovar-ne el destí; mai .env de development. No incloure credencials a documentació ni commits.

Terminal backend, des de backend:

```powershell
node --env-file=.env.test --import tsx ../scripts/start-m13-test-backend.mjs
```

El helper rebutja destíns diferents, comprova que 3000 està lliure i verifica current_database amb SELECT abans d'arrencar l'API. No escriu a PostgreSQL.

Terminal frontend, des de frontend:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
```

Si 5173 està ocupat, comprova qui l'utilitza abans de continuar; strictPort impedeix canviar silenciosament de port. Obre http://127.0.0.1:5173/items. Ctrl+C a cada terminal atura únicament aquests serveis. Durant aquesta execució s'han deixat frontend i backend actius per a la revisió; no iniciar-ne còpies simultanies. Destí real verificat nestly_test; dues unitats «Prova M1.3 navegador», IDs 1 i 2, Preparat, creades per la prova real i conservades. nestly_dev no s'ha utilitzat.

## Guia manual obligatòria

| Prova | Passos | Resultat esperat |
| --- | --- | --- |
| Formulari buit | Items → Registrar Items → Cancel·lar, sense editar | Retorn al llistat sense diàleg. |
| Formulari modificat | Entrar al formulari, escriure un nom i clicar Items o Cancel·lar | Dialog de sortida; dades conservades; focus a Continuar editant. |
| Continuar editant | Al diàleg, triar Continuar editant; repetir i premer Escape | Es tanca el diàleg, mateixa ruta i dades, focus retornat. |
| Descartar | Modificar el nom, clicar Inici i Descartar canvis | Arriba a Inici; tornar al formulari mostra valors inicials. |
| Enrere | Entrar des del llistat, editar i premer Enrere | Dialog; continuar manté ruta/dades; repetir i descartar torna al llistat. |
| Endavant | Crear historial Items → formulari → Inici sense canvis; Enrere al formulari, editar i Endavant | Dialog; continuar manté el formulari; descartar va a Inici. |
| Recarregar | Editar el formulari i recarregar | Avis natiu; cancel·lar conserva dades. Acceptar recarrega i perd dades. Sense canvis no hi ha avís. |
| Guardar i navegar | A nestly_test, nom identificable, classificacio, quantitat 2, Preparat; Registrar Items | Un POST, retorn al llistat, S'han creat 2 Items i dues unitats independents Preparat. Navegar i recarregar el llistat no mostra avís. |
| Teclat i zoom | Recorrer Tab, radios amb fletxes, diàleg amb Tab/Escape; zoom real 200%, desktop i mòbil | Labels llegibles, focus visible/no ocult, diàleg modal, controls operables i cap desbordament horitzontal. |

La usuària ha comunicat la finalització de les 9 proves manuals, incloent valors inicials, classificació dependent, validacions, creació d’una i diverses unitats, conservació de dades, navegació protegida, recàrrega i aspectes visuals i d’accessibilitat. No s’ha aportat una matriu detallada de navegadors, dispositius o lector de pantalla; no es presenta com una certificació entre navegadors.

## Indicadors provisionals de preparació

Es conserva la variant A: cercle geomètric de traç fi, amb verificació per a Preparat i sense verificació per a No preparat. SVG decoratiu, amb text sempre visible. La comparació temporal i la seva ruta s’han eliminat. L’exploració d’iconografia artesanal queda ajornada fins al Design Lab d’iconografia i il·lustracions.
