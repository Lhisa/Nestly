# Pla d’implementació incremental — Nestly V1

## 1. Objectiu, estat i fonts

Aquest pla proposa l’ordre d’implementació de Nestly V1 mitjançant increments petits i verificables. **M0 — Fonaments tècnics mínims i shell està completada: M0.1–M0.6 estan implementats i tots els criteris obligatoris estan verificats. Els increments següents continuen subjectes a revisió humana.** No modifica decisions funcionals, de domini, UI/UX o arquitectura.

Les fonts de veritat són [AGENTS.md](../AGENTS.md), [Idea V1](./idea-v1.md), [Requisits V1](./requisits-v1.md), [Model de domini V1](./model-domini-v1.md), [Casos d’ús V1](./casos-us-v1.md), [Disseny UI/UX V1](./disseny-ui-ux-v1.md) i [Arquitectura V1](./arquitectura-v1.md). Els wireframes s’interpreten amb les actualitzacions i observacions de la documentació UI/UX.

## 2. Principis dels increments

- Treballar principalment amb vertical slices: un recorregut funcional que travessa les capes necessàries, en lloc de completar totes les capes per separat.
- Obtenir feedback executable aviat. M0 és la preparació tècnica mínima; els increments funcionals següents busquen recorreguts reals de punta a punta.
- Evitar infraestructura preventiva i crear abstraccions només quan una necessitat concreta les justifiqui.
- Incorporar i configurar dependències al primer increment que les necessiti, respectant les eines adoptades a l’arquitectura.
- Integrar els tests dins de cada increment. No reservar-los per a una fase final.
- No confondre taules disponibles amb funcionalitats implementades ni mostrar accions que aparentin estar disponibles quan encara no ho estan.
- Mantenir les limitacions temporals explícites. Un increment parcial no es presenta com la V1 completa, ni una part interna es presenta com un milestone acabat.

## 3. M0 — Fonaments tècnics mínims i shell

### 3.1. Resultat esperat

Una base executable localment amb el recorregut **Landing → Dashboard → Items**, PostgreSQL reproduïble, esquema V1 complet i dades base disponibles. M0 no implementa funcionalitat de negoci d’Items, Llistes, Botigues o Recomanacions.

Landing i Dashboard són estructura i navegació mínima, sense mètriques o dades provisionals inventades. Items és en aquest moment el destí del shell; la consulta real arriba a M1. No s’exposen opcions que facin creure que les funcionalitats futures ja funcionen.

### 3.2. Estructura i aplicacions

Es manté un únic repositori amb `frontend/`, `backend/` i `docs/`, segons A12. El backend respecta les responsabilitats `domain`, `application`, `infrastructure` i `http` d’A05; el frontend s’organitza principalment per features segons A10. Això no exigeix crear carpetes buides ni ports, repositories, factories, helpers o components preventius.

El frontend mínim de M0.5 incorpora React, TypeScript i React Router. TanStack Query s’incorporarà just-in-time quan existeixi server state real. React Hook Form s’incorpora quan existeixi el primer formulari real que el necessiti, no per preparar formularis futurs a M0.

El backend mínim incorpora Node.js, Express i TypeScript, mantenint la separació de responsabilitats. No s’implementen CRUD ni endpoints per totes les entitats. No s’introdueixen workspaces, packages compartits preventius ni infraestructura de monorepo.

### 3.3. PostgreSQL i esquema complet

PostgreSQL s’executa en una única instància/container local gestionada amb Docker Compose, amb dues bases de dades separades i dades independents, segons el refinament de M0.2 a [A12 §13.3](./arquitectura-v1.md#133-postgresql-i-docker):

| Entorn | Base de dades |
| --- | --- |
| Development | `nestly_dev` |
| Test | `nestly_test` |

React i Express s’executen localment. El reset de test es limita a `nestly_test`, sense afectar les dades de desenvolupament ni destruir el container o el volum compartits.

Com a excepció explícita a la incorporació funcional progressiva, M0 crea l’estructura completa de les set taules V1: `categoria`, `subcategoria`, `item`, `recomanacio`, `botiga`, `llista_nado` i `item_llista`.

Les migracions respecten A07: relacions, cardinalitats, FK, UNIQUE, CHECK, CASCADE/RESTRICT, identificadors, estats, dates, nul·labilitat i imports. Es manté NUMERIC(7,2), sense persistir imports derivats ni totals. Les invariants entre taules que A07 atribueix a Domain/Application no es converteixen en nous CHECK ni autoritzen implementar ara els casos d’ús futurs.

S’utilitza node-pg-migrate, amb el mateix historial versionat per a development i test i preferència per SQL explícit, sense ORM. Una migració es pot ajustar mentre està en desenvolupament i encara no s’ha consolidat com a part de l’historial aplicat. Un cop aplicada i consolidada, es considera immutable. `001_create_initial_schema.sql` ja està aplicada i consolidada i no s’ha de modificar. Qualsevol canvi posterior de l’esquema o del catàleg base es fa mitjançant una nova migració. Qualsevol necessitat de reconsiderar una decisió tancada s’ha de revisar abans de canviar-la.

### 3.4. Categories i Subcategories predefinides

Una instal·lació nova ha de disposar de les dades base necessàries de manera reproduïble, sense INSERT manuals. El catàleg inicial de Categories i Subcategories és dada base obligatòria de Nestly V1, no seed data de desenvolupament ni fixtures de test, i no té gestió per l’Usuari en V1.

La decisió de M0.4 és carregar el catàleg mitjançant la migració versionada `backend/migrations/002_insert_initial_catalog.sql`, dins del mateix historial de development i test. Insereix 8 Categories i 41 Subcategories i obté els IDs de Categoria pel nom, sense hardcodejar-los. No s’introdueixen seeds separats. Un cop tancada M0.4, aquesta migració queda aplicada i consolidada i passa a formar part de l’historial immutable. Els futurs canvis del catàleg es faran amb migracions noves, sense modificar migracions ja aplicades i consolidades.

El catàleg inicial complet ja està aprovat i es defineix al [model de domini, §4.2](./model-domini-v1.md#catàleg-inicial-predefinit-de-v1), inclosa la Categoria i Subcategoria **Pendent de classificar**. M0 proporciona aquest catàleg sense ampliar-lo ni reorganitzar-lo.

### 3.5. Configuració i execució local

Es prepara el mínim necessari per utilitzar environment variables, `.env` local no versionat, `.env.example` sense secrets, configuracions separades development/test i validació de configuració essencial en arrencar. No es tria preventivament una llibreria de validació.

M0.6 implementa `npm run dev` a l’arrel amb Node.js 24, sense dependències addicionals. El launcher espera PostgreSQL healthy i inicia Express i Vite localment. `Ctrl+C` executa el cleanup; PostgreSQL només s’atura si l’ha iniciat el launcher, després de verificar-ne la identitat i propietat. La primera instal·lació, les migracions manuals i les limitacions es documenten a [Arrencada local](./arrencada-local.md). No s’introdueixen Electron, serveis de sistema, infraestructura cloud ni containerització del backend.

### 3.6. Verificació i criteris de sortida

- El recorregut del shell funciona sense simular funcionalitats de negoci.
- L’arrencada local és reproduïble amb la configuració documentada i sense secrets versionats.
- El mateix historial de migracions crea l’esquema V1 als dos entorns; es comproven les restriccions rellevants amb PostgreSQL real de test segons A11.
- Les dades base aprovades es poden obtenir en una instal·lació nova sense intervenció SQL manual.
- Reinicialitzar test no afecta les dades de development.

Només s’instal·len les eines de testing necessàries per aquestes verificacions. Vitest és el runner adoptat; Supertest s’incorpora quan hi hagi un contracte HTTP a provar, React Testing Library quan calgui verificar comportament de components i Playwright quan existeixi un flux E2E que ho justifiqui. No s’instal·len totes les eines per anticipació ni s’imposen tots els nivells a M0.

### 3.7. M0.5 — Application Shell

M0.5 construeix només l’esquelet funcional de navegació, amb placeholders explícits i sense dades fictícies, formularis, estadístiques o connexió al backend. La Portada mínima és fora de l’ApplicationShell i permet entrar a Inici. No és una barrera: les rutes internes admeten accés directe i recàrrega sense redirigir a la Portada.

| Ruta | Pantalla |
| --- | --- |
| `/` | Portada |
| `/inici` | Dashboard/Inici pendent d’implementar |
| `/items` | Items |
| `/llistes` | Llistes |
| `/recomanacions` | Recomanacions |
| `/botigues` | Botigues |
| `/mes` | Més, amb accessos a Recomanacions i Botigues |
| URL desconeguda | 404 amb retorn a Inici |

Les rutes internes comparteixen un shell. Desktop té sidebar permanent amb Inici, Items, Llistes, Recomanacions i Botigues; `/mes` continua accessible però no apareix al sidebar. Mòbil té navegació inferior amb Inici, Items, Llistes i Més. Més es considera actiu a `/mes`, `/recomanacions` i `/botigues`.

El CSS és mínim i funcional, amb comportament responsive provisional i revisable, focus visible i navegació oculta fora de l’ordre de teclat. La navegació mòbil inferior té el seu espai i no se superposa al contingut. No es defineix high-fi, design system ni l’animació definitiva de Portada. La 404 es renderitza dins del shell per conservar els accessos coneguts.

M0.5 es valida amb les comprovacions manuals i tècniques actuals: tipus, build, les rutes, navegació responsive i activa, Més, historial, accés directe/recàrrega i teclat. No s’introdueixen Vitest, React Testing Library ni altres dependències o infraestructura de testing frontend en aquesta fita. El testing frontend s’introduirà just-in-time durant M1, quan existeixi funcionalitat real que justifiqui protegir comportaments amb tests.

**M0.5 — Application Shell: tancat/completat**, amb code review funcional aprovat i versionat al commit `38fb603848e8e4d195e677b8abb0e75a00258f04`.

### 3.8. M0.6 i revisió de tancament de M0 — 2026-10-08

**M0.6 — Verificació integral i orquestrador local: completada. M0 — Fonaments tècnics mínims i shell: completada**, amb tots els criteris obligatoris verificats. El commit i el push de M0.6 i del tancament documental continuen pendents de revisió final i autorització explícita.

L’Usuària ha verificat manualment en PowerShell habitual l’arrencada conjunta, PostgreSQL healthy, Express al port 3000, Vite al 5173 i el cleanup amb Ctrl+C, amb ports sense listeners i PostgreSQL Exited (0). La incidència observada al terminal de Codex no s’ha reproduït en aquesta prova; la causa no està demostrada.

| Criteri de §3.6 | Evidència de verificació |
| --- | --- |
| Recorregut del shell | Portada → Inici → Items, rutes internes i navegació mòbil comprovats en navegador real, amb placeholders explícits. |
| Arrencada reproduïble i configuració sense secrets versionats | npm ci, dependències, typecheck/build i prova manual en PowerShell habitual; fitxers .env locals ignorats, només exemples versionats. |
| Mateix historial, esquema V1 i restriccions en PostgreSQL real | Esquema i catàlegs comparats a dev/test amb les migracions; proves efectives en bases temporals de NOT NULL, UNIQUE, FK, CHECK, límits NUMERIC, RESTRICT (23001 amb registres conservats) i CASCADE (dependents eliminats, registres no relacionats conservats). |
| Catàleg en una instal·lació nova sense SQL manual | Runner existent executat en base temporal buida: set taules, historial 001/002, comparació exacta de les 8 Categories i 41 Subcategories, inclòs Pendent de classificar. Segon up sense migracions pendents ni duplicats. |
| Reinicialitzar test no afecta development | Reset exclusiu de public a nestly_test, migracions 001/002 i catàleg verificats; còpia prèviament restaurada i validada en base temporal, després restauració de l’estat original de test. Empremtes SHA-256 de development idèntiques abans/després, incloses dades, esquema, permisos, historial i seqüències. |

La persistència també s’ha verificat amb consultes READ ONLY abans i després d’un cicle d’aturada/arrencada de PostgreSQL. La restauració final de test conserva dades, esquema, propietaris, permisos efectius, restriccions, índexs, historial i seqüències. S’han acceptat exclusivament tres equivalències de representació verificades: ACL NULL de public i ACL explícita amb els mateixos permisos; conversió de l’array complet o de cada literal a text en chk_item_estat_preparacio i chk_item_llista_estat_comanda. La resta de comparacions es manté estricta.

PostgreSQL ha quedat Exited (0), com inicialment. Les còpies de seguretat i la base temporal de comprovació conservada són recursos locals i no formen part del repositori. La primera integració funcional frontend–backend–PostgreSQL correspon a M1 i no s’ha avançat. Les instruccions i limitacions operatives es mantenen a [Arrencada local](./arrencada-local.md).

## 4. M1 — Registrar i consultar Items que ja són a casa

### 4.1. Resultat i abast funcional

M1 està complet quan l’Usuari pot registrar d’1 a 100 Items reals que ja té a casa en una operació atòmica, amb fotografia opcional compartida, consultar-los individualment i agrupats amb filtres de classificació, i comprovar que dades i fotografia persisteixen després de reiniciar els serveis. Es basa en CU-08/CU-09 i les decisions aprovades D1–D11, incorporades a requisits, domini, UI/UX i arquitectura. La implementació de M1 encara no s’ha iniciat; aquesta actualització és documental i queda preparada per a revisió.

M1 utilitza les Categories/Subcategories predefinides de M0. L’Item representa una unitat física, té nom validat segons RF-01a i exactament una Subcategoria; la Categoria s’obté a través d’aquesta relació. No es crea ITEM_LLISTA per a un Item incorporat directament a casa.

El formulari exigeix nom segons RF-01a, Categoria i Subcategoria dependent seleccionades explícitament, quantitat obligatòria inicial 1 (enter 1–100) i preparació seleccionable, inicialment **No preparat**. Totes les unitats reben l’estat escollit segons l’excepció aprovada de RF-06; la recollida de Llista conserva la inicialització obligatòria a **no preparada**. **Pendent de classificar** és explícit, mai fallback automàtic. No es demana data d’entrada a casa: queda a NULL segons A07. No s’afegeix quantitat, Categoria ni grup persistent a Item; les migracions actuals permeten M1 sense canvis imprescindibles.

La consulta agrupa per mateixa Subcategoria i nom retallat als extrems, insensible a majúscules/minúscules, conservant el nom original sense normalitzar accents ni espais interiors. Cada grup mostra el total, capçalera visual neutra i unitats desplegables amb preparació, fotografia, ID i detall individuals. Pot reunir registres de moments diferents. S’ordena per màxima `data_creacio DESC`, amb màxim ID descendent en empat; les unitats per `data_creacio DESC, id DESC`.

Inclou filtres conjuntius de Categoria/Subcategoria, inicialment tots els Items de M1, amb neteja de Subcategoria incompatible en canviar Categoria. Distingeix buit i sense coincidències. No inclou cerca textual. Després de crear torna al llistat amb **S’han creat N Items**, diferenciant N del total acumulat; el grup queda accessible i, preferentment, desplegat. La consulta futura a casa també inclourà recollits de Llista; no es determina només per `data_entrada_casa IS NOT NULL`.

### 4.2. Limitació temporal del formulari

Només s’implementa el flux **A casa**. No s’ofereix **En una llista** ni cal demanar una selecció de situació mentre només n’hi hagi una d’implementada. És la limitació temporal explícita d’aquest increment, no una modificació de RF-01c, CU-08 o UI/UX.

Quan s’incorporin Items en Llistes, el formulari adoptarà la selecció explícita entre les dues situacions, sense valor preseleccionat, i la resta del comportament ja documentat. M1 no es presenta com la implementació completa de CU-08, CU-09 o de la feature Items.

### 4.3. Fotografia inclosa en M1

La fotografia és opcional per a cada Item però el suport de fotografia és obligatori per completar M1. Inclou selecció, previsualització abans de crear, processament real, persistència al filesystem i visualització al llistat i al detall. Sense fotografia s’utilitza el placeholder definit a UI/UX.

En una creació múltiple es processa una sola vegada i les N unitats comparteixen la referència, sense duplicar el fitxer. El llistat la mostra per unitat, no a la capçalera neutra del grup. Cap substitució o eliminació futura pot trencar altres referències: només es neteja un fitxer quan cap Item el referencia. Si falla persistència després del guardat, es reverteixen totes les insercions i s’intenta netejar el fitxer nou; una fallada de neteja es registra i pot deixar un orfe temporal, sense transacció ACID conjunta.

S’aplica A09 complet: màxim una fotografia, límit inicial configurable de 10 MB, validació per decodificació real, correcció d’orientació, preservació de proporcions, costat llarg màxim inicial de 1600 px sense ampliació i sortida WebP. No es conserva l’original.

Sharp és la llibreria general; libheif-js decodifica les entrades HEIC/HEIF que Sharp no pugui decodificar de manera fiable i el resultat continua pel pipeline de Sharp. Aquesta responsabilitat queda a Infrastructure, sense exposar llibreries o detalls de decoding a Domain, Application o frontend. PostgreSQL conserva la referència relativa, no el binari ni una ruta absoluta.

Sharp i libheif-js s’incorporen quan es construeixi aquest pipeline real. Es manté el criteri d’actualització de dependències, especialment per seguretat. Es comproven els errors i la coordinació entre filesystem i persistència segons A09, sense inventar una transacció ACID conjunta.

### 4.4. Increments de M1 i verificació

| Pas | Resultat verificable |
| --- | --- |
| M1.1 — Documentació i contracte aprovats | D1–D11 incorporades i contractes conceptuals coherents; canvis documentals preparats, pendents de revisió del resultat. No acredita implementació. |
| M1.2 — Catàleg de classificació i selectors dependents | Depèn de M1.1. Consulta de dades reals, selecció explícita i neteja de Subcategoria incompatible; Pendent de classificar només per elecció. |
| M1.3 — Creació múltiple i consulta individual sense fotografia | Depèn de M1.2. N IDs independents, nom vàlid, quantitat 1/100 acceptada i 0/101/decimals rebutjats, estat seleccionat, zero insercions parcials en fallada i accés individual. |
| M1.4 — Agrupació, ordenació i filtres | Depèn de M1.3. Casos de majúscules i extrems, accents/espais interiors preservats, Subcategories separades, moments/estats diferents, desempat estable, filtres conjuntius, desplegat i distinció buit/sense coincidències. |
| M1.5 — Fotografies opcionals i compartides | Depèn de M1.3; s’integra amb M1.4. Previsualització, pipeline A09 i HEIC/HEIF, un fitxer per operació, N referències vàlides, errors/compensació i protecció de referències compartides. |
| M1.6 — Validació integrada i criteris d’acceptació | Depèn de M1.2–M1.5. Recorregut complet, errors i feedback, N creades diferenciades del total, consulta individual/agrupada i persistència de dades/fotos després del reinici. |

Els passos es poden ajustar durant la implementació i inclouen les capes i proves necessàries per al seu recorregut. No són fases horitzontals per completar primer tot el backend o tot el frontend. Es pot obtenir primer un flux sense foto, però encara no és M1 complet.

React Hook Form s’incorpora amb el formulari real. No es fixen aquí endpoints exhaustius, noms de classes, hooks, components, ports o abstraccions.

### 4.5. Flux d’acceptació de M1

1. Arrencar Nestly i entrar per la Landing.
2. Arribar al Dashboard i navegar a Items.
3. Consultar el llistat actual, amb estat buit quan no hi ha Items.
4. Prémer l’acció d’afegir Item, introduir nom, seleccionar Categoria/Subcategoria, indicar quantitat 1–100 i preparació per registrar directament a casa.
5. Adjuntar opcionalment una fotografia i veure’n la previsualització abans de crear.
6. Crear N Items: frontend i backend validen, PostgreSQL persisteix totes les unitats o cap i, amb fotografia, A09 genera un únic fitxer compartit.
7. Tornar al llistat amb **S’han creat N Items**, grup accessible i preferentment desplegat; diferenciar N del total si hi havia unitats anteriors.
8. Comprovar agrupació, ordenació i filtres; consultar unitats amb preparació i fotografia pròpies, si n’hi ha, i accedir als detalls individuals.
9. Tancar Nestly i tornar-lo a arrencar.
10. Tornar al llistat i al detall i comprovar que les dades i la fotografia continuen disponibles.

La verificació inclou creació amb i sense foto i compatibilitat HEIC/HEIF. El reinici ha de demostrar persistència real a PostgreSQL i filesystem, no només estat en memòria o cache del frontend. Els Items personals es creen des de Nestly, no amb INSERT manuals.

### 4.6. Tests dins de M1

S’aplica A11: provar cada regla principalment al nivell més baix que aporti confiança. Es cobreixen les validacions rellevants, la creació a casa amb les seves invariants, la persistència real i el pipeline de fotografies. La frontera HTTP i la UI tenen proves proporcionals del contracte i del comportament observable: errors, conservació de dades, previsualització, navegació i feedback segons UI/UX.

La verificació del recorregut complet i del reinici forma part de l’acceptació. L’automatització E2E amb Playwright s’incorpora quan el flux i el risc la justifiquin; no substitueix les proves més petites ni obliga a repetir totes les combinacions a cada nivell. Les proves automatitzades utilitzen dades i entorn de test, mai dades personals de development.

### 4.7. Fora de M1

Queden per increments posteriors: Items en Llistes, adquisició i economia, edició i eliminació d’Items, canvi de l’estat de preparació, cerca, filtres avançats, gestió de Llistes i Botigues, Recomanacions i cobertura, i Dashboard funcional complet. Continuen sent part de V1 segons les fonts de veritat.

## 5. Separació de dades

| Tipus | Origen i ús |
| --- | --- |
| Dades base de Nestly | Categories/Subcategories predefinides aprovades, disponibles de manera reproduïble. No són dades personals ni fixtures. |
| Dades de development | Items reals introduïts per l’Usuari mitjançant Nestly a `nestly_dev`. |
| Dades de test | Dades controlades creades per les proves a `nestly_test`, eliminables i reinicialitzables sense afectar `nestly_dev` ni els fitxers personals. |

El mecanisme concret de fixtures, neteja i aïllament dels fitxers de test es concretarà quan les proves ho necessitin, respectant aquesta separació.

## 6. Roadmap posterior orientatiu

Després de M1 es revisarà l’ordre concret a partir del que s’hagi après. Les agrupacions següents no són un backlog exhaustiu ni una seqüència rígida de tasques; cada grup es pot dividir en slices més petits.

| Agrupació | Abast existent i dependències |
| --- | --- |
| Completar la gestió d’Items a casa | Edició, substitució/eliminació de foto, eliminació individual, canvi de preparació posterior al registre i consulta amb cerca/filtres avançats. Parteix del recorregut de M1, que ja inclou filtres de Categoria/Subcategoria. |
| Botigues i Llistes | Gestió definida als casos d’ús; crear una Llista requereix una Botiga. Respectar les regles d’eliminació, sense ampliar operacions. |
| Items en Llistes i adquisició | Requereix Botigues/Llistes utilitzables. Incorpora creació amb context, flux niat, imports, comanda, recollida/correcció, conservació de la Llista d’origen i resum econòmic; es divideix en increments verificables. |
| Recomanacions i cobertura | Utilitza classificació i Items existents, amb les regles de quantitat i cobertura ja definides. No requereix completar adquisició per començar a aportar valor. |
| Dashboard funcional i integració V1 | Completar el Dashboard amb dades reals quan els recorreguts que resumeix funcionin, i verificar el conjunt dels fluxos pendents de V1. No és una fase on s’ajornen tots els tests. |

La correcció d’un Item `recollit` consisteix a seleccionar explícitament un estat previ vàlid i actualitzar l’estat actual i les dades associades segons les regles documentades. No es conserva ni s’infereix l’estat anterior, ni es crea historial d’estats de comanda o auditoria de canvis. Conservar la Llista d’origen no implica un registre històric.

En incorporar economia es manté el flux d’A12: NUMERIC(7,2) a PostgreSQL, conversió exacta a Infrastructure, cèntims enters a Domain/Application, HTTP/API i frontend, i euros només a la presentació. La previsualització local no substitueix l’autoritat del backend. La disponibilitat de l’esquema des de M0 no avança aquesta funcionalitat a M1.

## 7. Criteri general de completitud

Un increment no està complet només perquè el codi existeixi. Quan sigui aplicable, ha d’estar:

- implementat segons requisits, domini, UI/UX i arquitectura;
- integrat amb totes les capes necessàries per al seu recorregut real;
- validat amb tests proporcionals dins del mateix increment, segons A11;
- executable localment i verificat pel comportament observable esperat;
- documentat quan introdueixi una decisió d’implementació rellevant.

No s’exigeixen tots els nivells de testing en cada increment ni un percentatge de coverage. Si falta una part necessària del recorregut d’acceptació, el milestone continua obert. En particular, M1 no es tanca sense fotografia i persistència comprovada després del reinici.

## 8. Punts a concretar i revisió humana

Les decisions aprovades D1–D11 amplien el registre i consulta de M1 i substitueixen la preparació inicial obligatòria només per al registre directe a casa, segons RF-06. No canvien la preparació inicial dels Items recollits de Llista. Les limitacions temporals conserven la selecció de situació i la cerca previstes per a la V1 completa.

Queden deliberadament per a la implementació:

- **Resolts a M0:** arrencada/aturada local, configuració essencial i organització mínima, sense alterar A05/A12.
- **Quan les proves ho requereixin:** fixtures, reset, lifecycle, aïllament de fitxers i configuració de les eines de testing adoptades.
- **Durant M1:** detall dels contractes necessaris, composició del formulari i consultes, implementació del pipeline i ajust configurable de qualitat/compressió amb fotografies reals, sense fixar abstraccions o versions en aquest pla.
- **Després de M1:** ordre i dimensió dels slices següents, mantenint les dependències funcionals i tot l’abast V1.

El pla continua sotmès a revisió humana per als increments pendents. M0 està completada i versionada; la implementació de M1 encara no s’ha iniciat. D1–D11 estan aprovades i aquesta actualització documental queda pendent de revisió abans de commit o implementació. No s’han fet commit ni push d’aquests canvis.
