# Pla d’implementació incremental — Nestly V1

## 1. Objectiu, estat i fonts

Aquest pla proposa l’ordre d’implementació de Nestly V1 mitjançant increments petits i verificables. **Està pendent de revisió i aprovació humana; no autoritza iniciar M0.** No modifica decisions funcionals, de domini, UI/UX o arquitectura.

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

El frontend mínim incorpora React, TypeScript, React Router i TanStack Query. React Hook Form s’incorpora quan existeixi el primer formulari real que el necessiti, no per preparar formularis futurs a M0.

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

S’utilitza node-pg-migrate, amb el mateix historial versionat per a development i test i preferència per SQL explícit, sense ORM. El mecanisme concret es decideix durant M0. L’esquema pot evolucionar mitjançant noves migracions si apareix una necessitat real; la primera migració no es considera immutable per principi. Qualsevol necessitat de reconsiderar una decisió tancada s’ha de revisar abans de canviar-la.

### 3.4. Categories i Subcategories predefinides

Una instal·lació nova ha de disposar de les dades base necessàries de manera reproduïble, sense INSERT manuals. Categories i Subcategories no són dades personals ni fixtures de test, i no tenen gestió per l’Usuari en V1.

Durant M0 s’analitzarà i decidirà el mecanisme proporcional per proporcionar-les: migració, seed o alternativa justificada. Aquest pla no el fixa.

El catàleg inicial complet ja està aprovat i es defineix al [model de domini, §4.2](./model-domini-v1.md#catàleg-inicial-predefinit-de-v1), inclosa la Categoria i Subcategoria **Pendent de classificar**. M0 ha de proporcionar aquest catàleg sense ampliar-lo ni reorganitzar-lo. Només queda pendent decidir el mecanisme tècnic reproduïble de càrrega.

### 3.5. Configuració i execució local

Es prepara el mínim necessari per utilitzar environment variables, `.env` local no versionat, `.env.example` sense secrets, configuracions separades development/test i validació de configuració essencial en arrencar. No es tria preventivament una llibreria de validació.

M0 ha de deixar un mecanisme senzill d’arrencada que eviti iniciar manualment cada component per separat. El mecanisme concret d’arrencada/aturada es decideix durant M0. No s’introdueixen Electron, serveis de sistema, infraestructura cloud ni containerització del backend.

### 3.6. Verificació i criteris de sortida

- El recorregut del shell funciona sense simular funcionalitats de negoci.
- L’arrencada local és reproduïble amb la configuració documentada i sense secrets versionats.
- El mateix historial de migracions crea l’esquema V1 als dos entorns; es comproven les restriccions rellevants amb PostgreSQL real de test segons A11.
- Les dades base aprovades es poden obtenir en una instal·lació nova sense intervenció SQL manual.
- Reinicialitzar test no afecta les dades de development.

Només s’instal·len les eines de testing necessàries per aquestes verificacions. Vitest és el runner adoptat; Supertest s’incorpora quan hi hagi un contracte HTTP a provar, React Testing Library quan calgui verificar comportament de components i Playwright quan existeixi un flux E2E que ho justifiqui. No s’instal·len totes les eines per anticipació ni s’imposen tots els nivells a M0.

## 4. M1 — Registrar i consultar Items que ja són a casa

### 4.1. Resultat i abast funcional

M1 està complet quan l’Usuari pot registrar un Item real que ja té a casa, amb fotografia opcional, consultar-lo i comprovar que tant les dades com la fotografia persisteixen després de tancar i tornar a arrencar Nestly. Es basa en la part aplicable de CU-08 i CU-09, RF-01–RF-04 i les regles de creació i consulta de UI/UX.

M1 utilitza les Categories/Subcategories predefinides de M0. L’Item representa una unitat física, té nom validat segons RF-01a i exactament una Subcategoria; la Categoria s’obté a través d’aquesta relació. No es crea ITEM_LLISTA per a un Item incorporat directament a casa.

Es conserva la data de creació automàtica i l’ordenació del més recent al més antic. No es demana data d’entrada a casa i aquesta queda a NULL segons A07. L’Item comença com a **no preparada**, estat que es mostra en la consulta quan correspon; ajornar l’acció de marcar-lo com a preparat no elimina aquesta invariant inicial ni crea un tercer estat.

### 4.2. Limitació temporal del formulari

Només s’implementa el flux **A casa**. No s’ofereix **En una llista** ni cal demanar una selecció de situació mentre només n’hi hagi una d’implementada. És la limitació temporal explícita d’aquest increment, no una modificació de RF-01c, CU-08 o UI/UX.

Quan s’incorporin Items en Llistes, el formulari adoptarà la selecció explícita entre les dues situacions, sense valor preseleccionat, i la resta del comportament ja documentat. M1 no es presenta com la implementació completa de CU-08, CU-09 o de la feature Items.

### 4.3. Fotografia inclosa en M1

La fotografia és opcional per a cada Item però el suport de fotografia és obligatori per completar M1. Inclou selecció, previsualització abans de crear, processament real, persistència al filesystem i visualització al llistat i al detall. Sense fotografia s’utilitza el placeholder definit a UI/UX.

S’aplica A09 complet: màxim una fotografia, límit inicial configurable de 10 MB, validació per decodificació real, correcció d’orientació, preservació de proporcions, costat llarg màxim inicial de 1600 px sense ampliació i sortida WebP. No es conserva l’original.

Sharp és la llibreria general; libheif-js decodifica les entrades HEIC/HEIF que Sharp no pugui decodificar de manera fiable i el resultat continua pel pipeline de Sharp. Aquesta responsabilitat queda a Infrastructure, sense exposar llibreries o detalls de decoding a Domain, Application o frontend. PostgreSQL conserva la referència relativa, no el binari ni una ruta absoluta.

Sharp i libheif-js s’incorporen quan es construeixi aquest pipeline real. Es manté el criteri d’actualització de dependències, especialment per seguretat. Es comproven els errors i la coordinació entre filesystem i persistència segons A09, sense inventar una transacció ACID conjunta.

### 4.4. Construcció interna orientativa

| Pas | Resultat verificable |
| --- | --- |
| Classificació disponible | El formulari pot consultar les dades base reals i seleccionar la Subcategoria adequada. |
| Creació i consulta bàsica | Un Item a casa es crea des de la UI, es valida al backend, es persisteix i es consulta al detall i al llistat. |
| Fotografia | El mateix recorregut admet previsualització, processament, persistència i visualització de la foto. |
| Integració final | Errors, feedback, navegació i persistència després del reinici funcionen en el recorregut complet. |

Els passos es poden ajustar durant la implementació i inclouen les capes i proves necessàries per al seu recorregut. No són fases horitzontals per completar primer tot el backend o tot el frontend. Es pot obtenir primer un flux sense foto, però encara no és M1 complet.

React Hook Form s’incorpora amb el formulari real. No es fixen aquí endpoints exhaustius, noms de classes, hooks, components, ports o abstraccions.

### 4.5. Flux d’acceptació de M1

1. Arrencar Nestly i entrar per la Landing.
2. Arribar al Dashboard i navegar a Items.
3. Consultar el llistat actual, amb estat buit quan no hi ha Items.
4. Prémer l’acció d’afegir Item i introduir el nom i la classificació predefinida corresponent, per registrar-lo a casa.
5. Adjuntar opcionalment una fotografia i veure’n la previsualització abans de crear.
6. Crear l’Item: el backend valida i persisteix les dades i, quan hi ha fotografia, executa el pipeline d’A09 i en conserva el fitxer i la referència.
7. Després de la creació correcta, navegar al detall del nou Item i mostrar el feedback d’èxit definit a UI/UX.
8. Tornar al llistat i veure el nou Item amb la fotografia, si n’hi ha.
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
| Completar la gestió d’Items a casa | Edició, substitució/eliminació de foto, eliminació individual, canvi de preparació i consulta amb cerca/filtres. Parteix del recorregut de M1. |
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

No s’ha identificat una contradicció que exigeixi modificar les fonts de veritat. Les limitacions de M1 són temporals i explícites: no substitueixen la selecció de situació de la V1 completa ni la preparació inicial obligatòria.

Queden deliberadament per a la implementació:

- **Abans de carregar dades base a M0:** analitzar i decidir el mecanisme tècnic reproduïble per proporcionar el catàleg de Categories/Subcategories ja aprovat al model de domini.
- **Durant M0:** mecanisme concret de migracions, arrencada/aturada, configuració essencial i detall mínim d’organització, sense alterar A05/A12.
- **Quan les proves ho requereixin:** fixtures, reset, lifecycle, aïllament de fitxers i configuració de les eines de testing adoptades.
- **Durant M1:** detall dels contractes necessaris, composició del formulari i consultes, implementació del pipeline i ajust configurable de qualitat/compressió amb fotografies reals, sense fixar abstraccions o versions en aquest pla.
- **Després de M1:** ordre i dimensió dels slices següents, mantenint les dependències funcionals i tot l’abast V1.

El pla queda sotmès a revisió humana. No s’inicia M0 fins que la persona usuària l’hagi revisat i aprovat.
