# Model de domini V1

## 1. Objectiu del model

Aquest document descriu el model conceptual de domini de la V1 de Nestly. El model representa la informació necessària per controlar la preparació de l’arribada d’un nadó: els objectes físics disponibles, la seva classificació, les recomanacions de quantitat i el seu possible origen en llistes de nadó de botigues.

Serveix per compartir un vocabulari comú, fer explícites les regles de negoci i validar les decisions de modelatge abans d’entrar en decisions d’implementació. Per tant, no defineix taules, claus, tipus de dades, classes ni arquitectura.

## 2. Abast del domini V1

La V1 és una eina personal, local i manual de control i registre. Permet representar objectes que ja són a casa, objectes vinculats a una llista de nadó, el seu procés de comanda, la seva situació econòmica, la seva recollida i el nivell de cobertura de les recomanacions de quantitat.

La V1 és utilitzada conceptualment per una única persona i no inclou autenticació, login, comptes, email, password, rols ni perfil d’usuari. La persona que utilitza l’aplicació és l’actor dels casos d’ús, però no es representa com una entitat del domini ni s’estableixen relacions de propietat de les dades amb aquesta persona.

Queden fora de l’abast la sincronització amb botigues, la comparació o actualització automàtica de preus, els pagaments en línia, les notificacions, l’aplicació mòbil, el reconeixement d’imatges i les funcionalitats comercials.

## 3. Conceptes principals del domini

- **Classificació**: les Categories i Subcategories organitzen els objectes. La Subcategoria és el nivell concret al qual s’associa cada Item.
- **Objecte físic**: un Item representa una unitat física individual que pot existir sense llista o formar part d’una llista, i que contribueix al recompte de la seva Subcategoria.
- **Recomanació**: una orientació de quantitat per a una Subcategoria, amb la qual es pot comparar el recompte dels Items que pertanyen a aquella Subcategoria.
- **Llista de nadó**: el context d’una botiga en què es registren Items que formen part d’una llista, juntament amb la informació específica de compra o recollida.
- **Context i procedència de Llista**: la relació `ITEM_LLISTA` conserva el context d’un Item dins d’una llista, fins i tot després que aquest Item hagi estat recollit i sigui a casa. Això permet continuar coneixent la Llista d’origen i consultar la informació d’adquisició corresponent. No implica historial d’estats ni auditoria de canvis; en corregir un `recollit` no es conserva ni s’infereix l’estat anterior.

## 4. Entitats

### 4.1. CATEGORIA

Representa un grup general de classificació d’Items. La seva responsabilitat és ordenar el domini a un nivell ampli, com ara Roba, Higiene i cura, Entreteniment o De passeig.

| Atribut | Significat |
| --- | --- |
| `id_categoria` | Identificador de la categoria. |
| `nom` | Nom de la categoria. |

Una Categoria agrupa Subcategories. No es relaciona directament amb ITEM: la classificació d’un Item s’obté a través de la seva Subcategoria.

### 4.2. SUBCATEGORIA

Representa el nivell específic de classificació dels Items. Exemples són Bodies, Texans o Mitjons dins de Roba; Llibres o Joguines dins d’Entreteniment; Cotxet dins de De passeig; i Sabó del cos dins d’Higiene i cura.

| Atribut | Significat |
| --- | --- |
| `id_subcategoria` | Identificador de la subcategoria. |
| `nom` | Nom de la subcategoria. |
| `descripcio` | Descripció que n’aclareix el significat. |

Cada Subcategoria pertany a una única Categoria. Pot existir sense cap Item associat; quan existeixen, els Items pertanyen a una única Subcategoria. És el punt de classificació dels Items i, opcionalment, pot tenir una Recomanació associada.

Categories i Subcategories són dades predefinides que l’Usuari no crea, modifica ni elimina en V1. Inclouen la Subcategoria **Pendent de classificar**, que pertany a la Categoria **Pendent de classificar**. Aquesta classificació provisional permet mantenir exactament una Subcategoria per Item encara que no se’n conegui la correcta; posteriorment es pot substituir en editar l’Item. La relació no esdevé opcional.

#### Catàleg inicial predefinit de V1

Aquest és el catàleg inicial aprovat. És una decisió funcional: les Categories/Subcategories són dades base obligatòries de Nestly V1, no dades personals ni fixtures de desenvolupament o test, i han d’estar disponibles de manera reproduïble en una instal·lació nova. El mecanisme tècnic de càrrega mitjançant migracions versionades està documentat a M0.4 del [pla d’implementació, §3.4](./pla-implementacio-v1.md#34-categories-i-subcategories-predefinides).

| Categoria | Subcategories |
| --- | --- |
| Roba | Bodies; Primera posta; Mitjons; Malles; Vestit; Pijama; Texans; Samarreta; Jersei; Anorac |
| Higiene i cura | Arrullos; Sabó del cos; Crema hidratant; Crema del culet; Oli hidratant; Banyera; Joguines pel bany; Tallaungles |
| De passeig | Cotxet; Bossa de passeig; Sac; Cadira del cotxe; Funda de cadireta |
| Alimentació | Trona; Biberons; Pitets; Vaixella; Esterilitzador de biberons |
| Bossa hospital Mare | Bates; Sabatilles; Maleta; Calces de cotó; Compreses; Sostenidors de lactància; Mugroneres |
| Mobles | Colecho; Bressol/llit evolutiu; Canviador |
| Entreteniment | Llibres; Joguines |
| Pendent de classificar | Pendent de classificar |

El catàleg pot evolucionar en versions futures, però no s’amplia ni es reorganitza sense una nova decisió explícita. Tot Item manté exactament una Subcategoria. Els Items de **Pendent de classificar** queden exclosos de la cobertura de Recomanacions fins que es reclassifiquin, segons §4.4.

### 4.3. ITEM

Representa un objecte o producte físic individual. La seva responsabilitat és reflectir una unitat real disponible o prevista, no una quantitat agregada. Per exemple, cinc bodies físics són cinc Items.

| Atribut | Significat |
| --- | --- |
| `id_item` | Identificador de l’Item. |
| `nom` | Nom de l’objecte o producte. |
| `foto` | Fotografia opcional de l’Item, amb un màxim d’una. |
| `estat_preparacio` | Estat de preparació de l’objecte, aplicable només quan és físicament a casa. |
| `data_creacio` | Data de creació de l’Item, registrada automàticament i no editable per l’Usuari. És diferent de `data_entrada_casa` i permet ordenar els Items del més recentment afegit al més antic. |
| `data_entrada_casa` | Data en què l’Item passa a estar físicament a casa, quan correspon. |

Cada Item pertany a una única Subcategoria. Pot existir sense estar associat a cap llista, per exemple perquè s’ha comprat directament, s’ha rebut com a regal o ja era a casa. En V1, pot tenir com a màxim un context de llista mitjançant ITEM_LLISTA.

Un Item sense ITEM_LLISTA pot ser un objecte incorporat directament a casa. Si un Item està associat a una llista i la seva adquisició arriba a estat **recollit**, passa a considerar-se a casa sense perdre el seu context de llista. És el mateix objecte físic abans i després de la recollida; no se’n crea un de nou.

El nom és obligatori: a efectes de validació se n’ignoren els espais inicials i finals, no pot quedar buit, ha de contenir almenys una lletra i té un màxim de 100 caràcters. Admet números i símbols si també conté alguna lletra. No és únic: unitats físiques diferents poden tenir el mateix nom.

L’`estat_preparacio` només és aplicable quan l’Item és físicament a casa. En registrar-lo directament a casa es pot seleccionar **preparada** o **no preparada**, amb **no preparada** com a valor inicial del formulari; totes les unitats de l’operació reben l’estat escollit. Aquesta excepció aprovada de RF-06 no afecta la recollida de Llista: en recollir-lo, també si es crea inicialment com a **recollit**, s’inicia obligatòriament com a **no preparada** i posteriorment pot passar a **preparada**. Aquests són els dos únics estats; la no aplicabilitat abans de ser a casa no és un tercer estat ni en defineix la representació tècnica. És independent de l’estat de comanda, que només descriu el procés d’adquisició.

Un Item incorporat directament a casa no necessita `data_entrada_casa`; un Item encara en adquisició no la té. Per als Items recollits de Llista, aquesta data coincideix amb `data_recollida`, segons les regles d’ITEM_LLISTA.

### 4.4. RECOMANACIO

Representa una orientació sobre quantes unitats d’una Subcategoria es recomanen. No és una obligació ni emmagatzema el recompte real: aquest es calcula a partir dels Items de la Subcategoria.

| Atribut | Significat |
| --- | --- |
| `id_recomanacio` | Identificador de la recomanació. |
| `quantitat_recomanada` | Quantitat orientativa recomanada per a la Subcategoria. |

Cada Recomanació està associada a una Subcategoria. Una Subcategoria pot no tenir-ne cap. No existeix una relació directa entre ITEM i RECOMANACIO: un Item contribueix a la cobertura d’una Recomanació a través de la Subcategoria a la qual pertany. La Recomanació es manté visible encara que el recompte actual ja la cobreixi.

Els Items de la Subcategoria **Pendent de classificar** no contribueixen a cap cobertura fins que siguin reclassificats. Aquesta excepció no modifica la relació obligatòria amb Subcategoria ni prohibeix crear una Recomanació per a **Pendent de classificar**; aquesta darrera decisió no s’ha pres.

La quantitat recomanada ha de ser un enter estrictament positiu (`quantitat_recomanada > 0`); no admet zero, valors negatius ni decimals. Si no es recomana cap unitat, la Subcategoria no té Recomanació. La Subcategoria es fixa en crear la Recomanació i no es pot modificar posteriorment. En editar-la només es pot canviar la quantitat recomanada. Si la Subcategoria és incorrecta, cal eliminar la Recomanació i crear-ne una de nova per a la Subcategoria correcta.

### 4.5. BOTIGA

Representa una botiga que, en la V1, pot existir sense cap Llista de nadó o tenir-ne una única.

| Atribut | Significat |
| --- | --- |
| `id_botiga` | Identificador de la botiga. |
| `nom` | Nom de la botiga. |
| `url` | Adreça de la botiga. |

El nom és obligatori; a efectes de validació s’ignoren els espais inicials i finals, el resultat no pot quedar buit i té un màxim de 100 caràcters. Es permeten noms duplicats i no s’exigeix que contingui cap lletra. La URL és opcional; si s’informa, ha de ser una URL vàlida.

Cada Llista de nadó pertany a una única Botiga. En la V1, una Botiga pot no tenir cap Llista o tenir-ne una única. La possibilitat que una Botiga gestioni diverses Llistes queda com a evolució futura.

### 4.6. LLISTA_NADO

Representa una llista de nadó d’una Botiga. Agrupa els contexts de llista dels Items que en formen part.

| Atribut | Significat |
| --- | --- |
| `id_llista` | Identificador de la llista. |
| `nom` | Nom de la llista. |
| `descripcio` | Descripció de la llista. |

El nom és obligatori; a efectes de validació s’ignoren els espais inicials i finals, el resultat no pot quedar buit i té un màxim de 100 caràcters. Es permeten noms duplicats i no s’exigeix que contingui cap lletra. La descripció és opcional.

Una Llista de nadó pertany a una Botiga i pot contenir zero, un o molts Items a través d’ITEM_LLISTA. Per tant, es pot crear abans d’afegir-hi cap Item. El pendent de pagar per nosaltres, el total assumit per nosaltres, el valor total dels productes i el total regalat es deriven dels ITEM_LLISTA actuals segons §7. No són atributs persistents de LLISTA_NADO i no introdueixen cap entitat de resum, pagaments o estadístiques.

### 4.7. ITEM_LLISTA

Representa la participació o el context d’un Item dins d’una Llista de nadó. No és un segon producte físic: l’objecte continua sent l’ITEM relacionat. La seva responsabilitat és conservar les dades de comanda, econòmiques i de recollida que només tenen sentit dins d’aquella llista.

| Atribut | Significat |
| --- | --- |
| `id_item_llista` | Identificador del context d’Item dins de la llista. |
| `estat_comanda` | Situació obligatòria de l’adquisició de l’Item. |
| `data_recollida` | Data en què s’ha recollit l’Item, quan correspon. |
| `preu_total` | Preu complet de l’Item a la Botiga, obligatori i major que zero. |
| `quantitat_regalada` | Part del preu assumida per tercers, que pot ser zero. Inclou tant diners entregats a l’Usuari com pagaments directes a la Botiga. |
| `quantitat_pagada` | Part del preu assumida i ja pagada pel mateix Usuari, excloent els imports assumits per tercers. Pot ser zero. |

Els estats conceptuals de comanda són: **demanat**, **encarregat**, **a punt per recollir** i **recollit**. L’estat econòmic és informació derivada dels imports, amb els valors **pendent** o **pagat**, independent de la comanda; no és un atribut persistent ni se selecciona manualment.

Cada ITEM_LLISTA pertany a una única LLISTA_NADO i correspon a un únic ITEM. En crear un Item amb origen de Llista, es crea aquest context amb les dades inicials d’adquisició. La informació econòmica només pertany a ITEM_LLISTA: no es copia a ITEM i continua consultable des del context de la Llista després de la recollida.

Les dades econòmiques persistents són els tres imports acumulats actuals: `preu_total`, `quantitat_regalada` i `quantitat_pagada`. Tant en crear com en editar ITEM_LLISTA, s’ha de complir `preu_total > 0`, `quantitat_regalada >= 0`, `quantitat_pagada >= 0` i `quantitat_regalada + quantitat_pagada <= preu_total`. Si el conjunt final incompleix la invariant, no es desa; l’Usuari ha de corregir les dades, sense ajust automàtic dels imports.

Es deriven `quantitat_pendent = preu_total - quantitat_regalada - quantitat_pagada` i, quan calgui, `quantitat_assumida = preu_total - quantitat_regalada`. L’estat econòmic és **pendent** si la quantitat pendent és major que zero i **pagat** si és zero. Ni aquestes quantitats derivades ni `estat_economic` es persisteixen. **Regalat** i **paga i senyal** no són estats econòmics.

| Preu total | Quantitat regalada | Quantitat pagada pròpia | Quantitat pendent derivada | Estat derivat |
| --- | --- | --- | --- | --- |
| 100 | 0 | 0 | 100 | pendent |
| 100 | 30 | 0 | 70 | pendent |
| 100 | 30 | 20 | 50 | pendent |
| 100 | 30 | 70 | 0 | pagat |
| 100 | 100 | 0 | 0 | pagat |

Un Item assumit íntegrament per tercers està **pagat** perquè queda completament liquidat, encara que la quantitat pagada pròpia sigui zero. No es modelen historial de pagaments, aportacions individuals, identitats de tercers, dates ni mètodes de pagament.

Abans de **recollit**, l’estat de comanda es pot corregir o fer retrocedir entre els estats previs. També es pot corregir **recollit** si s’ha registrat per error. En arribar-hi, es registra automàticament la data actual com a `data_recollida` i la mateixa data com a `data_entrada_casa`, sense introducció manual. L’Item passa a considerar-se físicament a casa i conserva ITEM_LLISTA, la visibilitat dins de la Llista i el context d’adquisició. Continua sent el mateix Item i la preparació esdevé aplicable amb valor inicial **no preparada**.

També és vàlid crear un Item de Llista amb estat inicial **recollit**. En la mateixa creació s’apliquen les mateixes invariants: dates actuals coincidents, registre automàtic, Item a casa, preparació inicial **no preparada** i un únic Item físic amb ITEM_LLISTA conservat. També s’hi aplica la possibilitat de correcció posterior.

Per corregir una recollida registrada per error, l’Usuari selecciona explícitament **demanat**, **encarregat** o **a punt per recollir**, sense guardar ni inferir l’estat anterior. `data_recollida` i `data_entrada_casa` deixen de tenir valor; l’Item deixa de considerar-se físicament a casa, la preparació deixa de ser aplicable encara que fos **preparada**, i torna a estar pendent de recollida dins de la seva Llista. Es conserven el mateix Item, ITEM_LLISTA i la relació amb la Llista, sense crear cap Item nou. Si després torna a **recollit**, es registren de nou la data actual de recollida i la mateixa data d’entrada a casa, i la preparació torna a ser aplicable amb valor inicial **no preparada**. Les dues dates no són editables manualment: la correcció es fa mitjançant l’estat de comanda. Mentre l’Item de Llista és **recollit**, és físicament a casa i es compleix `data_recollida = data_entrada_casa`; en corregir-lo cap a un estat previ, totes dues dates deixen de ser aplicables.

## 5. Relacions i cardinalitats

| Entitat origen | Relació | Entitat destinació | Cardinalitat | Significat |
| --- | --- | --- | --- | --- |
| CATEGORIA | agrupa | SUBCATEGORIA | 1:N | Una Categoria agrupa una o més Subcategories; cada Subcategoria pertany a una única Categoria. |
| SUBCATEGORIA | classifica | ITEM | 1:0..N | Una Subcategoria pot no classificar cap Item o classificar-ne diversos; cada Item pertany a una única Subcategoria. |
| SUBCATEGORIA | té | RECOMANACIO | 1:0..1 | Una Subcategoria pot no tenir Recomanació o tenir-ne una; cada Recomanació correspon a una Subcategoria. |
| BOTIGA | té | LLISTA_NADO | 1:0..1 | Una Botiga pot no tenir cap Llista de nadó o tenir-ne una única; cada Llista de nadó correspon a una Botiga. |
| LLISTA_NADO | conté | ITEM_LLISTA | 1:0..N | Una Llista de nadó pot no contenir cap context d’Item o contenir-ne diversos; cada ITEM_LLISTA correspon a una única Llista. |
| ITEM | pot participar mitjançant | ITEM_LLISTA | 1:0..1 | Un Item pot no estar en cap llista o estar vinculat a una única llista en V1; cada ITEM_LLISTA correspon a un únic Item. |

La relació entre ITEM i LLISTA_NADO no és directa: ITEM_LLISTA n’és el context i hi aporta la informació pròpia de l’adquisició. Tampoc no existeix una relació directa entre ITEM i CATEGORIA, perquè s’obté mitjançant `ITEM → SUBCATEGORIA → CATEGORIA`.

De la mateixa manera, no existeix una relació directa entre ITEM i RECOMANACIO. La cobertura es determina a través del recorregut `ITEM → SUBCATEGORIA ← RECOMANACIO`.

## 6. Regles de negoci

1. Cada Item representa una unitat física individual.
2. Un Item pertany a una única Subcategoria.
3. Un Item pot existir sense estar associat a cap llista.
4. En V1, un Item pot estar associat com a màxim a una llista.
5. Una Llista de nadó pot contenir zero, un o molts Items mitjançant ITEM_LLISTA.
6. ITEM_LLISTA conté exclusivament la informació específica del context de l’Item dins de la llista.
7. L’estat de comanda i la informació econòmica són dimensions diferents. Registrar `quantitat_pagada > 0` o `quantitat_regalada > 0` no canvia automàticament l’estat de comanda a **encarregat** ni a cap altre estat. L’Usuari canvia explícitament la comanda quan l’adquisició ha estat realment encarregada.
8. Un Item recollit continua sent visible dins de la seva llista i conserva el seu context i la procedència de Llista.
9. Un Item recollit passa a considerar-se físicament a casa.
10. En recollir un Item de Llista, també en crear-lo inicialment com a recollit, es registren automàticament les dates coincidents de recollida i entrada a casa segons §4.7. Un Item creat directament a casa no necessita aquesta data.
11. Tots els Items registrats contribueixen al recompte actual de la seva Subcategoria, independentment de si ja han estat recollits o es troben pendents de recollida dins d’una llista. Els de **Pendent de classificar** queden exclosos de qualsevol cobertura fins que siguin reclassificats, segons §4.4.
12. Una Recomanació continua existint encara que ja estigui coberta.
13. La quantitat actual no es persisteix dins de RECOMANACIO; és informació derivada.
14. La quantitat pendent, la quantitat assumida i l’estat econòmic són informació derivada dels tres imports d’ITEM_LLISTA, que han de complir la invariant de §4.7.
15. El pendent de pagar per nosaltres, el total assumit per nosaltres, el valor total dels productes i el total regalat d’una Llista es calculen a partir dels ITEM_LLISTA actuals segons §7, sense persistir-los.
16. La Llista només es pot eliminar si està buida o si tots els Items associats compleixen simultàniament `estat_comanda = demanat`, `quantitat_pagada = 0` i `quantitat_regalada = 0`. El `preu_total` informat no bloqueja l’eliminació. Si algun Item està **encarregat**, **a punt per recollir** o **recollit**, o té quantitat pagada o regalada major que zero, es rebutja tota l’operació sense eliminar res.
17. Quan l’eliminació és permesa i l’Usuari la confirma, s’eliminen la Llista, tots els ITEM_LLISTA associats i els Items associats que en formaven part; la Botiga es conserva. És una única operació conceptual, sense eliminacions parcials.
18. L’estat de comanda descriu l’adquisició; l’estat de preparació només és aplicable a casa i descriu si l’objecte està no preparada o preparada per ser utilitzat, segons §4.3. Són conceptes independents.
19. Una Subcategoria pot existir sense cap Item associat.
20. En la V1, una Botiga pot existir sense cap Llista de nadó o tenir-ne una única; cada Llista pertany a una única Botiga.

## 7. Informació derivada

La informació següent es calcula a partir de dades del model i no es persisteix com a atribut propi. Això evita duplicar dades, discrepàncies entre valors i múltiples fonts de veritat.

| Informació derivada | Càlcul conceptual |
| --- | --- |
| Quantitat actual | Recompte de tots els Items registrats que pertanyen a una Subcategoria. En V1, tot Item registrat es considera part de la quantitat prevista, encara que provingui d’una llista i encara no s’hagi recollit. |
| Desglossament per situació | Recompte d’Items a casa (directes i recollits) i en llistes (encara pendents de recollir) dins de la Subcategoria; s’aplica la mateixa exclusió de cobertura de §4.4. |
| Quantitat pendent de pagament | `quantitat_pendent = preu_total - quantitat_regalada - quantitat_pagada`. |
| Quantitat assumida | `quantitat_assumida = preu_total - quantitat_regalada`, quan sigui necessària. |
| Estat econòmic | **pendent** si `quantitat_pendent > 0`; **pagat** si `quantitat_pendent = 0`. |
| Estat de cobertura de la Recomanació | Comparació entre la quantitat actual d’Items de la Subcategoria i `quantitat_recomanada`, respectant l’exclusió de cobertura de **Pendent de classificar** (§4.4). Per exemple, si la Recomanació de Bodies és 6 i hi ha 3 Bodies a casa i 2 associats a llistes, la quantitat actual és 5. Pot mostrar missatges com «Falten X», «Recomanació coberta» o «Ja en tens X». |
| Pendent de pagar per nosaltres | `pendent_total = Σ quantitat_pendent`, amb `quantitat_pendent = preu_total - quantitat_regalada - quantitat_pagada`. |
| Total assumit per nosaltres | `total_assumit = Σ quantitat_assumida`, amb `quantitat_assumida = preu_total - quantitat_regalada`. Inclou la part pròpia ja pagada i la pendent. |
| Valor total dels productes | `valor_total_productes = Σ preu_total`. Inclou tant la part assumida per nosaltres com la part regalada. |
| Total regalat | `total_regalat = Σ quantitat_regalada`. Representa la part total assumida per tercers. |

Les quatre sumes es fan sobre tots els ITEM_LLISTA actuals de la Llista, inclosos els dels Items recollits, i són zero si no n’hi ha cap. No es guarden com a atributs de LLISTA_NADO. El resum reflecteix els imports actuals, sense historial de pagaments.

## 8. Decisions de modelatge

### 8.1. Un Item representa una unitat física

Cada objecte físic es modela individualment perquè el domini necessita poder controlar cada unitat. Així, cinc bodies són cinc Items i no un sol registre amb quantitat cinc. Aquesta decisió permet identificar cada Item concret, el seu estat de preparació i, si n’hi ha, el seu origen en una llista.

La quantitat del formulari de registre directe a casa és una entrada de l’operació (enter entre 1 i 100), no un atribut persistent d’Item: es creen N unitats independents de manera atòmica. Poden compartir una fotografia sense perdre la seva identitat individual.

L’agrupació de consulta és una projecció, no una entitat: mateixa Subcategoria i nom retallat als extrems comparat sense distingir majúscules/minúscules. Conserva els noms originals i no normalitza accents ni espais interiors. Moments de creació, fotografies i preparacions diferents no separen un grup; cada unitat conserva ID i detall. El total és derivat. Els grups s’ordenen per màxima data de creació descendent i màxim ID descendent en empat; les unitats per data de creació i ID descendents.

La data d’entrada a casa no determina per si sola la situació: els Items directes no la necessiten i els recollits de Llista també són a casa, conservant ITEM_LLISTA.

### 8.2. Existència d’ITEM_LLISTA

ITEM_LLISTA separa l’objecte físic del seu context dins d’una llista. Les dades de comanda, preu, pagament i recollida no defineixen l’Item en si mateix; descriuen com aquest Item participa en una Llista de nadó concreta. Situar-les directament a ITEM barrejaria responsabilitats i dificultaria conservar la informació de la llista després de la recollida.

### 8.3. Separació dels estats

L’estat de comanda i l’estat econòmic descriuen dimensions diferents. Per exemple, un Item pot estar **encarregat** i tenir l’estat econòmic derivat **pendent**: el procés d’adquisició ha avançat, però encara queda una part per pagar. Per aquest motiu, un únic estat no representaria correctament totes dues situacions. Un Item **demanat** amb `quantitat_regalada = 200` i `quantitat_pagada = 0` és vàlid si respecta la invariant econòmica, però bloqueja l’eliminació de la Llista. Un Item **demanat** amb `preu_total = 800` i tots dos imports a zero no la bloqueja. Un Item **encarregat** amb tots dos imports a zero sí que la bloqueja, perquè l’adquisició ja està en curs. Cap d’aquests imports modifica automàticament la comanda.

L’estat de preparació és una tercera dimensió, també independent, aplicable només als Items físicament a casa. Indica si l’objecte està **no preparada** o **preparada** per ser utilitzat; no forma part del procés de comanda. La recollida registra automàticament l’entrada a casa i fa aplicable la preparació amb valor inicial **no preparada**, però no implica que l’objecte estigui preparat.

### 8.4. Informació derivada

La quantitat actual, la quantitat pendent de pagament, la quantitat assumida, l’estat econòmic, la cobertura de la Recomanació i els quatre totals del resum econòmic de la Llista definits a §7 es poden obtenir a partir de dades ja existents. No persistir-les evita haver de mantenir-les sincronitzades cada vegada que canvia un Item, els seus imports o una recomanació.

### 8.5. Absència de relacions redundants

No existeix una relació directa `ITEM → CATEGORIA` perquè seria redundant. La Categoria d’un Item es determina de manera inequívoca a través de la seva Subcategoria. Afegir aquesta relació duplicaria informació de classificació sense aportar una necessitat actual.

Tampoc no existeix una relació directa `ITEM → RECOMANACIO`. Una Recomanació correspon a una Subcategoria i la seva cobertura es calcula amb els Items d’aquella Subcategoria. Així, un Item regalat directament a casa, un Item d’una llista o un Item sense Recomanació explícita contribueixen al recompte segons la Subcategoria a la qual pertanyen.

## 9. Diagrama conceptual

El diagrama conceptual del model s’incorporarà en el fitxer editable `docs/diagrams/model-domini-v1.drawio` quan estigui disponible. Haurà de mostrar les entitats, els seus atributs, les relacions i les cardinalitats descrites en aquest document.

No ha de representar taules SQL, claus primàries o foranes, tipus de dades, components React, classes TypeScript ni infraestructura.

## 10. Limitacions de la V1 i evolució futura

Les decisions següents són específiques de la V1 i podrien evolucionar després d’una decisió explícita:

- una Botiga podria gestionar múltiples Llistes de nadó;
- un Item podria tenir historial de participació en diferents llistes;
- una Llista de nadó es podria marcar com a arxivada o tancada en comptes d’eliminar-se;
- es podria incorporar gestió d’usuaris amb diferents permisos, com ara administració i consulta, sense condicionar el model V1;
- es podria donar suport a més d’un nadó;
- es podrien estudiar la comparació de preus, la sincronització amb botigues i funcionalitats comercials.

Cap d’aquestes evolucions forma part del model actual ni s’ha de considerar implementada.

## 11. Decisions pendents

No hi ha decisions pendents identificades dins del model de domini V1 documentat.
