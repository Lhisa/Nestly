# Arquitectura — V1

## 1. Objectiu i abast

Aquest document recull les decisions arquitectòniques validades A01–A10 de Nestly V1: estructura general, tecnologies, responsabilitats, criteris d’API, model físic PostgreSQL, validació, gestió d’errors, transaccions, seguretat, gestió de fotografies dels Items i arquitectura frontend. No és una implementació ni un esquema SQL executable.

La font de veritat funcional continua sent [Requisits](./requisits-v1.md), [Model de domini](./model-domini-v1.md), [Casos d’ús](./casos-us-v1.md) i [Disseny UI/UX](./disseny-ui-ux-v1.md). L’arquitectura concreta com donar suport a aquestes regles, sense substituir-les ni introduir funcionalitats.

Les decisions d’A11–A12 i els detalls tècnics encara oberts s’identifiquen com a pendents a §12.

## 2. A01 — Arquitectura general

Nestly és una aplicació web client-servidor amb aquest flux general:

```text
Browser → Frontend → HTTP → Backend/API → PostgreSQL
```

El backend és l’autoritat sobre les regles de negoci i la persistència. El frontend s’encarrega de la presentació, la interacció i la validació UX; aquesta validació no substitueix la del backend.

Es prioritza una solució simple per a una aplicació personal. No s’introdueixen microserveis, Kafka, Redis, CQRS, arquitectura orientada a esdeveniments ni infraestructura similar sense una necessitat real.

## 3. A02 — Llenguatge i frontend

El frontend utilitza **React i TypeScript**. El backend també utilitza **TypeScript**. Compartir el llenguatge redueix la complexitat tecnològica de la V1 i facilita l’aprenentatge i el manteniment.

Aquesta decisió de llenguatge i tecnologia es concreta per al frontend a A10 (§11).

## 4. A03 — Backend

El backend utilitza **Node.js, Express i TypeScript**. Express permet mantenir explícits el routing, els middleware, els controllers, els serveis d’aplicació o casos d’ús, la validació, la gestió d’errors i la persistència.

No s’afegeixen frameworks ni abstraccions sense una necessitat concreta.

## 5. A04 — Persistència

La base de dades és **PostgreSQL**, amb accés mitjançant **SQL explícit**. No s’utilitza un ORM d’alt nivell com a abstracció principal. El driver previst és `pg`, sense implementar-lo ni tancar-ne ara els detalls.

El SQL queda separat dels controllers i de la lògica de negoci. No es creen abstraccions genèriques com `BaseRepository`.

## 6. A05 — Separació de responsabilitats

L’arquitectura és pragmàtica i s’inspira selectivament en Clean Architecture. Les responsabilitats es distribueixen entre Controller/HTTP, Application, Domain i Infrastructure:

| Àmbit | Responsabilitat | Límits |
| --- | --- | --- |
| Controller / HTTP | Rep la request, la tradueix cap a l’aplicació i retorna la response. | No conté regles de negoci. |
| Application | Coordina els casos d’ús, Domain i la persistència; defineix els límits de les operacions i transaccions quan cal. | La construcció i injecció de dependències es fa fora d’Application. |
| Domain | Conté les regles i decisions de negoci. | No coneix HTTP ni PostgreSQL i no accedeix directament a dades. |
| Infrastructure | Implementa persistència i integracions tècniques; conté SQL i detalls PostgreSQL i adapta les dades entre PostgreSQL i l’aplicació/domini. | No substitueix les decisions de negoci de Domain. |

**Controller comunica. Application coordina. Domain decideix. Infrastructure persisteix.**

La seqüència conceptual `Controller / HTTP → Application → Domain → Infrastructure` descriu els àmbits de responsabilitat, no una dependència directa de Domain cap a Infrastructure. Application coordina les decisions del domini i l’accés a persistència.

S’aplica Dependency Inversion només quan aporta valor real: per a l’accés a dades, Application pot dependre d’un contracte o port i Infrastructure proporcionar-ne la implementació PostgreSQL. No es creen interfícies per tot ni s’apliquen patrons mecànicament. La construcció i injecció de dependències correspon al **Composition Root**, fora d’Application, sense definir encara una estructura de carpetes.

## 7. A06 — API

L’API és REST pragmàtica, mínima i explícita. L’intercanvi utilitza **HTTP i JSON**, amb prefix **`/api`**.

Els recursos principals previstos són:

| Recurs | Ruta amb prefix |
| --- | --- |
| Items | `/api/items` |
| Llistes | `/api/lists` |
| Botigues | `/api/stores` |
| Recomanacions | `/api/recommendations` |
| Categories | `/api/categories` |
| Subcategories | `/api/subcategories` |

Aquest inventari no defineix encara un catàleg complet d’endpoints o operacions. Categories i Subcategories continuen sent dades predefinides de consulta i selecció, sense gestió per l’Usuari en V1.

S’utilitza CRUD quan representa naturalment l’operació. Només es defineixen endpoints específics de domini quan l’operació té semàntica pròpia i no encaixa bé en CRUD. ITEM_LLISTA pot continuar sent un detall del model i de la persistència; no necessita necessàriament un recurs REST independent.

El backend no confia en el client i només accepta i modifica els camps permesos. La V1 no té autenticació ni autorització perquè és una aplicació personal d’un únic Usuari; no introdueix comptes ni una entitat USUARI. Un UUID tampoc no substituiria autenticació o autorització.

Els codis HTTP d’error i el contracte de resposta es defineixen a A08 (§9.2).

## 8. A07 — Model físic PostgreSQL

### 8.1. Taules i identificadors

El model físic té set taules: `categoria`, `subcategoria`, `item`, `recomanacio`, `botiga`, `llista_nado` i `item_llista`.

Les claus primàries utilitzen enters generats per PostgreSQL mitjançant **IDENTITY**. Els IDs no tenen significat de negoci, poden tenir salts, no es reutilitzen i no s’utilitzen com a recompte. No es calcula mai un nou ID amb `MAX(id)`.

No s’utilitzen UUID en V1 perquè no hi ha una necessitat actual que en justifiqui la complexitat.

### 8.2. Relacions i restriccions estructurals

Es mantenen les cardinalitats del domini, inclosa la possibilitat que una Subcategoria no tingui Items i que una Llista sigui buida:

| Origen | Destinació | Cardinalitat |
| --- | --- | --- |
| `categoria` | `subcategoria` | 1:N |
| `subcategoria` | `item` | 1:0..N |
| `subcategoria` | `recomanacio` | 1:0..1 |
| `botiga` | `llista_nado` | 1:0..1 en V1 |
| `llista_nado` | `item_llista` | 1:0..N |
| `item` | `item_llista` | 1:0..1 |

La notació resumida 1:N d’A07 per a Subcategoria–Item i Llista–ITEM_LLISTA no introdueix un mínim d’un registre dependent: s’aplica el mínim zero ja establert pel model funcional.

| Columna | Restriccions estructurals |
| --- | --- |
| `subcategoria.categoria_id` | `NOT NULL`, FK a `categoria`. |
| `item.subcategoria_id` | `NOT NULL`, FK a `subcategoria`. |
| `recomanacio.subcategoria_id` | `NOT NULL`, `UNIQUE`, FK a `subcategoria`. |
| `llista_nado.botiga_id` | `NOT NULL`, `UNIQUE` en V1, FK a `botiga`. |
| `item_llista.item_id` | `NOT NULL`, `UNIQUE`, FK a `item`. |
| `item_llista.llista_id` | `NOT NULL`, FK a `llista_nado`. |

No es duplica `categoria_id` a `item`: la Categoria s’obté mitjançant `ITEM → SUBCATEGORIA → CATEGORIA`. Tampoc no es duplica `llista_id` a `item`: el context de Llista pertany a ITEM_LLISTA.

### 8.3. Estats persistents

Els estats persistents es representen amb **VARCHAR + CHECK**, en lloc de PostgreSQL ENUM. Això manté l’esquema explícit, facilita l’evolució i les migracions i evita acoblament innecessari als ENUM de PostgreSQL.

| Camp | Valors persistents |
| --- | --- |
| `item_llista.estat_comanda` | `demanat`, `encarregat`, `a_punt_per_recollir`, `recollit`. |
| `item.estat_preparacio` | `no_preparada`, `preparada`, quan és aplicable; `NULL` quan no ho és. |

Els valors amb guions baixos representen els estats conceptuals ja definits, sense afegir-ne cap. `estat_preparacio = NULL` significa que la preparació no és aplicable perquè l’Item encara no és físicament a casa; no és un tercer estat de domini.

`estat_economic` no es persisteix: continua sent derivat.

### 8.4. Imports i informació derivada

Els tres imports d’`item_llista` utilitzen **NUMERIC(7,2)**:

- `preu_total`;
- `quantitat_regalada`;
- `quantitat_pagada`.

Domain valida les invariants funcionals i PostgreSQL les reforça amb CHECK:

- `preu_total > 0`;
- `quantitat_regalada >= 0`;
- `quantitat_pagada >= 0`;
- `quantitat_regalada + quantitat_pagada <= preu_total`.

La quantitat regalada continua sent la part assumida per tercers; la pagada és només la part pròpia ja pagada. No s’ajusten automàticament els imports ni es modifica automàticament la comanda en registrar-los.

No es persisteixen `quantitat_pendent`, `quantitat_assumida`, `estat_economic` ni els totals econòmics agregats de LLISTA_NADO. Es calculen segons els requisits, igual que la resta d’informació derivada del domini. La representació TypeScript definitiva de NUMERIC queda pendent.

### 8.5. Dates

| Camp | Representació física | Generació i significat |
| --- | --- | --- |
| `item.data_creacio` | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | La genera PostgreSQL i no és editable per l’Usuari. |
| `item_llista.data_recollida` | `TIMESTAMPTZ NULL` | Instant de recollida, quan correspon. |
| `item.data_entrada_casa` | `TIMESTAMPTZ NULL` | Mateix instant que la recollida per als Items recollits de Llista. |

La precisió de persistència és independent de la presentació de les dates a la UI.

En recollir un Item de Llista, Application obté **un únic instant** i utilitza aquest mateix valor per a `data_recollida` i `data_entrada_casa`. Les modificacions es fan dins de la mateixa transacció; no es generen independentment dos timestamps ni es demanen manualment a l’Usuari.

| Situació de l’Item | `data_entrada_casa` |
| --- | --- |
| Incorporat directament a casa | `NULL`. |
| Pendent de recollir en una Llista | `NULL`. |
| Recollit des d’una Llista | Igual a `data_recollida`. |

Per tant, `data_entrada_casa = NULL` no determina per si sola si l’Item és a casa.

### 8.6. Invariants d’estat i data

A `item_llista`, un CHECK reforça l’equivalència: `estat_comanda = 'recollit'` **si i només si** `data_recollida IS NOT NULL`.

Les invariants entre diverses taules no es resolen amb CHECK. Quan l’Item està recollit, `item.data_entrada_casa = item_llista.data_recollida` és una invariant de Domain/Application protegida mitjançant una transacció.

Application/Domain també coordina la preparació: en recollir, l’Item és físicament a casa i comença com a `no_preparada`. En corregir una recollida errònia segons RF-28 i CU-18, les dues dates queden a `NULL` i la preparació deixa de ser aplicable, també amb `NULL`; es conserven el mateix Item i el context de Llista. Una nova recollida registra un nou instant compartit i reinicia la preparació a `no_preparada`. Crear inicialment com a recollit aplica les mateixes invariants segons CU-08.

| Responsabilitat | Protecció |
| --- | --- |
| Domain | Decideix la validesa de negoci. |
| CHECK i restriccions PostgreSQL | Protegeixen invariants persistents simples i locals. |
| Application i transacció | Coordinen operacions i invariants entre diversos registres o taules. |

Aquí es defineix la necessitat de transacció, no el mecanisme per implementar-la.

### 8.7. Integritat referencial i eliminacions

Les accions següents s’apliquen quan s’elimina el registre pare:

| Pare | Dependent | Acció |
| --- | --- | --- |
| `categoria` | `subcategoria` | `ON DELETE RESTRICT` |
| `subcategoria` | `recomanacio` | `ON DELETE CASCADE` |
| `subcategoria` | `item` | `ON DELETE RESTRICT` |
| `item` | `item_llista` | `ON DELETE CASCADE` |
| `botiga` | `llista_nado` | `ON DELETE RESTRICT` |
| `llista_nado` | `item_llista` | `ON DELETE RESTRICT` |

CASCADE s’utilitza quan el dependent deixa necessàriament de tenir sentit sense el pare i no se salta una regla de negoci. RESTRICT protegeix davant d’una eliminació directa que podria trencar una invariant o evitar una comprovació de negoci. Aquestes restriccions no afegeixen operacions de gestió de Categories o Subcategories a la V1.

Eliminar ITEM pot eliminar automàticament el seu ITEM_LLISTA, però no elimina LLISTA_NADO. Eliminar BOTIGA queda bloquejat mentre tingui una Llista. Eliminar LLISTA_NADO directament queda bloquejat mentre tingui ITEM_LLISTA.

L’eliminació d’una Llista és una operació de negoci regida per RF-21a i CU-07: només és permesa si està buida o si tots els Items estan `demanat`, amb `quantitat_pagada = 0` i `quantitat_regalada = 0`. El preu informat no la bloqueja. Qualsevol Item que no compleixi la condició bloqueja tota l’operació.

Application/Domain comprova aquestes condicions. Quan l’eliminació és vàlida i confirmada, Application executa dins d’una única transacció l’eliminació dels Items i ITEM_LLISTA associats i, finalment, de la Llista, conservant la Botiga i sense eliminacions parcials. No s’utilitza CASCADE des de LLISTA_NADO per evitar aquestes comprovacions. Es conserva la regla independent d’eliminació individual d’Item de CU-11.

### 8.8. Referència de fotografia

ITEM conserva una referència nullable a la fotografia, opcional i amb un màxim d’una per Item. No s’afegeix una taula FOTO. PostgreSQL no guarda el binari ni una ruta física absoluta: la referència és relativa i controlada, segons A09 (§10).

## 9. A08 — Validació, gestió d’errors, transaccions i seguretat

### 9.1. Validació per capes

La validació es distribueix segons responsabilitats diferenciades. El backend no assumeix que una request provingui del frontend oficial.

| Àmbit | Responsabilitat de validació |
| --- | --- |
| Frontend | Validació UX i feedback ràpid a l’Usuari; no és una font autoritativa. |
| Frontera HTTP | Estructura de la request, tipus i formats bàsics d’entrada, com comprovar que `nom` és string o que un identificador té el tipus i format esperats. |
| Application | Coordina el cas d’ús, obté les dades necessàries i coordina comprovacions dependents de persistència, com l’existència d’una Subcategoria referenciada. Utilitza els contractes o ports de persistència, sense accedir directament a PostgreSQL. |
| Domain | Decideix les regles de negoci, com la validesa semàntica del nom d’un Item o les condicions per eliminar una Llista. No coneix HTTP ni PostgreSQL. |
| PostgreSQL | Última barrera d’integritat persistent mitjançant NOT NULL, FK, UNIQUE i CHECK segons A07. Les restriccions no substitueixen la validació de Domain/Application. |

No es tria una llibreria de validació ni es defineixen middleware o altres detalls d’implementació.

### 9.2. Errors i contracte HTTP

La V1 adopta inicialment aquests codis d’error:

| Codi HTTP | Ús |
| --- | --- |
| **400 Bad Request** | Dades d’entrada invàlides: tant errors estructurals detectats a la frontera HTTP com dades que violen una regla de validació de negoci. |
| **404 Not Found** | Un recurs necessari no existeix; per exemple, una Subcategoria referenciada. |
| **409 Conflict** | La request és vàlida i el recurs existeix, però l’operació entra en conflicte amb l’estat actual o una regla dependent d’aquest estat; per exemple, eliminar una Llista que no compleix les condicions d’eliminació. |
| **500 Internal Server Error** | Error inesperat del servidor o de la infraestructura. |

No s’introdueix 422 en V1 perquè distingir-lo de 400 no aporta prou valor per a les necessitats actuals.

Les respostes d’error de l’API són estructurades, amb aquest format conceptual:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Hi ha camps invàlids",
  "fieldErrors": {
    "nom": "El nom no pot estar buit"
  }
}
```

- `code` és un identificador estable perquè el frontend distingeixi el tipus d’error sense dependre del text.
- `message` és una explicació general adequada per al client.
- `fieldErrors` és opcional i associa errors als camps del formulari. Els errors que no corresponen a camps no el necessiten.

El contracte permet mostrar errors inline i dirigir l’Usuari al primer camp invàlid, segons UI/UX §4.2, mantenint les dades introduïdes.

Els errors interns inesperats retornen una resposta genèrica controlada amb HTTP 500. No exposen SQL, stack traces, detalls interns de PostgreSQL, credencials ni informació sensible al frontend. L’error tècnic original es conserva als logs del servidor per al diagnòstic, evitant registrar repetidament el mateix error a totes les capes. No es tria encara una llibreria de logging.

### 9.3. Transaccions

**Application decideix què constitueix una operació atòmica. Infrastructure implementa com s’executa la transacció amb PostgreSQL/`pg`.**

Application delimita l’operació mitjançant una abstracció mínima, sense conèixer `pgClient`, les sentències SQL `BEGIN`, `COMMIT` o `ROLLBACK`, ni altres detalls específics de PostgreSQL. No s’introdueixen una infraestructura complexa de Unit of Work, factories o patrons innecessaris; no es fixen noms de classes, interfícies o fitxers.

Infrastructure garanteix que totes les operacions d’una mateixa transacció utilitzen la mateixa connexió/client de `pg`. El comportament és iniciar la transacció, executar les operacions relacionades i fer COMMIT si totes tenen èxit, o ROLLBACK davant qualsevol fallada.

| Operació atòmica | Abast |
| --- | --- |
| Crear un Item associat a una Llista | Crear ITEM i ITEM_LLISTA conjuntament, sense persistència parcial si falla alguna part. Si es crea inicialment com a recollit, s’apliquen les invariants ja definides a A07 i CU-08. |
| Marcar un Item com a `recollit` | Actualitzar ITEM_LLISTA i ITEM amb un únic instant compartit per `data_recollida` i `data_entrada_casa`, i preparació inicial `no_preparada`, segons A07. |
| Corregir `recollit` cap a un estat previ | Coordinar ITEM_LLISTA i ITEM: les dues dates queden a `NULL` i la preparació deixa de ser aplicable, també amb `NULL`, segons RF-28, CU-18 i A07. |
| Eliminar una Llista | Comprovar la regla de negoci de RF-21a i CU-07 i, si es permet i es confirma, eliminar els Items, ITEM_LLISTA i la Llista com una única operació, sense eliminació parcial i conservant la Botiga. Es mantenen les restriccions referencials d’A07. |

Una operació simple formada per una única escriptura SQL ja és atòmica a nivell de sentència i no necessita una transacció global addicional.

El flux niat `Item → Llista → Botiga → retorn` no és una transacció global. Cada creació completada és independent: una Botiga o Llista creades es conserven encara que posteriorment es cancel·li la creació de l’Item, segons RF-33 i UI/UX §4.1. Això no introdueix drafts ni autosave.

Es documenta el mecanisme arquitectònic, sense implementar l’abstracció transaccional ni la persistència.

### 9.4. Seguretat

**SQL injection.** Totes les queries que incorporen dades externes utilitzen paràmetres. Amb `pg`, els valors es passen com a paràmetres (`$1`, `$2`, etc.), sense concatenar-los ni interpolar-los dins de l’SQL. La validació de negoci no és una defensa contra SQL injection; no es prohibeixen caràcters legítims del domini pel fet de tenir significat especial en SQL.

**Entrada explícita i mass assignment.** Cada operació defineix els camps que accepta. No es passa `req.body` indiscriminadament a Application/Domain. Les dates automàtiques i els estats controlats per operacions de negoci no es poden manipular simplement enviant aquests camps a l’API. El backend no confia en el frontend.

**Errors.** Es manté la separació de §9.2: informació adequada per al client i diagnòstic tècnic als logs del servidor, sense exposar informació interna.

**Autenticació i autorització.** La V1 continua sent personal i d’un únic Usuari, sense autenticació ni autorització. No es crea infraestructura preventiva d’auth per a requisits futurs hipotètics.

**Fotografies i uploads.** La seguretat i validació específica de fitxers es defineix a A09 (§10).

## 10. A09 — Gestió de fotografies dels Items

### 10.1. Emmagatzematge

Les fotografies s’emmagatzemen al **filesystem local** en la V1. PostgreSQL conserva únicament una referència relativa al fitxer, com `items/<identificador-intern>.<extensio>`, sense guardar-ne el binari ni una ruta física absoluta de la màquina.

La ubicació física arrel dels uploads és configuració d’Infrastructure, que assumeix l’emmagatzematge i la resolució de referències. Domain no coneix paths físics, filesystem ni detalls d’emmagatzematge.

Object storage o cloud són possibles evolucions futures, sense infraestructura preventiva en V1. Es manté una única fotografia opcional per Item, sense galeries, historial de fotos ni metadades fotogràfiques com a funcionalitat.

### 10.2. Identificació física dels fitxers

El backend genera un identificador intern únic per a cada fitxer. No s’utilitza el nom original proporcionat per l’Usuari com a nom persistent. Això evita col·lisions, dependència de noms externs, problemes de paths i exposició innecessària del nom original.

Aquest identificador de fitxer és independent dels IDs d’entitats de PostgreSQL, que continuen sent enters amb IDENTITY segons A07. No se’n fixa un mecanisme concret ni s’introdueixen factories o abstraccions complexes.

### 10.3. Validació de l’upload

El backend verifica que el contingut real es pot identificar i decodificar com una imatge d’un format admès. No confia únicament en l’extensió ni en el Content-Type/MIME declarat pel client. Si no és una imatge vàlida i processable, o el format no està admès, rebutja l’upload.

S’admeten formats habituals de fotografia mòbil, inclosos explícitament **HEIC/HEIF**, segons RF-01b. No s’amplia el suport a formats sense necessitat ni es tria encara una llibreria de processament.

Aquesta comprovació és part de la seguretat de l’upload. Es manté la separació d’A08: la validació funcional, per si sola, no és una defensa de seguretat.

### 10.4. Límit de mida

El límit inicial d’entrada és de **10 MB per fotografia**. És un límit tècnic configurable, no una regla del domini. Protegeix memòria, disc i CPU abans d’un processament potencialment costós.

Es podrà ajustar si les proves reals amb fotografies mòbils i HEIC mostren que és insuficient, sense modificar el model de domini.

### 10.5. Normalització

La fotografia pujada és una entrada del sistema; Nestly no ha de conservar un original fotogràfic. Després de validar-la, es processa, se’n corregeix l’orientació quan cal, es redimensiona, es comprimeix i es converteix a un format web homogeni.

Només es guarda la versió normalitzada i optimitzada. Un cop generada correctament, no cal conservar l’original enviat per l’Usuari.

Queden pendents la llibreria, el format final, la resolució i els paràmetres exactes de qualitat i compressió. Es decidiran durant la implementació o quan hi hagi criteris suficients; A09 tanca la política, no aquests paràmetres.

### 10.6. Accés des del frontend

En la V1 local i d’un únic Usuari, les fotografies normalitzades es poden servir com a recursos estàtics. El frontend obté una URL utilitzable per mostrar-les, però PostgreSQL continua guardant una referència relativa i controlada, no una URL absoluta.

No es crea un cas d’ús ni un endpoint de domini com `GET /api/items/:id/photo` només per servir cada fotografia: no hi ha autenticació ni autorització individual per fotografia que ho justifiqui. No s’introdueixen CDN, signed URLs, object storage ni infraestructura d’autorització futura.

### 10.7. Substitució de fotografia

La substitució prioritza conservar la fotografia anterior fins que la nova sigui vàlida. Application coordina aquest ordre:

1. Validar la nova fotografia.
2. Processar-la i normalitzar-la.
3. Guardar correctament el nou fitxer.
4. Actualitzar la referència persistent de l’Item.
5. Eliminar el fitxer anterior.

PostgreSQL i filesystem **no comparteixen una transacció ACID**. S’apliquen aquestes conseqüències:

| Fallada | Resultat i compensació |
| --- | --- |
| Validació, processament o guardat del nou fitxer | La fotografia anterior es manté intacta. |
| El nou fitxer s’ha guardat, però falla l’actualització de PostgreSQL | Es conserva la referència anterior i s’intenta eliminar el nou fitxer com a compensació. |
| PostgreSQL ja apunta al nou fitxer, però falla l’eliminació de l’antic | La substitució funcional és correcta; es registra la fallada de neteja i es tolera temporalment el fitxer orfe. |

No es dissenya una transacció distribuïda ni un sistema complex de jobs o garbage collection automàtic per a aquest cas.

### 10.8. Eliminació d’un Item amb fotografia

La dada funcional principal és l’Item. Primer es completa la seva eliminació funcional a PostgreSQL i després s’elimina físicament la fotografia. No s’elimina primer el fitxer si una fallada posterior de PostgreSQL podria deixar un Item existent sense fotografia.

Si PostgreSQL ha eliminat correctament l’Item però falla la neteja del filesystem, l’Item continua considerant-se eliminat. No es reverteix l’operació funcional: es registra la fallada i es tolera temporalment el fitxer orfe. No s’implementa preventivament un sistema automàtic de neteja d’orfes en V1.

### 10.9. Responsabilitats arquitectòniques

| Àmbit | Responsabilitat |
| --- | --- |
| Controller / HTTP | Rep l’upload i aplica les restriccions de la frontera HTTP. |
| Application | Coordina l’operació funcional quan fotografia i Item formen part del mateix cas d’ús, l’ordre de les operacions i les compensacions simples necessàries. |
| Domain | Manté les regles funcionals sense conèixer filesystem, paths físics, MIME, llibreries de processament ni mecanismes d’upload. |
| Infrastructure | Implementa l’emmagatzematge físic, resol referències relatives, processa i normalitza imatges i interactua amb el filesystem. |

Una abstracció petita pot mantenir Application independent del filesystem concret. No es creen jerarquies complexes de storage providers, factories o adapters sense necessitat. Les transaccions PostgreSQL d’A08 conserven el seu abast; les operacions de filesystem es coordinen amb les compensacions descrites, sense convertir-les en una transacció ACID conjunta.

## 11. A10 — Arquitectura frontend

### 11.1. Stack i dependències adoptades

Es mantenen **React i TypeScript** d’A02. S’adopten tres dependències per responsabilitats concretes:

| Dependència | Responsabilitat |
| --- | --- |
| React Router | Routing i navegació. |
| TanStack Query | Gestió del server state: cache, càrrega, errors, refetch i invalidació després de mutations. |
| React Hook Form | Estat i UX dels formularis. |

Responen a necessitats actuals de Nestly, no a un stack predefinit. No s’afegeixen Redux, Zustand, Zod ni altres llibreries sense una necessitat que les justifiqui.

### 11.2. Criteri transversal d’adopció de dependències

Una dependència externa només s’incorpora si resol una necessitat real, és proporcional a l’abast de Nestly, està activament mantinguda, disposa de documentació actual i suficient i és compatible amb l’stack. La complexitat que elimina ha de justificar la dependència i complexitat que introdueix.

La popularitat, per si sola, no és una justificació. S’evita tant reinventar infraestructura ben resolta per una dependència madura com instal·lar dependències per a problemes trivials.

### 11.3. Tipus d’estat

| Tipus | Contingut i ubicació |
| --- | --- |
| Server state | Items, Llistes, Botigues, Recomanacions, Categories i Subcategories procedents del backend. TanStack Query en gestiona la còpia/cache; el backend/PostgreSQL continua sent la font de veritat, no la cache del navegador. |
| Estat de navegació | Els criteris de la vista consultable d’Items —cerca, situació, Categoria, Subcategoria i Llista quan correspon— es representen a la URL amb query parameters. Permeten conservar la vista en anar al detall i tornar, i reconstruir-la després d’una recàrrega. |
| Estat temporal de UI | Estat visual o efímer, com un bottom sheet de filtres o un diàleg de confirmació obert/tancat. Es manté local als components sempre que sigui possible. |

L’estat viu tan a prop com sigui possible dels components que el necessiten, però prou amunt per compartir-lo quan cal. No s’introdueix estat global general sense una necessitat real.

### 11.4. Routing i consulta d’Items

React Router gestiona la navegació. Les rutes de recursos utilitzen l’ID persistent, no la posició dins d’una llista: `/items/27` identifica l’Item amb ID 27. Una URL com `/items?search=body&situation=home&category=...` il·lustra l’estat de consulta; no fixa exhaustivament les rutes ni els noms finals dels paràmetres.

La URL representa la consulta desitjada per l’Usuari. El backend filtra les dades, sense necessitat de carregar tots els Items per filtrar-los exclusivament al navegador:

```text
URL frontend → React/TanStack Query → GET /api/items?...criteris...
→ Backend → Infrastructure/PostgreSQL → resultats filtrats
```

El backend coordina la consulta segons A05; això no trasllada les regles de negoci al SQL. No s’introdueix paginació sense un requisit actual.

Es mantenen els criteris i la interacció de UI/UX §3.6 i §4.4: cerca mentre s’escriu i aplicació explícita dels filtres secundaris mòbils amb **Aplicar**. La selecció temporal del bottom sheet es diferencia de la consulta aplicada representada a la URL. Els valors inicials de UI/UX corresponen a una consulta sense criteris; no substitueixen els criteris recuperats d’una URL existent.

### 11.5. Formularis i validació

React Hook Form gestiona els camps condicionals, la validació en blur i completa en Crear/Desar, els errors per camp i el dirty state que permet confirmar abans de descartar canvis. Si el backend retorna `fieldErrors`, s’integren als camps corresponents, respectant els errors inline, la conservació de dades i el focus al primer camp invàlid de UI/UX §4.2.

La validació frontend serveix a la UX i no substitueix l’autoritat del backend definida a A08. React Hook Form no converteix el frontend en el responsable de les regles de negoci.

No s’adopta Zod: no s’ha identificat prou necessitat per afegir una altra representació o esquema de validació amb risc de duplicar regles entre frontend, backend, Domain i BD. Es podrà revisar si apareix una necessitat concreta.

### 11.6. Estat temporal del flux Item → Llista → Botiga

El flux `Crear Item → Crear Llista → Crear Botiga → Crear Llista → Crear Item` conserva els valors dels formularis pare i selecciona les entitats acabades de crear, segons RF-33 i UI/UX §4.1.

S’utilitza estat temporal compartit i acotat al flux de creació, mitjançant un Context/provider específic o mecanisme equivalent de React. Només existeix mentre el flux està actiu i s’elimina quan aquest finalitza o l’Usuari en descarta els canvis. No es crea un context global general de Nestly.

Aquest estat no és un draft persistent: no s’utilitzen PostgreSQL per a formularis incomplets, localStorage com a sistema de drafts ni autosave.

Es manté A08: Botiga, Llista i Item no formen una transacció global. Les entitats creades correctament continuen existint encara que després es cancel·li la creació de l’Item; eliminar l’estat temporal del flux no elimina aquestes entitats.

### 11.7. Organització per funcionalitats

El frontend s’organitza principalment per features, com `items`, `lists`, `stores` i `recommendations`. No replica automàticament les taules PostgreSQL, les capes del backend ni una estructura global per tipus tècnic.

Els components específics romanen a la seva feature encara que siguin visuals. Per exemple, `ItemCard`, `ItemForm` o `PriceSummary` poden pertànyer a Items si representen conceptes específics d’aquesta funcionalitat. ITEM_LLISTA no obliga a crear una feature `item-llista`: l’organització segueix les funcionalitats de l’Usuari, no l’esquema físic.

Els components realment genèrics i reutilitzats entre features, com `Button` o `ConfirmDialog`, poden situar-se en una zona compartida. No es creen preventivament `common`, `core`, `helpers`, `utils` o múltiples capes compartides. La reutilització s’ha de confirmar abans d’abstraure; no s’aplica Atomic Design ni una Clean Architecture completa al frontend sense justificació.

Aquests noms són exemples conceptuals, no una estructura física definitiva de carpetes.

### 11.8. Regles de negoci i dades derivades

El frontend no és un segon Domain. Les dades derivades amb significat de negoci es calculen al backend/Domain i es retornen per l’API. A partir de `preu_total`, `quantitat_regalada` i `quantitat_pagada`, el backend deriva `quantitat_pendent`, `quantitat_assumida` i `estat_economic`; React les presenta sense duplicar aquestes regles.

React pot calcular estat purament de presentació sense significat de negoci. La representació i el moment d’obtenció dels valors derivats durant l’edició del formulari econòmic no es concreten aquí; no s’inventa un endpoint ni un càlcul local per resoldre aquest detall pendent.

### 11.9. Absència d’un store global general

No s’adopten Redux, Zustand ni un store global equivalent: els requisits actuals no justifiquen una infraestructura transversal addicional. TanStack Query gestiona el server state, l’estat temporal de UI es manté local i el flux de creació té estat compartit específic i acotat. La decisió es podrà revisar si apareix una necessitat real.

## 12. Decisions obertes fora d’A01–A10

A01–A10 queden documentats al nivell arquitectònic descrit. Continuen pendents:

- A11 — estratègia de testing;
- A12 — estructura definitiva de carpetes, configuració i deployment;

- representació TypeScript definitiva dels imports NUMERIC;
- llibreria de processament d’imatges, format web final, resolució i qualitat/compressió exactes, segons §10.5.

La tria de llibreries de validació i logging i la implementació concreta del mecanisme transaccional no queden fixades per A08.

Queden per concretar les rutes exhaustives, les query keys, els hooks i components concrets i la configuració del frontend, sense generar codi, configuració de Vite o package.json en aquesta fase. També cal precisar el moment i mecanisme d’obtenció dels imports derivats al formulari econòmic (§11.8); si afecta la interacció visible, requerirà validació humana abans d’implementar-la.

## 13. Observacions de coherència documental

- `AGENTS.md` encara indica que el focus és UI/UX i que Arquitectura no s’ha iniciat. Aquest document recull l’encàrrec explícit posterior de documentar A01–A10 ja validats; no modifica aquell estat general ni inicia implementació.
- UI/UX §9 encara deixa pendent la representació tècnica de `data_creacio`. A07 la concreta com a TIMESTAMPTZ en aquest document; la presentació UX no canvia.
- El resum A07 utilitza 1:N per a Subcategoria–Item i Llista–ITEM_LLISTA, mentre que el domini explicita 1:0..N. A §8.2 es conserva expressament l’opcionalitat funcional, sense imposar un mínim d’un Item.
- La cadena de responsabilitats d’A05 no implica que Domain depengui d’Infrastructure: aquesta lectura contradiria el límit explícit que impedeix al domini conèixer PostgreSQL o accedir a dades. §6 distingeix responsabilitats i dependències.

No s’han modificat regles funcionals ni s’han generat migracions, sentències de creació de taules o codi. UI/UX referencia les decisions tècniques de fotografia resoltes a A09.
