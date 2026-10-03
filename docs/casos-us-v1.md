# Casos d’ús — V1

## 1. Objectiu

Aquest document formalitza els objectius que l’Usuari pot assolir amb la V1 de Nestly i la resposta esperada del sistema. Deriva els casos d’ús dels requisits i del model de domini, sense descriure pantalles, rutes de navegació ni decisions d’implementació.

## 2. Actors

### Usuari

Actor principal de la V1. Correspon a l’únic Usuari de la V1, que registra i consulta la informació necessària per preparar l’arribada d’un nadó.

Un possible usuari amb permisos de consulta és una evolució futura i no participa en els casos d’ús actuals.

## 3. Mapa de casos d’ús

| ID | Cas d’ús | Àrea | Objectiu resumit |
| --- | --- | --- | --- |
| CU-01 | Afegir botiga | Botigues | Registrar una botiga per a la seva llista de nadó. |
| CU-02 | Consultar botiga | Botigues | Consultar les dades d’una botiga. |
| CU-03 | Editar botiga | Botigues | Modificar les dades pròpies d’una botiga. |
| CU-04 | Eliminar botiga | Botigues | Eliminar una botiga sense llistes associades. |
| CU-05 | Crear llista de nadó | Llistes de nadó | Crear una llista associada a una botiga. |
| CU-06 | Consultar llista de nadó | Llistes de nadó | Consultar una llista, els seus Items i el resum econòmic derivat. |
| CU-07 | Eliminar llista de nadó | Llistes de nadó | Eliminar una Llista buida o només amb Items demanats sense imports pagats ni regalats. |
| CU-08 | Crear Item | Items | Registrar una unitat física, amb llista o directament a casa. |
| CU-09 | Consultar Item | Items | Consultar les dades i l’estat d’un Item. |
| CU-10 | Editar Item | Items | Modificar les dades pròpies d’un Item. |
| CU-11 | Eliminar Item | Items | Eliminar un Item que ja no es vol gestionar. |
| CU-12 | Marcar Item com a preparat | Items | Indicar que un Item a casa està preparat per utilitzar-se. |
| CU-13 | Crear recomanació | Recomanacions | Registrar una quantitat orientativa per a una Subcategoria. |
| CU-14 | Consultar recomanació | Recomanacions | Consultar una Recomanació i la seva Subcategoria. |
| CU-15 | Editar recomanació | Recomanacions | Modificar una Recomanació existent. |
| CU-16 | Eliminar recomanació | Recomanacions | Eliminar una Recomanació sense afectar els Items. |
| CU-17 | Consultar cobertura de recomanació | Recomanacions | Comparar la quantitat actual amb la recomanada. |
| CU-18 | Actualitzar estat de comanda | Comandes | Registrar la progressió d’adquisició d’un Item de llista. |
| CU-19 | Actualitzar situació econòmica d’un Item | Situació econòmica | Registrar la informació econòmica d’un Item de llista. |

## 4. Casos d’ús detallats

### 4.1. Botigues

### CU-01 — Afegir botiga

**Actor:** Usuari

**Objectiu:** Crear el registre d’una botiga perquè pugui utilitzar-se per gestionar una Llista de nadó associada.

**Precondicions:** Cap dins del sistema.

**Flux principal:**

1. L’Usuari inicia l’acció d’afegir una botiga.
2. El sistema sol·licita les dades de la botiga.
3. L’Usuari introdueix les dades disponibles de la botiga.
4. L’Usuari confirma la creació.
5. El sistema crea la Botiga.

**Regles de negoci relacionades:**

* A la V1, les dades de la Botiga es limiten a la informació definida en el model de domini. El nom és obligatori; a efectes de validació s’ignoren els espais inicials i finals, el resultat no pot quedar buit i té un màxim de 100 caràcters. Es permeten noms duplicats i no s’exigeix que contingui cap lletra. La URL és opcional i, si s’informa, ha de ser vàlida. Si les dades no són vàlides, no es completa la creació i s’aplica RF-32.
* En el context de la V1, només té sentit registrar una Botiga quan l’Usuari vol gestionar-ne una Llista de nadó; aquesta és una regla de context, no una precondició del sistema.

### CU-02 — Consultar botiga

**Actor:** Usuari

**Objectiu:** Consultar les dades d’una Botiga existent.

**Precondicions:** La Botiga existeix al sistema.

**Flux principal:**

1. L’Usuari sol·licita la consulta de Botigues.
2. El sistema mostra les Botigues disponibles.
3. L’Usuari selecciona una Botiga.
4. El sistema mostra les dades de la Botiga seleccionada.

**Regles de negoci relacionades:**

* La Llista de nadó associada no és una dada pròpia editable de la Botiga.

### CU-03 — Editar botiga

**Actor:** Usuari

**Objectiu:** Modificar les dades pròpies d’una Botiga existent.

**Precondicions:** La Botiga existeix al sistema.

**Flux principal:**

1. L’Usuari consulta una Botiga.
2. L’Usuari inicia la modificació de les seves dades.
3. L’Usuari modifica una o més dades pròpies de la Botiga.
4. L’Usuari desa els canvis.
5. El sistema actualitza la informació de la Botiga.

**Regles de negoci relacionades:**

* En editar es mantenen les validacions de nom i URL de RF-17; si no es compleixen, no es desen els canvis i s’aplica RF-32.
* La relació entre una Llista de nadó i la seva Botiga no es modifica lliurement en aquest cas d’ús.
* Una Llista de nadó sempre està associada a una Botiga.

### CU-04 — Eliminar botiga

**Actor:** Usuari

**Objectiu:** Eliminar una Botiga que ja no es vol gestionar.

**Precondicions:** La Botiga existeix al sistema.

**Flux principal:**

1. L’Usuari selecciona una Botiga.
2. L’Usuari sol·licita eliminar-la.
3. El sistema comprova les dependències de la Botiga.
4. Si no té cap Llista de nadó associada, el sistema demana confirmació de l’eliminació.
5. L’Usuari confirma i el sistema elimina la Botiga; si no confirma, no l’elimina.

**Fluxos alternatius / excepcions:**

* Si la Botiga té una Llista de nadó associada, el sistema no permet eliminar-la directament.

**Regles de negoci relacionades:**

* Una Llista de nadó no pot existir sense una Botiga associada.
* La V1 no incorpora un sistema d’arxivament de Botigues.

### 4.2. Llistes de nadó

### CU-05 — Crear llista de nadó

**Actor:** Usuari

**Objectiu:** Crear una Llista de nadó associada a una Botiga.

**Precondicions:** La Botiga ha d’existir abans de completar la creació de la Llista; es pot crear mitjançant CU-01 durant aquest procés.

**Flux principal:**

1. L’Usuari inicia la creació d’una Llista de nadó.
2. El sistema mostra les Botigues disponibles.
3. L’Usuari selecciona la Botiga.
4. L’Usuari introdueix les dades de la Llista.
5. L’Usuari confirma la creació.
6. El sistema crea la Llista associada a la Botiga.

**Fluxos alternatius / excepcions:**

* Si la Botiga ja té una Llista de nadó a la V1, el sistema no crea una segona Llista per a aquella Botiga.
* Si falta la Botiga, l’Usuari pot crear-la mitjançant CU-01 i reprendre la creació de la Llista amb les dades introduïdes conservades i la nova Botiga seleccionada. Si després cancel·la la Llista, la Botiga creada es conserva.

**Regles de negoci relacionades:**

* Una Llista sempre ha d’estar associada a una Botiga.
* En V1, una Botiga només pot tenir una Llista de nadó.
* Una Llista pot existir sense cap ITEM_LLISTA associat.
* El nom és obligatori; a efectes de validació s’ignoren els espais inicials i finals, el resultat no pot quedar buit i té un màxim de 100 caràcters. Es permeten noms duplicats i no s’exigeix que contingui cap lletra. La descripció és opcional. Si les dades no són vàlides, no es completa la creació i s’aplica RF-32.

### CU-06 — Consultar llista de nadó

**Actor:** Usuari

**Objectiu:** Consultar una Llista de nadó, la informació dels Items associats i el resum econòmic derivat.

**Precondicions:** La Llista existeix i està associada a una Botiga.

**Flux principal:**

1. L’Usuari sol·licita la consulta de Llistes de nadó.
2. L’Usuari selecciona una Llista.
3. El sistema mostra les dades de la Llista.
4. El sistema permet distingir els Items pendents de recollir dels recollits, ordenats dins de cada conjunt del més recentment creat al més antic, i consultar-ne el context d’adquisició mitjançant CU-09.
5. El sistema permet consultar el resum econòmic de la Llista segons RF-20a: pendent de pagar per nosaltres, total assumit per nosaltres, valor total dels productes i total regalat. El pendent és la dada principal; el total assumit és secundari rellevant i els altres dos totals són complementaris. La consulta no exigeix una acció específica de calcular.

**Fluxos alternatius / excepcions:**

* Si la Llista no té Items associats, el sistema mostra la Llista sense Items i els quatre totals econòmics són zero.

**Regles de negoci relacionades:**

* Una Llista pot existir sense Items associats.
* Els Items recollits continuen visibles dins de la Llista per conservar-ne el context de Llista.
* El resum inclou tots els ITEM_LLISTA actuals de la Llista, recollits i pendents de recollir: `pendent_total = Σ quantitat_pendent`, `total_assumit = Σ quantitat_assumida`, `valor_total_productes = Σ preu_total` i `total_regalat = Σ quantitat_regalada`. S’apliquen les fórmules per Item de RF-27; el total assumit inclou la part pròpia ja pagada i la pendent, i el valor total dels productes inclou també la part regalada.
* Els totals són derivats, no es persisteixen a LLISTA_NADO i no creen cap entitat de resum ni historial de pagaments.

### CU-07 — Eliminar llista de nadó

**Actor:** Usuari

**Objectiu:** Eliminar una Llista de nadó que ja no es vol utilitzar.

**Precondicions:** La Llista existeix.

**Flux principal:**

1. L’Usuari selecciona una Llista de nadó.
2. L’Usuari sol·licita eliminar-la.
3. Abans de permetre la confirmació, el sistema comprova que la Llista estigui buida o que tots els Items associats tinguin estat **demanat**, quantitat pagada zero i quantitat regalada zero.
4. Si es compleix la condició, el sistema explica que s’eliminaran la Llista, tots els ITEM_LLISTA associats i els Items associats, que la Botiga es conservarà, i demana confirmació.
5. Si l’Usuari confirma, el sistema executa aquesta eliminació com una única operació, sense eliminacions parcials; si no confirma, no elimina res.

**Fluxos alternatius / excepcions:**

* Si algun Item està **encarregat**, **a punt per recollir** o **recollit**, o té quantitat pagada o regalada major que zero, es rebutja tota l’operació sense eliminar res. No s’ofereix la confirmació d’eliminació i s’explica el motiu del bloqueig.

**Regles de negoci relacionades:**

* Un Item recollit també forma part de l’inventari de casa.
* No s’ha de destruir un Item físic que continua existint només perquè la Llista deixi d’existir.
* La V1 no incorpora Llistes arxivades ni tancades.
* La Llista només es pot eliminar si està buida o si tots els Items associats compleixen simultàniament `estat_comanda = demanat`, `quantitat_pagada = 0` i `quantitat_regalada = 0`. El `preu_total` informat no bloqueja l’eliminació.
* Quan l’eliminació és permesa i l’Usuari la confirma, s’eliminen la Llista, tots els ITEM_LLISTA associats i els Items associats que en formaven part; la Botiga es conserva. És una única operació conceptual, sense eliminacions parcials.

### 4.3. Items

### CU-08 — Crear Item

**Actor:** Usuari

**Objectiu:** Registrar un nou objecte físic que forma part de la preparació del nadó.

**Precondicions:** Cap.

**Flux principal:**

1. L’Usuari inicia la creació d’un Item.
2. El sistema sol·licita les dades de l’Item i la seva Subcategoria.
3. L’Usuari introdueix el nom obligatori, selecciona exactament una Subcategoria predefinida i, opcionalment, aporta una fotografia.
4. L’Usuari selecciona explícitament exactament una situació inicial, sense valor preseleccionat: **A casa** o **En una llista**.
5. Si selecciona **En una llista**, l’Usuari selecciona una Llista i indica l’estat de comanda obligatori i sense valor preseleccionat, i els imports preu total, quantitat regalada i quantitat pagada pròpia segons RF-26. El preu total és obligatori i major que zero; els altres dos imports poden ser zero. No selecciona cap estat econòmic. Si la creació s’ha iniciat des d’una Llista, aquesta ja queda preseleccionada.
6. L’Usuari confirma la creació.
7. El sistema valida les dades i crea l’Item, registrant automàticament `data_creacio`, i, si correspon, el seu context ITEM_LLISTA amb les dades d’adquisició. La data de creació és diferent de `data_entrada_casa` i no és editable per l’Usuari.
8. Si s’ha creat directament **A casa**, la preparació comença com a **no preparada**, sense exigir ni demanar data d’entrada a casa. Si s’ha creat amb context de Llista i comanda **recollit**, el sistema registra automàticament la data actual com a `data_recollida` i la mateixa com a `data_entrada_casa`: l’Item és a casa, conserva ITEM_LLISTA i comença com a **no preparada**, sense introducció manual de dates. Amb qualsevol estat de comanda previ, encara no té data d’entrada a casa i la preparació no és aplicable.

**Fluxos alternatius / excepcions:**

* Si l’Usuari selecciona explícitament **A casa**, el sistema crea l’Item sense ITEM_LLISTA. No seleccionar cap situació no equival a aquesta opció.
* Si encara no es coneix la classificació correcta, es pot seleccionar la Subcategoria predefinida **Pendent de classificar**, dins de la Categoria del mateix nom, i canviar-la posteriorment mitjançant CU-10.
* Si falta la Llista, l’Usuari pot crear-la mitjançant CU-05 i reprendre la creació de l’Item amb les dades introduïdes conservades i la nova Llista seleccionada. Cancel·lar després l’Item no elimina la Llista creada ni cap Botiga creada durant el procés.
* Si es canvia d’**En una llista** a **A casa**, es descarten les dades i el context de Llista que deixen de ser aplicables.
* Si falten dades obligatòries o no es compleixen les validacions, el sistema no completa la creació, conserva les dades introduïdes, identifica els errors i permet corregir-los i tornar a confirmar.

**Postcondicions:**

* Es crea un únic Item físic amb exactament una Subcategoria i, només si correspon, un ITEM_LLISTA.
* La creació inicial com a **recollit** produeix les mateixes invariants que la transició de CU-18: dates automàtiques coincidents, Item a casa, preparació inicial **no preparada**, context i visibilitat a la Llista conservats amb possibilitat de correcció posterior mitjançant CU-18.

**Regles de negoci relacionades:**

* Cada Item representa una unitat física individual.
* El nom compleix RF-01a: ignorant els espais inicials i finals a efectes de validació, no és buit, conté almenys una lletra i no supera 100 caràcters. Admet números i símbols juntament amb lletres i es permeten noms duplicats.
* La fotografia és opcional, amb un màxim d’una per Item i compatibilitat funcional amb fotografies mòbils, inclosos HEIC/HEIF, segons RF-01b.
* Les dades econòmiques pertanyen exclusivament a ITEM_LLISTA i compleixen RF-26: `preu_total > 0`, `quantitat_regalada >= 0`, `quantitat_pagada >= 0` i `quantitat_regalada + quantitat_pagada <= preu_total`. La quantitat regalada correspon a tercers i la pagada només al mateix Usuari. Si els imports no són vàlids, no es crea l’Item ni s’ajusten automàticament: es conserven les dades i es mostren els errors. La quantitat pendent i l’estat econòmic es deriven segons RF-25 i RF-27, sense persistir-los.
* Un Item pertany a una única Subcategoria.
* Un Item pot existir sense estar associat a cap Llista i, en V1, pot estar associat com a màxim a una Llista.
* Un Item no té una relació directa amb RECOMANACIO. La relació conceptual és `ITEM → SUBCATEGORIA ← RECOMANACIO`: l’Item contribueix a la cobertura perquè pertany a la mateixa Subcategoria que la Recomanació.
* Un Item d’una Llista que posteriorment es recull continua sent el mateix Item.

**Exemples conceptuals:**

* Un **Cotxet** pertany a la Subcategoria **Cotxet**. Si hi ha una Recomanació d’1 Cotxet i l’Item està associat a una Llista de nadó, contribueix a la cobertura a través de la Subcategoria. Quan es recull, passa a considerar-se a casa i continua contribuint a la mateixa cobertura.
* Un **Body** rebut com a regal pertany a la Subcategoria **Bodies**. Si hi ha una Recomanació de 6 Bodies, l’Item hi contribueix encara que no estigui associat a cap Llista i estigui directament a casa.

### CU-09 — Consultar Item

**Actor:** Usuari

**Objectiu:** Consultar les dades i l’estat actual d’un Item.

**Precondicions:** L’Item existeix.

**Flux principal:**

1. L’Usuari sol·licita la consulta d’Items.
2. L’Usuari pot combinar la situació (tots, a casa o pendents de recollir en Llistes), Categoria, Subcategoria i cerca només pel nom, insensible a majúscules/minúscules i actualitzada mentre s’escriu. La Subcategoria depèn de la Categoria; si un canvi de Categoria la fa incompatible, deixa de restringir la consulta. En consultar els pendents de recollir també es pot restringir per Llista. El sistema ordena els resultats del més recentment creat al més antic.
3. L’Usuari selecciona un Item.
4. El sistema mostra les dades pròpies de l’Item, excepte la data de creació, la seva situació actual i, només si és a casa, l’estat de preparació. Si prové d’una Llista i és recollit, també permet consultar-ne la data d’entrada a casa i la procedència.
5. Quan existeix ITEM_LLISTA, l’Usuari pot consultar la informació d’adquisició des del context de la Llista: estat de comanda, estat econòmic derivat, preu total, quantitat regalada, quantitat pagada pròpia, quantitat pendent derivada, data de recollida i informació de la Llista. Continua disponible després de la recollida, sense haver de presentar-la conjuntament amb les dades pròpies de l’Item a casa.

**Fluxos alternatius / excepcions:**

* Si l’Item no està associat a una Llista, el sistema mostra només les dades que li corresponen sense context de Llista.
* Si no existeix cap Item, el sistema ho indica i permet iniciar CU-08. Si hi ha Items però cap coincideix amb la consulta, ho indica i permet restablir els filtres i la cerca.
* La consulta d’Items a casa inclou els creats directament a casa i els de Llista recollits; la consulta dels que són en llistes inclou només els pendents de recollir.

**Regles de negoci relacionades:**

* La consulta de l’estat de comanda i de la situació econòmica forma part de la consulta de l’Item; no constitueix un cas d’ús separat.
* La informació econòmica pertany a ITEM_LLISTA i no es copia a ITEM. La consulta de la informació d’adquisició conservada no crea cap entitat ni cas d’ús d’historial.

### CU-10 — Editar Item

**Actor:** Usuari

**Objectiu:** Modificar les dades pròpies d’un Item existent.

**Precondicions:** L’Item existeix.

**Flux principal:**

1. L’Usuari consulta un Item.
2. L’Usuari inicia l’edició.
3. L’Usuari modifica les dades pròpies de l’Item; pot substituir la Subcategoria **Pendent de classificar** per la correcta.
4. L’Usuari desa els canvis.
5. El sistema valida les dades i actualitza l’Item, mantenint exactament una Subcategoria.

**Fluxos alternatius / excepcions:**

* Si les dades no són vàlides, el sistema no desa els canvis, conserva les dades introduïdes i permet corregir-les.

**Regles de negoci relacionades:**

* L’estat de comanda i la situació econòmica es gestionen en casos d’ús específics i no formen part d’aquesta edició.
* Es mantenen les regles del nom i de la fotografia de RF-01a i RF-01b, i la selecció entre Subcategories predefinides. La fotografia es pot canviar o eliminar; `data_creacio` no és editable. Les dates de recollida i entrada a casa tampoc no són editables manualment; una recollida errònia es corregeix mitjançant CU-18.

### CU-11 — Eliminar Item

**Actor:** Usuari

**Objectiu:** Eliminar un Item que ja no es vol gestionar a Nestly.

**Precondicions:** L’Item existeix.

**Flux principal:**

1. L’Usuari selecciona un Item.
2. L’Usuari sol·licita eliminar-lo.
3. L’Usuari confirma l’acció.
4. El sistema elimina l’Item.

**Regles de negoci relacionades:**

* Eliminar un Item no elimina la seva Llista de nadó.
* Un Item que encara forma part d’una Llista es pot eliminar individualment.
* La Llista continua existint després d’eliminar l’Item.

### CU-12 — Marcar Item com a preparat

**Actor:** Usuari

**Objectiu:** Indicar que un Item que ja és a casa està preparat per ser utilitzat.

**Precondicions:** L’Item existeix i es considera a casa.

**Flux principal:**

1. L’Usuari selecciona un Item a casa.
2. L’Usuari indica que està preparat.
3. El sistema actualitza l’estat de preparació de l’Item a **preparada**.

**Fluxos alternatius / excepcions:**

* Si l’Item encara no és a casa, el sistema no permet marcar-lo com a preparat.

**Regles de negoci relacionades:**

* L’estat de preparació és independent de l’estat de comanda i només és aplicable quan l’Item és físicament a casa. El valor inicial aplicable és **no preparada**, tant en crear-lo directament a casa com en recollir-lo de Llista.
* La V1 només contempla els estats de preparació **no preparada** i **preparada**.
* No es contempla el cicle de roba bruta/neta ni altres estats posteriors.

### 4.4. Recomanacions

### CU-13 — Crear recomanació

**Actor:** Usuari

**Objectiu:** Registrar una Recomanació de quantitat proporcionada per la llevadora.

**Precondicions:** La Subcategoria corresponent existeix com a dada predefinida.

**Flux principal:**

1. L’Usuari inicia la creació d’una Recomanació.
2. El sistema mostra les Subcategories disponibles.
3. L’Usuari selecciona la Subcategoria.
4. L’Usuari indica la quantitat recomanada.
5. L’Usuari confirma la creació.
6. El sistema crea la Recomanació.

**Regles de negoci relacionades:**

* Una Recomanació està associada a una Subcategoria.
* La quantitat recomanada és orientativa. La quantitat recomanada ha de ser un enter estrictament positiu (`quantitat_recomanada > 0`); no admet zero, valors negatius ni decimals. Si no es recomana cap unitat, la Subcategoria no té Recomanació. Si no és vàlida, no es crea la Recomanació i s’aplica RF-32.
* La Subcategoria seleccionada queda fixada en crear la Recomanació i no es pot canviar en editar-la.
* La V1 no permet crear una Subcategoria des d’aquest cas d’ús.

### CU-14 — Consultar recomanació

**Actor:** Usuari

**Objectiu:** Consultar les dades d’una Recomanació existent.

**Precondicions:** La Recomanació existeix.

**Flux principal:**

1. L’Usuari sol·licita la consulta de Recomanacions.
2. L’Usuari selecciona una Recomanació.
3. El sistema mostra les dades de la Recomanació i la Subcategoria associada.

**Regles de negoci relacionades:**

* La cobertura de la Recomanació es consulta mitjançant el CU-17.

### CU-15 — Editar recomanació

**Actor:** Usuari

**Objectiu:** Modificar la quantitat recomanada d’una Recomanació existent.

**Precondicions:** La Recomanació existeix.

**Flux principal:**

1. L’Usuari consulta una Recomanació.
2. L’Usuari inicia l’edició.
3. L’Usuari modifica la quantitat recomanada; la Subcategoria es manté fixa.
4. L’Usuari desa els canvis.
5. El sistema valida que la quantitat sigui un enter estrictament positiu i actualitza la Recomanació. Si no és vàlida, no desa els canvis i s’aplica RF-32.

**Regles de negoci relacionades:**

* La Recomanació manté el caràcter orientatiu després de la modificació.
* La quantitat recomanada ha de ser un enter estrictament positiu (`quantitat_recomanada > 0`); no admet zero, valors negatius ni decimals. Si no es recomana cap unitat, la Subcategoria no té Recomanació.
* La Subcategoria es fixa en crear la Recomanació i no es pot modificar posteriorment. En editar-la només es pot canviar la quantitat recomanada. Si la Subcategoria és incorrecta, cal eliminar la Recomanació i crear-ne una de nova per a la Subcategoria correcta.

### CU-16 — Eliminar recomanació

**Actor:** Usuari

**Objectiu:** Eliminar una Recomanació que ja no es vol gestionar.

**Precondicions:** La Recomanació existeix.

**Flux principal:**

1. L’Usuari selecciona una Recomanació.
2. L’Usuari sol·licita eliminar-la.
3. L’Usuari confirma l’acció.
4. El sistema elimina la Recomanació.

**Regles de negoci relacionades:**

* Eliminar una Recomanació no elimina els Items de la seva Subcategoria.

### CU-17 — Consultar cobertura de recomanació

**Actor:** Usuari

**Objectiu:** Saber quina quantitat d’Items existeix per a una Subcategoria respecte de la quantitat recomanada.

**Precondicions:** Existeix una Recomanació amb quantitat recomanada.

**Flux principal:**

1. L’Usuari selecciona una Recomanació.
2. El sistema identifica la Subcategoria associada.
3. El sistema calcula la quantitat actual a partir dels Items registrats d’aquella Subcategoria per determinar la cobertura, excloent de qualsevol cobertura els Items de **Pendent de classificar** fins que siguin reclassificats. Inclou els Items a casa i els encara en Llistes i en proporciona el desglossament, sense comptar els recollits dues vegades.
4. El sistema compara la quantitat actual amb la quantitat recomanada.
5. El sistema mostra el resultat: **Falten X**, **Recomanació coberta** o **Ja en tens X**.

**Fluxos alternatius / excepcions:**

* Si encara no hi ha cap Item a la Subcategoria, el sistema mostra una quantitat actual de zero i la cobertura corresponent.
* Si no hi ha cap Recomanació, el sistema ho indica i permet iniciar CU-13. La consulta de cobertura només inclou Subcategories amb Recomanació.
* Si hi ha Items pendents de classificar, el sistema n’informa i permet consultar-los mitjançant CU-09.

**Regles de negoci relacionades:**

* No existeix una relació directa `ITEM → RECOMANACIO`.
* Els Items contribueixen a la cobertura a través de la seva Subcategoria, amb l’excepció de **Pendent de classificar**. No es prohibeix crear Recomanacions per a aquella Subcategoria: aquesta decisió no s’ha pres.
* Els Items a casa i els Items associats a Llistes compten segons les regles de cobertura de la V1.
* La quantitat actual i l’estat de cobertura són informació derivada.
* La Recomanació continua existint encara que estigui coberta.
* Pot existir una Recomanació d’una Subcategoria sense cap Item registrat; en aquest cas, la quantitat actual és `0`.

### 4.5. Comandes

### CU-18 — Actualitzar estat de comanda

**Actor:** Usuari

**Objectiu:** Actualitzar l’estat d’adquisició d’un Item associat a una Llista de nadó.

**Precondicions:** L’Item existeix i està associat a una LLISTA_NADO.

**Flux principal:**

1. L’Usuari consulta l’Item.
2. L’Usuari inicia l’actualització de l’estat de comanda.
3. L’Usuari selecciona el nou estat entre els estats de comanda definits a la V1.
4. El sistema actualitza l’estat de comanda seleccionat; si es corregeix una recollida errònia, aplica el flux alternatiu corresponent.
5. Si l’estat passa a **recollit**, el sistema registra automàticament la data actual, en aquell mateix moment, com a `data_recollida` i registra aquesta mateixa data com a `data_entrada_casa`, sense que l’Usuari les introdueixi manualment.
6. En aquesta transició, el sistema considera l’Item físicament a casa i el manté associat i visible dins de la Llista, conservant ITEM_LLISTA i les dades d’adquisició sense copiar-les a ITEM. Continua sent el mateix Item; l’estat de preparació esdevé aplicable i comença com a **no preparada**.

**Fluxos alternatius / excepcions:**

* Si l’Item no està associat a cap Llista, el sistema no permet actualitzar-ne l’estat de comanda.
* Si l’Item encara no ha arribat a **recollit**, l’Usuari pot corregir l’estat o fer-lo retrocedir entre els estats previs a la recollida per resoldre un error o una incidència amb la Botiga; el sistema registra l’estat corregit.
* Per corregir una recollida registrada per error, l’Usuari selecciona explícitament **demanat**, **encarregat** o **a punt per recollir**, sense guardar ni inferir l’estat anterior. `data_recollida` i `data_entrada_casa` deixen de tenir valor; l’Item deixa de considerar-se físicament a casa, la preparació deixa de ser aplicable encara que fos **preparada**, i torna a estar pendent de recollida dins de la seva Llista. Es conserven el mateix Item, ITEM_LLISTA i la relació amb la Llista, sense crear cap Item nou. Si després torna a **recollit**, es registren de nou la data actual de recollida i la mateixa data d’entrada a casa, i la preparació torna a ser aplicable amb valor inicial **no preparada**. Les dues dates no són editables manualment: la correcció es fa mitjançant l’estat de comanda.

**Postcondicions:**

* L’estat de comanda queda actualitzat segons la selecció explícita de l’Usuari.
* Si s’ha corregit **recollit** cap a un estat previ, les dues dates queden sense valor, l’Item deixa de ser a casa i la preparació no és aplicable; queda pendent de recollida, conservant el mateix Item, ITEM_LLISTA i la Llista.
* Si l’estat ha passat a **recollit**, `data_recollida` i `data_entrada_casa` contenen la mateixa data registrada automàticament en el moment de la transició. L’Item es considera físicament a casa, conserva la seva associació amb la Llista i continua sent el mateix Item, amb estat de preparació inicial aplicable **no preparada**.

**Regles de negoci relacionades:**

* Els estats de comanda de la V1 són **demanat**, **encarregat**, **a punt per recollir** i **recollit**.
* Els estats previs a **recollit** es poden corregir o fer retrocedir. Si **recollit** s’ha registrat per error, també es pot corregir cap a un estat previ seleccionat explícitament, aplicant les conseqüències descrites al flux alternatiu.
* **Preparada** no és un estat de comanda: pertany a l’estat de preparació de l’Item. Passar a **recollit** no implica marcar-lo com a preparat.
* La transició a **recollit** no crea un nou Item.
* L’Item recollit continua associat i visible dins de la seva Llista per conservar-ne el context i la procedència de Llista.
* `data_recollida` i `data_entrada_casa` no són editables manualment. Mentre l’Item és **recollit**, és a casa i totes dues dates coincideixen; si es corregeix cap a un estat previ, deixen de ser aplicables.
* Crear un Item inicialment com a **recollit** aplica aquestes mateixes invariants dins de CU-08, sense requerir una transició posterior.

### 4.6. Situació econòmica

### CU-19 — Actualitzar situació econòmica d’un Item

**Actor:** Usuari

**Objectiu:** Actualitzar la situació econòmica d’un Item associat a una Llista de nadó.

**Precondicions:** L’Item existeix i està associat a una Llista.

**Flux principal:**

1. L’Usuari consulta el context d’adquisició de l’Item dins de la Llista.
2. L’Usuari inicia l’actualització de la situació econòmica.
3. L’Usuari modifica els imports acumulats actuals: preu total, quantitat regalada i quantitat pagada pròpia, sense seleccionar cap estat econòmic.
4. L’Usuari desa els canvis.
5. El sistema valida el conjunt final d’imports i, si compleix RF-26, actualitza les dades d’ITEM_LLISTA, sense copiar-les a ITEM; deriva de nou la quantitat pendent i l’estat econòmic.

**Fluxos alternatius / excepcions:**

* Si l’Item no està associat a una Llista, el sistema no permet actualitzar-ne la situació econòmica de llista.
* Si falta el preu total o el conjunt final no compleix `preu_total > 0`, `quantitat_regalada >= 0`, `quantitat_pagada >= 0` i `quantitat_regalada + quantitat_pagada <= preu_total`, el sistema no desa els canvis, no ajusta automàticament cap import, conserva les dades introduïdes i mostra els errors perquè l’Usuari els corregeixi.

**Regles de negoci relacionades:**

* Es registren només els imports acumulats actuals segons RF-26. La quantitat regalada és assumida per tercers, tant si entreguen diners a l’Usuari com si paguen a la Botiga; la quantitat pagada és assumida i ja pagada pel mateix Usuari, sense incloure tercers.
* La situació econòmica és independent de l’estat de comanda i les regles s’apliquen també després de la recollida. Registrar `quantitat_pagada > 0` o `quantitat_regalada > 0` no canvia automàticament l’estat de comanda a **encarregat** ni a cap altre estat. L’Usuari canvia explícitament la comanda quan l’adquisició ha estat realment encarregada.
* La quantitat pendent és derivada: `quantitat_pendent = preu_total - quantitat_regalada - quantitat_pagada`. La quantitat assumida es deriva quan calgui: `quantitat_assumida = preu_total - quantitat_regalada`.
* L’estat econòmic es deriva de la quantitat pendent: **pendent** si és major que zero i **pagat** si és zero, també quan tot el preu és assumit per tercers. No se selecciona ni es persisteix; tampoc no es persisteixen les dues quantitats derivades.
* No es registra historial de pagaments ni aportacions individuals.

## 5. Casos que no es documenten de manera independent

No es creen casos d’ús separats per a les accions següents perquè formen part d’un cas d’ús principal o de dades predefinides:

- assignar una Llista a una Botiga, que forma part del CU-05;
- afegir un Item a casa o a una Llista, que forma part del CU-08;
- marcar un Item com a recollit, que forma part de CU-08 si és l’estat inicial o de CU-18 si és una transició posterior;
- encadenar creacions d’Item, Llista i Botiga, que reutilitza CU-08, CU-05 i CU-01; cada creació completada es conserva independentment de la cancel·lació de les altres;
- consultar l’estat de comanda o la situació econòmica, que forma part del CU-09;
- crear una llista de Recomanacions;
- crear Categories o Subcategories, que a la V1 es tracten com a dades predefinides.

## 6. Consideracions importants sobre el domini

### Item

Un Item és una unitat física individual, pertany a una única Subcategoria i pot existir sense Llista. Una Subcategoria pot existir sense cap Item associat. En V1, un Item pot estar vinculat, com a màxim, a una Llista. Si prové d’una Llista i es recull, continua sent el mateix Item i passa a considerar-se a casa.

### Recomanació

Una Recomanació està associada a una Subcategoria, té una quantitat orientativa i no manté una relació directa amb cap Item. La relació conceptual és `ITEM → SUBCATEGORIA ← RECOMANACIO`: la cobertura es calcula amb els Items de la Subcategoria, amb l’exclusió de **Pendent de classificar**, i la Recomanació continua existint encara que ja estigui coberta.

Per exemple, un **Cotxet** d’una Llista contribueix a la Recomanació de la Subcategoria **Cotxet** tant abans com després de ser recollit. Igualment, un **Body** rebut directament a casa contribueix a la Recomanació de la Subcategoria **Bodies** sense necessitat de cap Llista. Si una Recomanació no té encara cap Item a la seva Subcategoria, la quantitat actual és `0`.

### Llista

Una Llista sempre està associada a una Botiga i pot existir sense Items. En la V1, una Botiga pot no tenir cap Llista o tenir-ne una única. La possibilitat de múltiples Llistes per Botiga és una evolució futura.

Les cardinalitats rellevants són:

```text
LLISTA_NADO 1 : 0..N ITEM_LLISTA
ITEM 1 : 0..1 ITEM_LLISTA
```

## 7. Observacions detectades

No s’han detectat observacions pendents de resoldre amb la documentació actual de la V1.

## 8. Diagrama de casos d’ús

El diagrama UML de casos d’ús es generarà posteriorment a partir d’aquest catàleg validat. Haurà de representar l’actor i els objectius del sistema, no pantalles ni rutes de navegació.
