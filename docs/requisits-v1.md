# Requisits — V1

## Context del projecte

Nestly és un projecte personal desenvolupat en el marc d’una pràctica d’un màster d’IA. A més de construir una aplicació útil, el projecte busca aplicar un procés d’enginyeria de software assistida per IA.

El treball avança de manera progressiva: primer es defineixen el problema, els requisits, el domini, els casos d’ús, l’arquitectura i la documentació; després, la IA ajuda en la implementació i la validació.

## 1. Objectiu

Aquest document concreta què ha de complir la V1 de Nestly a partir de la seva idea inicial. Defineix els comportaments funcionals, la informació que s’ha de gestionar, les regles que s’han de respectar i els límits explícits de la versió.

No descriu com s’implementaran aquests requisits ni substitueix el document de model de domini.

## 2. Abast

La V1 ha de permetre registrar i consultar la informació necessària per controlar la preparació de l’arribada d’un nadó. Ha d’incloure Items, la seva classificació, Recomanacions, Botigues, Llistes de nadó i la informació específica dels Items associats a una llista.

És una aplicació web personal, local i manual. El seu propòsit és facilitar el control de la informació, no integrar-se automàticament amb serveis externs.

## 3. Actors / usuaris

La V1 contempla un únic Usuari, responsable de gestionar la informació de l’aplicació.

En una evolució futura es podria contemplar un usuari amb permisos de consulta, però no és un requisit funcional de la V1 ni implica definir ara un sistema de permisos més complex.

## 4. Requisits funcionals

### 4.1. Gestió d’Items

- **RF-01.** El sistema ha de permetre crear un Item que representi una unitat física individual.
- **RF-01a.** El nom de l’Item és obligatori. A efectes de validació, s’ignoren els espais inicials i finals; el resultat no pot quedar buit, ha de contenir almenys una lletra i pot tenir com a màxim 100 caràcters. Pot contenir números i símbols si també conté una lletra. Es permeten noms duplicats per a unitats físiques diferents.
- **RF-01b.** Cada Item pot tenir com a màxim una fotografia, opcional. La V1 ha de permetre utilitzar fotografies habituals de dispositius mòbils, inclosos HEIC/HEIF d’iPhone i els formats web i fotogràfics habituals.
- **RF-01c.** En crear un Item, l’Usuari ha de seleccionar explícitament exactament una situació inicial: **A casa** o **En una llista**, sense opció preseleccionada. En el segon cas, la Llista és obligatòria i es registren en la mateixa creació les dades inicials d’ITEM_LLISTA. Iniciar la creació des d’una Llista en preselecciona la Llista, però no substitueix la selecció explícita de situació. Si es canvia a **A casa**, es descarten les dades i el context de Llista que deixen de ser aplicables.
- **RF-02.** El sistema ha de permetre consultar els Items registrats i, quan existeix ITEM_LLISTA, la informació d’adquisició des del context de la Llista: estat de comanda, situació econòmica, preu total, quantitat regalada, quantitat pagada pròpia, quantitat pendent derivada, data de recollida i procedència. Aquesta informació continua consultable després de recollir l’Item i no es copia a ITEM. El detall principal d’un Item a casa mostra la Llista d’origen i permet navegar-hi si en prové, però no mostra la informació econòmica.
- **RF-02a.** El sistema ha de permetre combinar la consulta per situació (tots, a casa o pendents de recollir en Llistes), Categoria, Subcategoria i cerca exclusivament pel nom, insensible a majúscules/minúscules i actualitzada mentre s’escriu. La Subcategoria ha de correspondre a la Categoria seleccionada; en canviar de Categoria, una Subcategoria incompatible deixa de restringir la consulta. Per als Items pendents de recollir també es pot restringir per Llista. Els Items a casa inclouen els incorporats directament i els recollits.
- **RF-02b.** El sistema registra automàticament la data de creació de cada Item, diferent de la data d’entrada a casa i no editable per l’Usuari. Els Items s’ordenen per defecte del més recentment afegit al més antic, també dins dels grups de pendents de recollir i recollits d’una Llista.
- **RF-03.** El sistema ha de permetre classificar cada Item en una Categoria i una Subcategoria mitjançant la seva Subcategoria.
- **RF-04.** El sistema ha de permetre registrar Items directament a casa sense exigir ni demanar manualment data d’entrada a casa. Un Item encara en adquisició tampoc no té aquesta data; per als Items recollits de Llista s’apliquen RF-29 i RF-30.
- **RF-05.** El sistema ha de permetre associar un Item a una Llista de nadó quan correspongui.
- **RF-06.** El sistema ha de permetre registrar i consultar l’estat de preparació només quan l’Item és físicament a casa. Comença com a **no preparada** tant en crear-lo directament a casa com en recollir-lo d’una Llista, inclosa la creació inicial com a `recollit`; posteriorment es pot marcar com a **preparada**. Abans de ser a casa, l’estat de preparació no és aplicable; això no introdueix un tercer estat.
- **RF-06a.** El sistema ha de permetre eliminar un Item individualment, fins i tot si encara està associat a una Llista de nadó, sense eliminar la Llista.

L’estat de preparació indica si un Item que ja és a casa està **no preparada** o **preparada** per ser utilitzat. Pot implicar, segons el tipus d’objecte, muntar-lo, rentar-lo, assecar-lo o planxar-lo. És independent de l’estat de comanda i la V1 no inclou un cicle de roba bruta/neta.

Un Item rebut directament com a regal pot existir sense estar associat a cap Llista de nadó.

### 4.2. Categories i Subcategories predefinides

- **RF-07.** El sistema ha de disposar de Categories i Subcategories predefinides, inclosa la Subcategoria **Pendent de classificar** dins de la Categoria **Pendent de classificar**. Permet crear un Item sense conèixer encara la classificació correcta, mantenint exactament una Subcategoria; es pot substituir per la correcta en editar l’Item.
- **RF-08.** El sistema ha de permetre a l’Usuari consultar i seleccionar les Categories i Subcategories disponibles quan correspongui.
- **RF-09.** El sistema ha de presentar cada Subcategoria dins de la Categoria a la qual pertany.
- **RF-10.** El sistema ha de permetre consultar els Items a partir de la seva classificació per Categoria i Subcategoria.

L’Usuari no crea, modifica ni elimina Categories o Subcategories des de Nestly en la V1. Una Subcategoria pot existir sense cap Item associat; cada Item pertany a una única Subcategoria.

### 4.3. Gestió de Recomanacions

- **RF-11.** El sistema ha de permetre definir una quantitat recomanada per a una Subcategoria. La quantitat recomanada ha de ser un enter estrictament positiu (`quantitat_recomanada > 0`); no admet zero, valors negatius ni decimals. Si no es recomana cap unitat, la Subcategoria no té Recomanació. La Subcategoria es fixa en crear la Recomanació i no es pot modificar posteriorment. En editar-la només es pot canviar la quantitat recomanada. Si la Subcategoria és incorrecta, cal eliminar la Recomanació i crear-ne una de nova per a la Subcategoria correcta.
- **RF-12.** El sistema ha de permetre consultar la quantitat recomanada d’una Subcategoria.
- **RF-13.** El sistema ha de calcular la quantitat actual d’una Subcategoria a partir dels Items registrats.
- **RF-14.** El sistema ha d’informar quan falten unitats per arribar a la quantitat recomanada.
- **RF-15.** El sistema ha d’informar quan la Recomanació està coberta.
- **RF-16.** El sistema ha d’informar quan la quantitat registrada supera la quantitat recomanada.

La Recomanació és orientativa i no obliga a assolir cap quantitat concreta.

Els Items de **Pendent de classificar** no contribueixen a cap cobertura fins que siguin reclassificats. Aquesta excepció no prohibeix crear Recomanacions per a aquella Subcategoria; no s’ha pres aquesta decisió. Per a la resta, es compten tots els Items de la Subcategoria, tant a casa com pendents de recollir en Llistes, amb desglossament per aquestes dues situacions. Si hi ha Items pendents de classificar, el sistema n’informa i permet consultar-los. La consulta de cobertura inclou només Subcategories amb Recomanació.

Una Recomanació està associada a una Subcategoria. No existeix una relació directa entre ITEM i RECOMANACIO: un Item contribueix a la cobertura perquè pertany a la mateixa Subcategoria que la Recomanació.

### 4.4. Gestió de Botigues i Llistes de nadó

- **RF-17.** El sistema ha de permetre crear i consultar Botigues. El nom és obligatori; a efectes de validació s’ignoren els espais inicials i finals, el resultat no pot quedar buit i té un màxim de 100 caràcters. Es permeten noms duplicats i no s’exigeix que contingui cap lletra. La URL és opcional; si s’informa, ha de ser una URL vàlida. Aquestes regles també s’apliquen en editar la Botiga.
- **RF-18.** El sistema ha de permetre gestionar Llistes de nadó. El nom és obligatori; a efectes de validació s’ignoren els espais inicials i finals, el resultat no pot quedar buit i té un màxim de 100 caràcters. Es permeten noms duplicats i no s’exigeix que contingui cap lletra. La descripció és opcional.
- **RF-19.** El sistema ha de permetre associar una Llista de nadó a una Botiga.
- **RF-20.** El sistema ha de permetre consultar els Items associats a una Llista de nadó determinada.
- **RF-20a.** El sistema ha de permetre consultar el resum econòmic derivat d’una Llista: **pendent de pagar per nosaltres** com a informació principal, **total assumit per nosaltres** com a informació secundària rellevant, i **valor total dels productes** i **total regalat** com a informació complementària. Els quatre totals es calculen segons §5 a partir dels ITEM_LLISTA actuals; no es persisteixen a LLISTA_NADO ni requereixen una nova entitat. La necessitat és consultar la informació, sense exigir un botó per calcular-la.
- **RF-21.** El sistema ha de permetre identificar la Botiga i la Llista de procedència d’un Item que hi estigui associat.
- **RF-21a.** La Llista només es pot eliminar si està buida o si tots els Items associats compleixen simultàniament `estat_comanda = demanat`, `quantitat_pagada = 0` i `quantitat_regalada = 0`. El `preu_total` informat no bloqueja l’eliminació. Si algun Item està **encarregat**, **a punt per recollir** o **recollit**, o té quantitat pagada o regalada major que zero, es rebutja tota l’operació sense eliminar res.
- **RF-21b.** El sistema ha de permetre eliminar una Botiga només quan no tingui cap Llista de nadó associada.

Una Llista de nadó sempre està associada a una Botiga. La cardinalitat de la V1 és `BOTIGA 1:0..1 LLISTA_NADO`: una Botiga pot no tenir cap Llista o tenir-ne una única. La possibilitat de múltiples Llistes per Botiga és una evolució futura. Una Llista pot existir sense Items associats.

### 4.5. Gestió de l’estat de comanda

- **RF-22.** El sistema ha de permetre registrar i consultar l’estat de comanda d’un Item de llista. Ha de permetre corregir-lo, inclòs fer-lo retrocedir entre els estats previs a la recollida i corregir un `recollit` erroni segons RF-28.
- **RF-23.** El sistema ha de permetre registrar els estats conceptuals de comanda: demanat, encarregat, a punt per recollir i recollit. En crear un Item amb ITEM_LLISTA, l’estat de comanda és obligatori, sense valor preseleccionat; `recollit` també és vàlid com a estat inicial.

La correcció dels estats previs a `recollit` permet resoldre errors de registre o incidències excepcionals amb la Botiga, com ara que un Item que constava com `a punt per recollir` deixi d’estar-ho.

### 4.6. Gestió de l’estat econòmic

- **RF-24.** El sistema ha de permetre registrar i consultar els imports acumulats actuals d’un Item de llista: `preu_total`, `quantitat_regalada` i `quantitat_pagada`.
- **RF-25.** L’estat econòmic es deriva de la quantitat pendent: **pendent** si és major que zero i **pagat** si és zero. No es selecciona manualment ni es persisteix `estat_economic`; **regalat** i **paga i senyal** no són estats econòmics de la V1.
- **RF-26.** Tant en crear com en editar els imports, s’ha de complir `preu_total > 0`, `quantitat_regalada >= 0`, `quantitat_pagada >= 0` i `quantitat_regalada + quantitat_pagada <= preu_total`. El preu total és obligatori i representa el preu complet de l’Item a la Botiga. La quantitat regalada és la part assumida per tercers, tant si entreguen els diners a l’Usuari com si paguen directament a la Botiga. La quantitat pagada és la part assumida i ja pagada pel mateix Usuari, sense incloure imports de tercers. Totes dues poden ser zero. Si el conjunt final d’imports incompleix aquestes regles, no es desa l’operació, es conserven les dades introduïdes i es mostra l’error perquè l’Usuari les corregeixi. El sistema no ajusta automàticament cap import per fer-lo encaixar.
- **RF-27.** El sistema ha de permetre consultar la quantitat pendent derivada: `quantitat_pendent = preu_total - quantitat_regalada - quantitat_pagada`. La quantitat assumida es pot derivar quan sigui necessària: `quantitat_assumida = preu_total - quantitat_regalada`. Cap d’aquestes dues quantitats es persisteix.

Si tercers assumeixen tot el preu, la quantitat pagada pròpia pot ser zero i l’estat derivat és **pagat**, perquè la quantitat pendent és zero.

Les dades econòmiques només existeixen en ITEM_LLISTA, no com a dades pròpies d’ITEM, i es conserven després de la recollida.

### 4.7. Recollida d’un Item

- **RF-28.** El sistema ha de permetre que l’estat de comanda d’un Item de llista passi a `recollit`. També ha de permetre corregir aquest estat si s’ha registrat per error. Per corregir una recollida registrada per error, l’Usuari selecciona explícitament **demanat**, **encarregat** o **a punt per recollir**, sense guardar ni inferir l’estat anterior. `data_recollida` i `data_entrada_casa` deixen de tenir valor; l’Item deixa de considerar-se físicament a casa, la preparació deixa de ser aplicable encara que fos **preparada**, i torna a estar pendent de recollida dins de la seva Llista. Es conserven el mateix Item, ITEM_LLISTA i la relació amb la Llista, sense crear cap Item nou. Si després torna a **recollit**, es registren de nou la data actual de recollida i la mateixa data d’entrada a casa, i la preparació torna a ser aplicable amb valor inicial **no preparada**. Les dues dates no són editables manualment: la correcció es fa mitjançant l’estat de comanda.
- **RF-29.** En aquesta transició, el sistema ha de registrar automàticament la data de recollida en aquell mateix moment i mantenir l’Item associat i visible dins de la seva Llista, conservant-ne el context i la traçabilitat.
- **RF-30.** En aquesta transició, el sistema ha de registrar automàticament com a data d’entrada a casa la mateixa data de recollida i considerar l’Item físicament a casa.
- **RF-31.** En aquesta transició, l’Item continua sent el mateix i el sistema no en crea un de nou.

L’Usuari no introdueix manualment la data de recollida ni la data d’entrada a casa en el flux normal de recollida. Passar a `recollit` no implica marcar l’Item com a **preparada**: l’estat de preparació continua sent independent de l’estat de comanda.

- **RF-31a.** També es pot crear un Item amb context de Llista i estat inicial `recollit`. En la mateixa creació s’apliquen les invariants de RF-28 a RF-31: data de recollida actual i mateixa data d’entrada a casa, registre automàtic sense introducció manual, Item físicament a casa, un únic Item amb ITEM_LLISTA conservat i visible a la Llista, amb possibilitat de correcció posterior segons RF-28. L’estat de preparació esdevé aplicable i comença com a **no preparada**, igual que en la transició posterior.

### 4.8. Continuïtat dels formularis i creacions relacionades

- **RF-32.** Davant de qualsevol error de formulari, el sistema ha de conservar les dades introduïdes; en els errors de validació, ha d’identificar-los i permetre corregir-los i tornar a desar. Si s’abandona un formulari sense canvis, es pot sortir directament; si hi ha canvis sense desar, s’ha de confirmar abans de descartar-los. La V1 no inclou esborranys ni desament automàtic.
- **RF-33.** Durant la creació d’un Item es pot crear una Llista necessària i, durant la creació d’una Llista, una Botiga necessària. En completar cada creació secundària, es reprèn la creació d’origen amb les dades introduïdes conservades i la nova Llista o Botiga seleccionada. Cada creació completada és independent: cancel·lar la creació d’origen no elimina la Llista o Botiga ja creada. Es reutilitzen els casos d’ús existents.

- **RF-34.** Tota eliminació d’una entitat requereix confirmació de l’Usuari abans d’executar-se. Si comporta conseqüències addicionals, aquestes s’han d’explicar abans de confirmar; es mantenen les restriccions d’eliminació existents.

## 5. Informació funcional derivada

La informació següent s’ha de calcular a partir de les dades registrades; no constitueix un requisit de persistència independent. Aquesta decisió evita duplicar dades i possibles incoherències.

| Informació | Càlcul |
| --- | --- |
| Quantitat actual d’una Subcategoria | Recompte de tots els Items registrats que pertanyen a la Subcategoria, fins i tot si provenen d’una Llista i encara no s’han recollit. Per exemple, amb 3 Bodies a casa i 2 Bodies associats a una Llista, la quantitat actual de Bodies és 5. |
| Quantitat pendent de pagament | `quantitat_pendent = preu_total - quantitat_regalada - quantitat_pagada`. |
| Quantitat assumida | `quantitat_assumida = preu_total - quantitat_regalada`, quan sigui necessària. |
| Estat econòmic | **pendent** si `quantitat_pendent > 0`; **pagat** si `quantitat_pendent = 0`. |
| Pendent de pagar per nosaltres | `pendent_total = Σ quantitat_pendent`: import que encara ens queda per pagar dels Items de la Llista. |
| Total assumit per nosaltres | `total_assumit = Σ quantitat_assumida`: cost que ens correspon, independentment de si ja l’hem pagat. |
| Valor total dels productes | `valor_total_productes = Σ preu_total`: valor complet dels Items de la Llista, incloses la part pròpia i la regalada. |
| Total regalat | `total_regalat = Σ quantitat_regalada`: part total assumida per tercers. |
| Estat de cobertura d’una Recomanació | Comparació entre la quantitat actual registrada i la quantitat recomanada de la Subcategoria, amb l’exclusió de cobertura dels Items de **Pendent de classificar** descrita a §4.3. És informació derivada; en l’exemple de 5 Bodies davant d’una Recomanació de 6, el resultat és «Falten 1». |

Les sumes del resum econòmic inclouen tots els ITEM_LLISTA actuals de la Llista, tant dels Items recollits com dels pendents de recollir. Si la Llista és buida, els quatre totals són zero. No són atributs persistents de LLISTA_NADO ni constitueixen un historial de pagaments.

## 6. Regles funcionals / de negoci

1. Cada Item representa una unitat física individual.
2. Un Item pertany a una única Subcategoria.
3. Un Item pot existir sense estar associat a una Llista de nadó.
4. En V1, un Item pot estar associat com a màxim a una Llista de nadó.
5. Una Llista de nadó sempre està associada a una Botiga i pot contenir zero, un o molts Items mitjançant el seu context d’Item de llista.
6. En V1, una Botiga pot no tenir cap Llista de nadó o tenir-ne una única; cada Llista pertany a una única Botiga. La possibilitat de múltiples Llistes per Botiga és una evolució futura.
7. L’estat de comanda, la informació econòmica i l’estat de preparació són dimensions diferents. Registrar `quantitat_pagada > 0` o `quantitat_regalada > 0` no canvia automàticament l’estat de comanda a **encarregat** ni a cap altre estat. L’Usuari canvia explícitament la comanda quan l’adquisició ha estat realment encarregada.
8. Un Item recollit continua visible dins de la seva Llista de nadó, conserva el context de la Llista i passa a considerar-se físicament a casa.
9. Tots els Items registrats contribueixen al recompte de la seva Subcategoria, inclosos els Items a casa i els Items associats a una Llista. Els de **Pendent de classificar** no contribueixen a cap cobertura fins que siguin reclassificats.
10. Una Recomanació està associada a una Subcategoria; no existeix una relació directa entre ITEM i RECOMANACIO.
11. Les Recomanacions són orientatives.
12. La quantitat actual i l’estat de cobertura són dades derivades.
13. La quantitat pendent, la quantitat assumida i l’estat econòmic són dades derivades; els tres imports registrats compleixen RF-26.
14. Eliminar un Item no elimina la seva Llista de nadó; un Item associat a una Llista es pot eliminar individualment.
15. S’apliquen les condicions d’eliminació de RF-21a. Quan l’eliminació és permesa i l’Usuari la confirma, s’eliminen la Llista, tots els ITEM_LLISTA associats i els Items associats que en formaven part; la Botiga es conserva. És una única operació conceptual, sense eliminacions parcials.
16. Una Botiga només es pot eliminar si no té cap Llista de nadó associada.

## 7. Requisits no funcionals

- **RNF-01.** La V1 ha de ser una aplicació web.
- **RNF-02.** La V1 ha d’estar orientada a un ús personal, local i manual.
- **RNF-03.** El desenvolupament ha de prioritzar la mantenibilitat, la claredat i la qualitat del codi.
- **RNF-04.** La qualitat i les proves formen part del procés de desenvolupament quan s’arribi a la fase d’implementació.
- **RNF-05.** El sistema ha de tractar de manera segura les entrades de l’Usuari perquè no puguin ser interpretades indegudament com a codi o consultes executables. Aquesta exigència és independent de les validacions funcionals, com ara les del nom de l’Item, i no prescriu cap mecanisme ni tecnologia concreta.

## 8. Fora de l’abast de la V1

No formen part de la V1:

- sincronització amb botigues;
- actualització automàtica de preus;
- comparació de preus;
- notificacions, correu electrònic o avisos push;
- pagaments en línia;
- aplicació mòbil;
- reconeixement automàtic d’imatges;
- funcionalitats comercials;
- arxivament o tancament de Llistes de nadó;
- historial de compres;
- historial de pagaments, aportacions individuals, identitat de qui fa cada regal, dates i mètodes de pagament;
- importació de llistes de webs externes;
- altres funcionalitats futures encara no definides.

## 9. Evolució futura

Les possibilitats següents són evolucions potencials i no requisits de la V1:

- múltiples usuaris;
- usuari amb permisos de consulta;
- múltiples llistes per botiga;
- historial d’un Item en diferents llistes;
- arxivament o tancament de Llistes de nadó;
- historial de compres;
- suport per a més d’un nadó;
- comparació de preus;
- sincronització amb botigues;
- evolució cap a un producte comercial.
