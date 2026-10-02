# Disseny UI/UX — V1

## 1. Objectiu

Aquest document recull les decisions de Disseny UI/UX preses per a la V1 de Nestly, incloses les validades després de revisar els primers wireframes. Defineix com l’Usuari navegarà i interactuarà amb les funcionalitats ja validades, sense modificar-ne els requisits, el domini ni els casos d’ús.

La fase UI/UX concreta l’estructura de pantalles, els fluxos principals i la informació visible en cada context. No defineix arquitectura, components, rutes, serveis, endpoints, base de dades ni detalls d’implementació.

## 2. Principis de disseny

La direcció de disseny de la V1 és una interfície:

- moderna, neta, clara i accessible, evitant una aparença antiquada;
- tranquil·la i relacionada amb la preparació per a l’arribada d’un nadó;
- fluida en la navegació entre les àrees principals;
- informativa, prioritzant la consulta i el seguiment de la informació registrada;
- allunyada d’una estètica excessivament infantil.

Nestly és un projecte personal i educatiu. El disseny ha de prioritzar la simplicitat i no convertir-se en un procés de UX empresarial complex.

L’enfocament és *mobile-first*, amb una experiència desktop completa. La navegació s’adapta segons §4.3, sense fixar encara breakpoints concrets.

La jerarquia visual, els espais en blanc, la tipografia llegible, el contrast, els estats de focus i les àrees tàctils adequades han de mantenir una experiència accessible i consistent. Desktop ha d’aprofitar el seu espai i no limitar-se a ampliar visualment el mòbil.

Encara no es defineixen una paleta de colors definitiva, tipografies definitives ni un *design system*. Aquestes decisions es treballaran després dels primers wireframes.

## 3. Mapa de pantalles

L’estructura conceptual de pantalles és la següent:

```text
Portada
└── Dashboard
    ├── Botigues
    │   ├── Crear Botiga
    │   └── Detall Botiga
    │       └── Detall Llista associada, si existeix
    ├── Llistes
    │   ├── Crear Llista
    │   └── Detall Llista
    │       └── Detall Item
    ├── Recomanacions
    │   ├── Crear Recomanació
    │   └── Detall Recomanació
    └── Items
        ├── Crear Item
        └── Detall Item
```

El mateix Item conserva un únic detall conceptual. Des d’una Llista es pot consultar el seu context d’adquisició; el detall principal a casa prioritza la preparació. En mòbil, **Més** és una pantalla pròpia d’accés a Recomanacions i Botigues, segons §4.3.

### 3.1. Portada

La primera pantalla de la V1 és la portada de **Nestly Central**. Actua com a entrada visual a l’aplicació i evita accedir directament al Dashboard.

Inclou una acció d’entrada, com ara **Entrar**, que condueix al Dashboard. La V1 no inclou autenticació, pantalla de *login*, perfil d’Usuari, avatar ni opcions de compte. L’autenticació i la gestió d’usuaris són possibles evolucions futures, fora de l’abast d’aquest disseny.

### 3.2. Dashboard

El Dashboard és el punt principal de navegació després de la portada. Dona accés a quatre àrees navegables:

- Botigues;
- Llistes;
- Recomanacions;
- Items.

No mostra perfil, avatar ni opcions de compte en la V1.

### 3.3. Botigues

#### Llistat de Botigues

Mostra les Botigues registrades i permet accedir al detall d’una Botiga o iniciar-ne la creació.

#### Crear Botiga

Inclou un formulari amb les dades de Botiga definides en el model de domini. El nom és obligatori; a efectes de validació s’ignoren els espais inicials i finals, el resultat no pot quedar buit i té un màxim de 100 caràcters. Es permeten noms duplicats i no s’exigeix que contingui cap lletra. La URL és opcional; si s’informa, ha de ser vàlida. Les mateixes regles s’apliquen en editar. Les accions disponibles són desar i cancel·lar.

#### Detall de Botiga

Mostra la informació pròpia de la Botiga. Si té una Llista de nadó associada, la mostra i permet navegar al detall d’aquesta Llista.

Des d’aquesta pantalla es pot accedir a editar i eliminar la Botiga. L’experiència ha de respectar la regla existent: una Botiga només es pot eliminar quan no té cap Llista de nadó associada.

### 3.4. Llistes

#### Llistat de Llistes

Mostra les Llistes existents preferentment en format de targeta. Cada targeta mostra, com a mínim:

- nom de la Llista;
- Botiga associada;
- nombre d’Items registrats.

Permet accedir al detall d’una Llista o iniciar la creació d’una Llista nova.

#### Crear Llista

Inclou un formulari amb les dades corresponents de la Llista i la selecció d’una Botiga registrada. El nom és obligatori; a efectes de validació s’ignoren els espais inicials i finals, el resultat no pot quedar buit i té un màxim de 100 caràcters. Es permeten noms duplicats i no s’exigeix que contingui cap lletra. La descripció és opcional. Ha de respectar la restricció de la V1: una Botiga pot tenir com a màxim una Llista de nadó.

Si la Botiga necessària encara no existeix, es pot iniciar Crear Botiga i tornar amb les dades de la Llista conservades i la nova Botiga seleccionada, segons el flux secundari de §4.1.

#### Detall de Llista

Mostra la informació de la Llista, la Botiga associada i els Items associats, agrupats visualment en **Pendents de recollir** i **Recollits**. Dins de cada grup s’ordenen del més recentment afegit al més antic, segons la data de creació de l’Item. Les targetes mostren només un resum de l’adquisició, amb:

- fotografia;
- nom;
- Categoria/Subcategoria;
- estat de comanda;
- estat econòmic derivat (**Pendent** o **Pagat**);
- acció o enllaç al detall.

El resum de cada targeta d’Item no inclou el desglossament complet de preu i pagaments. L’agrupació en pendents i recollits és visual i no representa entitats noves.

El detall de Llista permet consultar també el resum econòmic global, segons RF-20a i CU-06, amb aquesta jerarquia conceptual:

| Magnitud | Càlcul derivat | Prioritat i significat |
| --- | --- | --- |
| Pendent de pagar per nosaltres | `pendent_total = Σ quantitat_pendent` | Informació principal: import que encara ens queda per pagar. |
| Total assumit per nosaltres | `total_assumit = Σ quantitat_assumida` | Informació secundària rellevant: cost que ens correspon, tant si ja l’hem pagat com si encara és pendent. |
| Valor total dels productes | `valor_total_productes = Σ preu_total` | Informació complementària: valor complet dels Items, incloses la part pròpia i la regalada. |
| Total regalat | `total_regalat = Σ quantitat_regalada` | Informació complementària: part total assumida per tercers. |

S’apliquen les fórmules per Item de §3.6. Els totals inclouen tots els ITEM_LLISTA actuals de la Llista, tant recollits com pendents de recollir; si és buida, tots quatre són zero. Són informació de consulta derivada, sense camps editables ni persistència a LLISTA_NADO. La consulta no exigeix prémer un botó per calcular. El component visual concret, les animacions, els desplegables i altres detalls high-fi no es decideixen aquí.

En seleccionar un Item, l’Usuari accedeix al seu detall. Des d’aquesta pantalla també es pot iniciar l’acció d’afegir un Item, reutilitzant el procés general de creació amb la Llista preseleccionada.

Des del context de la Llista/ITEM_LLISTA es pot consultar la informació d’adquisició de cada Item, inclosos els recollits: estat de comanda, estat econòmic derivat, preu total, quantitat regalada, quantitat pagada pròpia, quantitat pendent derivada i data de recollida. Aquesta consulta conserva la traçabilitat sense afegir una pantalla d’historial ni duplicar les dades a ITEM. La informació econòmica completa es consulta al detall/context d’adquisició de l’Item, accessible des de la Llista també per als recollits; no s’afegeix al detall principal de l’Item a casa.

La Llista es pot eliminar si està buida o si tots els seus Items estan **demanats**, sense cap quantitat pagada ni regalada registrada. El preu informat no impedeix eliminar-la. Si algun Item ja està **encarregat**, **a punt per recollir** o **recollit**, o té imports pagats o regalats, es bloqueja tota l’eliminació segons §4.5.

### 3.5. Recomanacions

#### Llistat de Recomanacions

Mostra les Recomanacions registrades i permet crear una Recomanació o consultar-ne el detall.

#### Crear Recomanació

Permet seleccionar una Subcategoria existent i indicar la quantitat recomanada. La quantitat recomanada ha de ser un enter estrictament positiu (`quantitat_recomanada > 0`); no admet zero, valors negatius ni decimals. Si no es recomana cap unitat, la Subcategoria no té Recomanació.

#### Detall de Recomanació

Mostra la Subcategoria, la quantitat recomanada, la quantitat actual i el resultat de cobertura. Els resultats possibles són els ja definits als casos d’ús:

- `Falten X`;
- `Recomanació coberta`;
- `Ja en tens X`.

Permet accedir a editar i eliminar la Recomanació. La Subcategoria es fixa en crear la Recomanació i no es pot modificar posteriorment. En editar-la només es pot canviar la quantitat recomanada. Si la Subcategoria és incorrecta, cal eliminar la Recomanació i crear-ne una de nova per a la Subcategoria correcta. En editar, la Subcategoria es mostra només de consulta i la quantitat manté la validació d’enter positiu. Un Item no està associat directament a una Recomanació: la seva contribució deriva de compartir Subcategoria amb la Recomanació.

La cobertura es representa amb **barra de progrés, valors numèrics i missatge textual**, organitzada per Categoria → Subcategoria. Només s’hi mostren Subcategories amb Recomanació. Si no n’hi ha cap, es mostra un estat buit amb l’acció **Crear recomanació**. Una Subcategoria sense Recomanació no representa un error ni una tasca pendent.

El recompte inclou tots els Items de la Subcategoria, tant a casa com pendents de recollir en Llistes, i mostra el desglossament **X a casa · Y en llistes**. Els recollits compten a casa, sense duplicar-los. L’excés es comunica de manera neutra: per exemple, **11 de 8**, barra plena i **Recomanació coberta · +3**, sense advertiment. Quan se supera la Recomanació, la barra continua visualment plena, al 100%; la Recomanació no és un màxim permès. Aquesta presentació expressa el resultat conceptual de quantitat superior ja existent.

Els Items de **Pendent de classificar** no contribueixen a cap cobertura fins que siguin reclassificats. Si n’hi ha, es mostra un avís amb una acció per consultar-los. Això no prohibeix crear Recomanacions per a aquella Subcategoria: aquesta decisió no s’ha pres.

### 3.6. Items

Items és una secció principal del Dashboard. Substitueix una proposta inicial anomenada **A casa**, perquè representa tots els Items gestionats per Nestly, tant els que ja són a casa com els que encara estan associats a una Llista.

#### Llistat d’Items

Els tabs de situació són **Tots**, **A casa** i **En llistes**. **Tots** inclou tots els Items. **A casa** inclou Items creats directament a casa i Items de Llista ja recollits. **En llistes** inclou només els associats a una Llista i pendents de recollir. L’estat inicial és **Tots**, totes les Categories i totes les Subcategories, sense cerca ni filtre de Llista.

Categoria i Subcategoria són filtres addicionals. En seleccionar una Categoria, el filtre Subcategoria només ofereix les seves Subcategories; si es canvia de Categoria i la Subcategoria deixa de ser vàlida, torna a **Totes**. El filtre per Llista només és visible al tab **En llistes**. Els filtres actius es combinen de manera conjuntiva: els resultats han de complir-los tots.

La cerca és exclusivament pel nom, es combina amb els filtres, filtra mentre s’escriu i és insensible a majúscules/minúscules. Els Items s’ordenen per defecte del més recentment afegit al més antic, segons `data_creacio`.

Les targetes mostren fotografia o *placeholder* neutre, nom, Categoria/Subcategoria i situació contextual. A casa mostren també l’estat de preparació; si encara són en una Llista, mostren la Llista i l’estat de comanda rellevant. No mostren informació econòmica. La Llista d’origen dels Items a casa es consulta al detall, no és necessària al resum general.

Si no existeix cap Item, es mostra un missatge específic amb **Afegir Item**. Si existeixen Items però la cerca o els filtres no donen resultats, es mostra un missatge diferent amb **Netejar filtres**, que retorna a **Tots**, totes les Categories i totes les Subcategories, sense cerca ni filtre de Llista.

En desktop, les targetes es distribueixen en una graella responsive. En mòbil, la cerca i els tabs de situació són sempre visibles; els filtres secundaris es presenten segons §4.4. **Afegir Item** és una acció de la capçalera de pantalla, sense FAB ni botó d’amplada completa permanent.

#### Crear Item

Hi ha un únic procés conceptual de creació d’Item. Es pot iniciar des de la secció Items o des del detall d’una Llista; en aquest segon cas, la Llista queda preseleccionada.

Durant la creació s’introdueixen les dades pròpies de l’Item i se selecciona exactament una Subcategoria. No es pot assignar directament un Item a una Recomanació. Cada Item continua representant una unitat física individual.

Els camps propis són:

- **Nom obligatori:** s’ignoren els espais inicials i finals a efectes de validació; no pot quedar buit, ha de contenir almenys una lletra i té un màxim de 100 caràcters. Admet números i símbols juntament amb lletres i noms duplicats. Per exemple, «Body 0-3 mesos», «Pack x2» i «Manta #2» són noms vàlids; un valor només numèric o només de símbols no ho és.
- **Fotografia opcional:** com a màxim una per Item. El flux permet afegir-la, previsualitzar-la i canviar-la o eliminar-la. Si no n’hi ha, es mostra un *placeholder* neutre i coherent a tota l’aplicació, sense icones diferents segons Categoria. La V1 ha de permetre fotografies habituals de mòbil, inclosos HEIC/HEIF d’iPhone i formats web i fotogràfics habituals. La política tècnica de fotografia es defineix a [Arquitectura V1, A09](./arquitectura-v1.md#10-a09--gestió-de-fotografies-dels-items); els detalls encara oberts es recullen en aquell document.
- **Subcategoria obligatòria:** les opcions són predefinides i es mostren amb la seva Categoria. Si no es coneix la classificació correcta, es pot seleccionar **Pendent de classificar**, dins de la Categoria **Pendent de classificar**. Posteriorment es pot substituir per la correcta en editar l’Item; no es creen ni s’editen Categories o Subcategories des de la UI.

L’Usuari ha de triar explícitament exactament una situació inicial, sense cap opció preseleccionada:

- **A casa:** no es mostren camps d’adquisició ni es demana data d’entrada a casa. La preparació inicial és **no preparada**.
- **En una llista:** es demana una Llista obligatòria i les dades inicials d’adquisició descrites a continuació. Si la creació s’inicia des d’una Llista, només queda preseleccionada aquella Llista; la situació inicial requereix selecció explícita. Si falta la Llista, es pot crear amb el flux secundari de §4.1.

Si es canvia d’**En una llista** a **A casa**, es descarten les dades i el context de Llista que deixen de ser aplicables.

#### Dades inicials d’adquisició i formulari econòmic

Per crear un Item **En una llista**, són obligatoris la Llista, l’estat de comanda i el preu total. La comanda no té valor preseleccionat i permet **demanat**, **encarregat**, **a punt per recollir** i **recollit**. No hi ha selector d’estat econòmic. Registrar imports pagats o regalats no canvia automàticament l’estat de comanda; l’Usuari el modifica explícitament quan s’ha fet l’encàrrec.

Tant en crear com en actualitzar la informació econòmica mitjançant CU-19, el formulari permet introduir els tres imports:

| Camp | Significat i validació |
| --- | --- |
| Preu total | Preu complet de l’Item a la Botiga, obligatori i major que zero. |
| Quantitat regalada | Part assumida per tercers, tant si entreguen diners a l’Usuari com si paguen directament a la Botiga. Ha de ser major o igual que zero. |
| Quantitat pagada | Part assumida i ja pagada pel mateix Usuari, sense incloure imports de tercers. Ha de ser major o igual que zero. |

S’ha de complir `quantitat_regalada + quantitat_pagada <= preu_total`. Es mostra la quantitat pendent derivada (`quantitat_pendent = preu_total - quantitat_regalada - quantitat_pagada`) i l’estat **Pendent** si és major que zero o **Pagat** si és zero, sense permetre editar-los. Un regal que cobreix tot el preu dona **Pagat**, encara que la quantitat pagada pròpia sigui zero. La quantitat assumida, si és necessària, es deriva com `preu_total - quantitat_regalada`; no és un camp d’entrada.

S’apliquen les validacions *inline* i en desar de §4.2. Si el conjunt final d’imports és invàlid, no es desa i es conserven totes les dades perquè l’Usuari les corregeixi; el sistema no reajusta cap quantitat automàticament. Els errors generals mantenen el comportament persistent de §4.5. Es conserva l’estructura del formulari i el bloc d’adquisició només apareix quan correspon.

Aquestes dades corresponen a ITEM_LLISTA. Mentre l’Item encara no és físicament a casa, no es mostra preparació ni té data d’entrada a casa.

Si es tria **recollit** com a estat inicial, en desar es registren automàticament la data actual de recollida i la mateixa data d’entrada a casa. No s’obre cap pas per introduir-les. Es crea un únic Item, físicament a casa, amb preparació **no preparada** i ITEM_LLISTA conservat. El detall resultant prioritza la preparació i mostra la Llista d’origen; permet corregir una recollida errònia segons el flux de correcció de comanda.

#### Detall d’Item

És una única pantalla conceptual amb informació contextual segons la situació de l’Item.

La data de creació es registra automàticament, no és editable i no es mostra al detall en V1; és diferent de la data d’entrada a casa.

La informació comuna és:

- fotografia;
- nom;
- Categoria i Subcategoria.

Quan l’Item està associat a una Llista i encara no ha estat recollit, el detall mostra la informació necessària per gestionar-ne l’adquisició:

- Llista;
- estat de comanda;
- estat econòmic derivat (**Pendent** o **Pagat**);
- preu total;
- quantitat regalada;
- quantitat pagada pròpia;
- quantitat pendent derivada.

En aquest context permet actualitzar l’estat de comanda, actualitzar la situació econòmica, editar l’Item i eliminar-lo. No mostra l’estat de preparació mentre l’Item encara no és físicament a casa.

Quan l’Item ja és a casa, el detall se centra en la preparació. Mostra l’estat de preparació (`preparada` / `no preparada`) i la data d’entrada a casa quan l’Item prové d’una Llista i ha estat recollit. En aquest context no es mostren el preu, la quantitat regalada, la quantitat pagada, la quantitat assumida, la quantitat pendent ni la situació econòmica: aquesta informació continua pertanyent al context de la Llista i l’adquisició.

Si l’Item a casa prové d’una Llista, el detall manté visible el nom de la Llista d’origen i permet navegar al detall d’aquesta Llista. La procedència té un paper secundari respecte a les dades principals de l’Item i la seva preparació. L’Item continua associat a la Llista per preservar-ne la traçabilitat. En aquest context es permet marcar l’Item com a preparat, editar-lo i eliminar-lo. Si prové d’una Llista i és **recollit**, també es pot accedir a corregir l’estat de comanda, sense fer editables les dates ni mostrar informació econòmica al detall principal de casa.

#### Actualització i correcció de comanda

La interfície permet actualitzar l’estat de comanda entre els estats ja definits a la V1: `demanat`, `encarregat`, `a punt per recollir` i `recollit`. Mentre l’Item no ha arribat a `recollit`, permet corregir l’estat o fer-lo retrocedir entre els estats previs a la recollida per resoldre errors o incidències amb la Botiga. També es permet corregir **recollit** si s’ha registrat per error.

Per corregir una recollida registrada per error, l’Usuari selecciona explícitament **demanat**, **encarregat** o **a punt per recollir**, sense guardar ni inferir l’estat anterior. `data_recollida` i `data_entrada_casa` deixen de tenir valor; l’Item deixa de considerar-se físicament a casa, la preparació deixa de ser aplicable encara que fos **preparada**, i torna a estar pendent de recollida dins de la seva Llista. Es conserven el mateix Item, ITEM_LLISTA i la relació amb la Llista, sense crear cap Item nou. Si després torna a **recollit**, es registren de nou la data actual de recollida i la mateixa data d’entrada a casa, i la preparació torna a ser aplicable amb valor inicial **no preparada**. Les dues dates no són editables manualment: la correcció es fa mitjançant l’estat de comanda. Després de desar la correcció, el detall torna al context d’adquisició i l’Item apareix a **En llistes** i **Pendents de recollir**, en lloc d’**A casa** i **Recollits**. Les dates no s’editen des del formulari d’edició de l’Item.

#### Recollida d’un Item

En marcar l’Item com a `recollit`, el sistema registra automàticament la data actual com a data de recollida i aquesta mateixa data com a data d’entrada a casa. La interfície no demana introduir aquestes dates en el flux normal de recollida.

`Recollit` significa que l’Item ja és físicament a casa. El detall passa a mostrar la informació pròpia d’aquest context, inclosa la procedència de la Llista. Continua sent el mateix Item, associat i visible dins de la Llista; l’estat de preparació esdevé aplicable i comença com a **no preparada**. S’aplica igualment quan **recollit** és l’estat inicial de creació.

## 4. Navegació i fluxos principals

La navegació principal segueix aquesta estructura:

```text
Portada
→ Dashboard
   → Botigues
      → Detall Botiga
         → Llista associada
   → Llistes
      → Detall Llista
         → Detall Item
   → Recomanacions
      → Detall Recomanació
   → Items
      → Detall Item
```

El Dashboard centralitza l’accés a les quatre àrees. Els enllaços entre Botiga i Llista, i entre Llista i Item, permeten seguir el context ja definit en el domini. La navegació cap a un Item sempre reutilitza el mateix detall contextual.

Des del detall d’un Item a casa procedent d’una Llista, l’enllaç de procedència permet el recorregut `Detall Item → Detall Llista d’origen`, amb una jerarquia secundària respecte a la preparació.

### 4.1. Fluxos secundaris de creació

Des de Crear Item es pot iniciar Crear Llista si encara no existeix la Llista necessària. En completar-la, es retorna a Crear Item amb les dades introduïdes conservades i la nova Llista seleccionada.

Des de Crear Llista es pot iniciar Crear Botiga si encara no existeix la Botiga necessària. En completar-la, es retorna a Crear Llista amb les dades introduïdes conservades i la nova Botiga seleccionada.

El recorregut pot ser `Crear Item → Crear Llista → Crear Botiga → Crear Llista → Crear Item`. Es reutilitzen els processos existents, sense nous casos d’ús principals. Conservar les dades del formulari d’origen durant aquest recorregut no implica esborranys ni desament automàtic.

Cada creació completada és independent. Si es crea una Botiga i després es cancel·la Crear Llista, la Botiga es conserva; igualment, cancel·lar Crear Item no elimina una Llista ja creada. No es tracta d’una única operació indivisible.

### 4.2. Formularis, errors i sortida sense desar

Els formularis ocupen una sola pantalla amb scroll, sense *stepper*. Els camps s’agrupen en seccions conceptuals i els blocs condicionals es revelen progressivament. A Crear Item, les seccions són **INFORMACIÓ DE L’ITEM**, **SITUACIÓ** i, quan correspon, **ADQUISICIÓ**. En mòbil, **Cancel·lar** i **Crear** o **Desar** es mantenen accessibles en una barra inferior fixa; la convivència exacta amb la bottom navigation queda per al disseny high-fi.

Els camps es validen en perdre el focus (*blur*) i es torna a validar tot el formulari en Crear/Desar, sense mostrar errors prematurament mentre l’Usuari encara escriu. Si hi ha errors, es conserven totes les dades, es mostren tots els errors *inline* i es desplacen l’scroll i el focus al primer camp amb error. L’Usuari pot corregir-los i tornar a desar. La V1 no inclou esborranys ni desament automàtic.

En intentar abandonar un formulari sense haver-hi fet canvis, es pot sortir directament. Si hi ha canvis sense desar, es mostra un diàleg de confirmació amb el text conceptual validat **Descartar els canvis?** i **Tens canvis que encara no has desat. Si surts ara, es perdran.**, i les accions **Continuar editant** i **Descartar canvis**. Aquesta regla també s’aplica en abandonar un formulari dins dels fluxos secundaris, sense eliminar creacions ja completades.

### 4.3. Navegació responsive

En mòbil, la bottom navigation conté **Inici**, **Items**, **Llistes** i **Més**. **Inici** dona accés al Dashboard; **Més** és una pantalla pròpia, no un bottom sheet, amb accés a Recomanacions i Botigues. És una agrupació de navegació, no un nou cas d’ús.

En desktop, una sidebar permanent dona accés a les seccions principals. Es manté l’experiència completa en ambdós contextos, sense definir breakpoints concrets.

### 4.4. Filtres en mòbil

La cerca i els tabs de situació dels Items són sempre visibles. Categoria, Subcategoria i Llista, quan correspon, s’agrupen sota **Filtres**, que obre un *bottom sheet*. Els filtres secundaris s’apliquen explícitament amb **Aplicar**. **Netejar** restableix només aquests filtres secundaris; es diferencia de **Netejar filtres** de l’estat sense resultats, que també restableix situació i cerca. El control mostra el nombre de filtres secundaris actius; la cerca i el tab de situació no formen part d’aquest comptador.

### 4.5. Eliminacions i feedback

Totes les eliminacions d’entitats requereixen confirmació. En una Llista, primer es comprova la condició de §3.4. Si està bloquejada, no s’ofereix la confirmació ni s’elimina res. El missatge explica el motiu en llenguatge natural: «No es pot eliminar aquesta Llista perquè conté Items amb una adquisició ja iniciada o amb imports pagats o regalats registrats».

Si l’eliminació és permesa, abans de confirmar s’explica que s’eliminaran la Llista i tots els seus Items amb la informació d’adquisició associada, i que la Botiga es conservarà. L’eliminació de la Llista, els Items i els ITEM_LLISTA és una única operació conceptual; no s’eliminen només els Items que compleixen la condició.

Una operació correcta mostra feedback temporal no bloquejant de tipus *toast*. Els diàlegs de confirmació serveixen per prendre decisions abans d’una acció, no per comunicar-ne l’èxit posterior. Un error general d’operació mostra un missatge persistent a pantalla fins que es resolgui o es reintenti; no desapareix com un toast. Els errors de validació es mostren *inline* al camp. En tots els errors de formulari es mantenen les dades introduïdes.

### 4.6. Navegació després d’operacions d’Item

- Crear des de la secció Items porta al detall del nou Item, amb navegació per tornar al llistat d’Items.
- Crear des d’una Llista retorna a la Llista d’origen.
- Editar i desar retorna sempre al detall de l’Item, amb el toast **✓ Canvis desats**.
- Confirmar i eliminar retorna al context d’origen, Items o Llista segons correspongui, amb el toast **✓ Item eliminat**.

Després de l’operació correcta es mostra el feedback temporal corresponent.

## 5. Decisions UX

- La V1 comença en una portada de Nestly Central i no té autenticació, *login*, perfil ni gestió de comptes. La persona és l’actor dels casos d’ús; `USUARI` no és una entitat del model de domini V1.
- El Dashboard és el punt de navegació principal i només dona accés a Botigues, Llistes, Recomanacions i Items.
- La secció principal d’inventari és Items, no A casa, perquè ha d’incloure tots els Items registrats.
- La creació d’Item és un únic procés conceptual; iniciar-la des d’una Llista només en preselecciona el context.
- El detall d’Item és únic i adapta la informació i les accions a si l’Item està en una Llista o ja és a casa.
- La informació d’adquisició es prioritza mentre l’Item és en una Llista; la preparació es prioritza quan l’Item és a casa.
- El detall d’un Item a casa procedent d’una Llista mostra la Llista d’origen amb un enllaç al seu detall, com a informació secundària. No mostra preu, quantitat regalada, quantitat pagada, quantitat assumida, quantitat pendent ni situació econòmica.
- En passar a `recollit`, les dates de recollida i entrada a casa es registren automàticament amb la mateixa data actual, sense introducció manual. L’Item passa a considerar-se físicament a casa i l’estat de preparació esdevé aplicable amb valor inicial `no preparada`; no queda automàticament `preparada`.
- La interfície permet corregir els estats de comanda, inclòs un `recollit` erroni cap a un estat previ seleccionat explícitament. Aquesta correcció desfà les dates, la situació a casa i l’aplicabilitat de la preparació, conservant l’Item i el context de Llista, segons §3.6.
- No es crea cap relació visual o funcional directa entre Item i Recomanació: la cobertura depèn de la Subcategoria compartida.
- Les restriccions d’eliminació de Botigues i Llistes es respecten en les pantalles que ofereixen aquestes accions.

## 6. Traçabilitat amb els casos d’ús

| Àrea o pantalla | Accions relacionades | Casos d’ús existents |
| --- | --- | --- |
| Botigues | Crear, consultar, editar i eliminar Botiga | CU-01, CU-02, CU-03, CU-04 |
| Llistes | Crear, consultar la Llista i el resum econòmic derivat, i eliminar Llista | CU-05, CU-06, CU-07 |
| Items | Crear, consultar, editar, eliminar i marcar com a preparat | CU-08, CU-09, CU-10, CU-11, CU-12 |
| Recomanacions | Crear, consultar, editar, eliminar i consultar cobertura | CU-13, CU-14, CU-15, CU-16, CU-17 |
| Context d’adquisició de l’Item en una Llista | Consultar adquisició, actualitzar estat de comanda i situació econòmica | CU-09, CU-18, CU-19 |

La navegació entre pantalles i la preselecció d’una Llista durant la creació d’un Item no constitueixen casos d’ús nous: representen la manera d’accedir a les accions ja definides.

## 7. Wireframes

Els 38 wireframes low-fi inicials de la V1 van ser completats i revisats. La revisió va generar decisions UI/UX addicionals, posteriorment consolidades en aquest document. Els PDFs exportats formen part de la documentació del projecte i es conserven com a artefactes vàlids de la primera iteració a [Wireframes low-fi](./wireframes_low_fi/). No s’han regenerat després de totes les decisions i, per tant, no representen necessàriament el disseny actual complet. En cas de discrepància, aquest document és la font de veritat de les decisions UI/UX validades.

Una futura iteració V2 dels wireframes és opcional: es decidirà més endavant si aporta valor abans de la implementació. No és un prerequisit per iniciar Arquitectura ni es registra com a deute tècnic.

### 7.1. Impacte de les decisions posteriors

La revisió dels PDFs distingeix **A — conceptualment vàlid**, **B — retoc** de navegació, anotacions, feedback o detalls, i **C — revisió important** de l’estructura o el comportament representat. Aquesta classificació orienta una eventual V2; no descarta els artefactes ni obliga a refer-los. Les referències D01–D42 corresponen a la checklist de decisions validades utilitzada per a aquesta revisió; les regles estan integrades als apartats anteriors.

**A:** G01 · Nestly Central conserva el flux d’entrada. **B:** B01–B07, G02, I04–I13, L01–L02, L04–L07 i R02–R06 mantenen la base conceptual amb retocs. **C:** G03, G04, I01, I02, I03, L03, R01 i R07 requereixen una revisió més important. En total: 1 A, 29 B i 8 C, tenint en compte també l’adaptació transversal de navegació i responsive.

| Artefactes amb revisió important | Impacte verificat al PDF i decisions relacionades |
| --- | --- |
| [G03 · Guia de revisió i fluxos](<./wireframes_low_fi/G03 · Guia de revisió i fluxos.pdf>) | Presenta convencions com a propostes pendents i resumeix «Desar → detall» sense distingir la creació des de Llista. Cal reflectir navegació responsive, retorn contextual i sortida amb canvis: D24–D26, D37–D40, D42. |
| [G04 · Decisions pendents i coherència documental](<./wireframes_low_fi/G04 · Decisions pendents i coherència documental.pdf>) | Manté filtres, fotografia, cobertura textual, confirmacions, estats buits i responsive com a pendents o propostes. Les quatre qüestions funcionals han quedat resoltes; només continuen diferides les decisions visuals i tècniques de §9. Referències: D01–D11, D15–D17, D24–D30. |
| [I01 · Items](<./wireframes_low_fi/I01 · Items.pdf>) | Utilitza un selector de situació, sense cerca ni filtre de Llista, i les targetes no mostren preparació o comanda. Cal incorporar tabs, consulta combinada i ordenació, estats contextuals i distribució responsive: D01–D08, D27–D31, D41. La distinció entre Items a casa i pendents de recollir ja és correcta. |
| [I02 · Crear Item](<./wireframes_low_fi/I02 · Crear Item.pdf>) i [I03 · Crear Item des d’una Llista](<./wireframes_low_fi/I03 · Crear Item · des d’una Llista.pdf>) | No representen el bloc complet d’adquisició ni els tres imports del model econòmic actual de §3.6. Cal completar fotografia, seccions, validació, accions i retorn: D15–D16, D32–D38, D42. A més, I03 dibuixa la situació de Llista seleccionada: segons §3.6 i CU-08, només la Llista queda preseleccionada i la situació requereix una tria explícita. |
| [L03 · Detall de Llista](<./wireframes_low_fi/L03 · Detall de Llista.pdf>) | Les targetes ja inclouen fotografia, nom, classificació, comanda i accés al detall, però falta l’estat econòmic derivat. No hi ha els dos grups visuals ni s’explicita l’ordre per creació: D12–D14. El PDF representa el bloqueig amb Items recollits, però cal ampliar-lo als altres motius de bloqueig de §3.4 i §4.5. |
| [R01 · Recomanacions](<./wireframes_low_fi/R01 · Recomanacions.pdf>) | Les targetes de cobertura són textuals i alternen Categories sense agrupar-les. Cal representar barra, recompte, desglossament i excés neutral, agrupats per Categoria → Subcategoria: D17–D19, D21, D23. |
| [R07 · Cobertura · variants de consulta](<./wireframes_low_fi/R07 · Cobertura · variants de consulta.pdf>) | L’anotació descarta explícitament la barra i no apareix el desglossament per situació. Cal substituir aquesta proposta per barra plena en l’excés, valor numèric i text neutral: D17–D19, D21. |

Els retocs transversals afecten la navegació superior dels PDFs de pantalla, que encara no representa la bottom navigation, la pantalla Més ni la sidebar permanent (D24–D26, D40). Els formularis necessiten reflectir validació, feedback i sortida amb canvis segons D10–D11, D34–D36 i D42. No tots aquests comportaments es poden deduir d’un PDF estàtic.

Retocs específics amb traçabilitat útil:

- **B07, I10, L07 i R06:** les confirmacions ja estan dibuixades; les anotacions que encara les tracten com a propostes s’han de llegir segons D09. El feedback posterior és un toast (D10), amb retorn i missatge d’eliminació d’Item segons D39. A L07, la condició històrica basada només en la recollida queda substituïda per §4.5: també bloquegen l’adquisició iniciada i els imports pagats o regalats. El PDF es conserva sense modificar.
- **I07:** completar previsualització/eliminació de fotografia i feedback d’edició (D15–D16, D38); les dates no són editables manualment; la recollida errònia es corregeix mitjançant l’estat de comanda, segons §3.6.
- **I04 i I09:** la representació econòmica històrica queda superada pel model de §3.6: tres imports acumulats, inclosa la quantitat regalada, pendent calculat restant tots dos imports i estat derivat. I09 ja no ha d’oferir un selector de situació econòmica; aquesta actualització substitueix la part econòmica de D32. Els PDFs es conserven sense modificar.
- **I11–I13:** feedback temporal de preparació, reinici complet de la consulta sense resultats i comportament d’errors/validació (D08, D10–D11, D35–D36). I13, L02 i L06 també s’han de contrastar amb els fluxos secundaris ja validats de §4.1, amb retorn i conservació de dades.
- **R03:** afegir barra i desglossament al detall de cobertura (D17–D19); R05 ja representa l’estat buit amb creació de Recomanació (D22).
- **I05 i I11** ja mostren la Llista d’origen; **I08** ja indica dates automàtiques coincidents. A I08, l’anotació que impedeix tornar enrere des de recollit ha quedat superada per la correcció explícita amb reversió de les conseqüències de recollida; §3.6 i CU-18 són la referència. A I06, la data d’entrada directa ja no és una qüestió oberta: no es demana, segons §3.6.

## 8. Prototip

Encara no s’ha creat cap prototip. La decisió sobre un prototip interactiu definitiu queda diferida; si es crea, haurà de partir de les decisions consolidades en aquest document, sense introduir funcionalitats, regles de negoci ni decisions tècniques noves.

## 9. Decisions pendents

Continuen pendents:

- la paleta de colors definitiva;
- les tipografies definitives;
- els detalls del *design system*;
- els detalls visuals i high-fi, inclosa la convivència de la barra d’accions dels formularis amb la bottom navigation i els breakpoints concrets.

Els filtres, la cerca, la cobertura, els estats buits, el feedback, els formularis, la navegació responsive i el flux de fotografia descrits en aquest document ja són decisions validades.

Les decisions visuals pendents no modifiquen els requisits, el model de domini ni els casos d’ús validats.

Les quatre qüestions funcionals de la revisió han quedat resoltes: validació de Botiga i Llista (§3.3–§3.4), quantitat recomanada estrictament positiva i Subcategoria fixa de Recomanació (§3.5), i correcció d’una recollida errònia mitjançant l’estat de comanda, sense edició manual de dates (§3.6). No s’ha identificat cap altra decisió funcional pendent necessària per tancar UI/UX V1.

La política d’emmagatzematge, validació, límit de mida, normalització i gestió de fotografies queda resolta a [Arquitectura V1, A09](./arquitectura-v1.md#10-a09--gestió-de-fotografies-dels-items). Continuen pendents la llibreria de processament, el format final, la resolució i la qualitat/compressió exactes, segons aquell document. També queda diferida la representació tècnica de `data_creacio`, sense triar ara entre date, datetime o timestamp. La possible V2 i el prototip mantenen l’estat descrit a §7–§8.
