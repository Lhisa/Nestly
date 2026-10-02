# Arquitectura — V1

## 1. Objectiu i abast

Aquest document recull les decisions arquitectòniques validades A01–A08 de Nestly V1: estructura general, tecnologies, responsabilitats, criteris d’API, model físic PostgreSQL, validació, gestió d’errors, transaccions i seguretat. No és una implementació ni un esquema SQL executable.

La font de veritat funcional continua sent [Requisits](./requisits-v1.md), [Model de domini](./model-domini-v1.md), [Casos d’ús](./casos-us-v1.md) i [Disseny UI/UX](./disseny-ui-ux-v1.md). L’arquitectura concreta com donar suport a aquestes regles, sense substituir-les ni introduir funcionalitats.

Les decisions d’A09–A12 queden fora d’aquest document, excepte per identificar-les com a pendents a §10.

## 2. A01 — Arquitectura general

Nestly és una aplicació web client-servidor amb aquest flux general:

```text
Browser → Frontend → HTTP → Backend/API → PostgreSQL
```

El backend és l’autoritat sobre les regles de negoci i la persistència. El frontend s’encarrega de la presentació, la interacció i la validació UX; aquesta validació no substitueix la del backend.

Es prioritza una solució simple per a una aplicació personal. No s’introdueixen microserveis, Kafka, Redis, CQRS, arquitectura orientada a esdeveniments ni infraestructura similar sense una necessitat real.

## 3. A02 — Llenguatge i frontend

El frontend utilitza **React i TypeScript**. El backend també utilitza **TypeScript**. Compartir el llenguatge redueix la complexitat tecnològica de la V1 i facilita l’aprenentatge i el manteniment.

Aquesta decisió no fixa encara l’arquitectura detallada del frontend.

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

**Fotografies i uploads.** La seguretat i validació específica de fitxers es tractarà a A09; no es decideix en aquest bloc.

## 10. Decisions obertes fora d’A01–A08

A08 queda resolt al nivell arquitectònic descrit a §9. Queden per als blocs A09–A12, sense decidir-les aquí:

- representació TypeScript definitiva dels imports NUMERIC;
- emmagatzematge de fotografies, conversió HEIC/HEIF i seguretat i validació específica dels uploads (A09);
- arquitectura detallada del frontend;
- estratègia de testing;
- estructura definitiva de carpetes;
- configuració i deployment.

La tria de llibreries de validació i logging i la implementació concreta del mecanisme transaccional no queden fixades per A08.

## 11. Observacions de coherència documental

- `AGENTS.md` encara indica que el focus és UI/UX i que Arquitectura no s’ha iniciat. Aquest document recull l’encàrrec explícit posterior de documentar A01–A08 ja validats; no modifica aquell estat general ni inicia implementació.
- UI/UX §9 encara deixa pendent la representació tècnica de `data_creacio`. A07 la concreta com a TIMESTAMPTZ en aquest document; la presentació UX no canvia.
- El resum A07 utilitza 1:N per a Subcategoria–Item i Llista–ITEM_LLISTA, mentre que el domini explicita 1:0..N. A §8.2 es conserva expressament l’opcionalitat funcional, sense imposar un mínim d’un Item.
- La cadena de responsabilitats d’A05 no implica que Domain depengui d’Infrastructure: aquesta lectura contradiria el límit explícit que impedeix al domini conèixer PostgreSQL o accedir a dades. §6 distingeix responsabilitats i dependències.

No s’han modificat les fonts funcionals ni s’han generat migracions, sentències de creació de taules o codi.
