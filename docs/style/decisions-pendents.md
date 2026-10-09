# Decisions pendents — Design System v0.1

**Estat:** registre dels punts oberts després del tancament documental v0.1 a 1H. **Data:** 9 d’octubre de 2026.

Complementa la [Guia d’estils v0.1](./design-system-v0.1.md). 1H aprova explícitament la direcció visual i els patrons documentats, inclosa la correcció 1G.1; no aprova automàticament els HEX definitius ni les variants no validades. La revisió d’aquesta documentació no autoritza M1.3 ni la incorporació al frontend.

## 1. Direcció confirmada i decisions obertes

**H — Decisió humana, 9/10/2026, Design Lab 1E:** la persona responsable del projecte escull **B — Editorial expressiva** com a direcció general dels components i formularis, després de comparar [les alternatives de 1D](./exploracio-components-1d.html). Evidència: petició humana de 1E a la conversa. Es confirma jerarquia editorial, agrupaments intencionats i ràdios en targetes quan sigui adequat; no s’aproven automàticament mides, HEX, variants ni el Design System complet. Aquesta decisió no selecciona cap estil d’il·lustració.

**H — Decisió humana, 9/10/2026, Design Lab 1G:** la mateixa persona escull **B — Orgànica contemporània** de [1F](./exploracio-targetes-1f.html) per a les targetes d’Items i Recomanacions. Evidència: petició humana de 1G a la conversa. Direccions confirmades: formularis editorials + targetes orgàniques, dins de Tendresa sofisticada. Continuen oberts els detalls; no és aprovació definitiva del Design System ni de cap família d’il·lustracions.

**H — Tancament 1H, 9/10/2026:** la persona responsable aprova el resultat visual corregit de 1G.1 i autoritza el tancament documental i la preparació de la integració de v0.1. Es confirmen Tendresa sofisticada, Sorra i malva + Mel i rosa antic, Newsreader + Source Sans 3, formularis B de 1D i targetes B de 1F amb correcció 1G.1. Evidència: petició humana «Design Lab 1H» a la conversa. L’aprovació no inclou il·lustracions definitives ni certificació del frontend. 1G inicial va ser rebutjada: no és la referència vigent.

| ID | Preferència o antecedent | Decisió pendent i evidència necessària |
| --- | --- | --- |
| DS-01 | Tendresa sofisticada, madura i càlida | Direcció i composició de referència aprovades a 1H. Validar-ne l’aplicació amb dades reals perquè no sembli genèrica, infantil o excessivament monocromàtica. Valorar més d’una pantalla, sense inventar funcionalitats. |
| DS-02 | Base Sorra i malva | Aprovar o ajustar HEX de fons, superfície, textos i acció. El secundari sobre Sorra té 4,67:1: no reduir-ne opacitat; validar lectura real. |
| DS-03 | Accents Mel i rosa antic | Resolució tècnica: `#B58D9C` decoratiu, `--color-text-accent: #8A596C` funcional; 5,32:1 sobre superfície i 4,61:1 sobre Sorra. La variant no necessita ajust. Distribució de referència aprovada a 1H; pendents HEX definitius i ús en altres pantalles. Mel només amb text principal (5,41:1). No usar rosa funcional, text secundari ni controls sobre els accents clars. |
| DS-04 | Vora i error candidats heretats de 1C | Validar `#8E7885` i `#8C3949`, els candidats hover/pressionat i els alias de focus/desactivat. Revisar totes les superfícies i combinacions d’estats, no només HEX aïllats. |
| DS-05 | Newsreader + Source Sans 3 | Famílies i ús editorial/funcional aprovats; validar escala, pesos i interlineats en el frontend. Provar català, zoom, imports, labels llargs, fallback i font loading. Decidir allotjament, fitxers i llicències; no instal·lats. |
| DS-06 | Ritme i agrupaments de B confirmats com a direcció | Validar padding 16/24 px, separació de 24 px, amplades, radis i densitat. La guia agrupa Quantitat/preparació i evita una targeta extra d’accions per reduir altura respecte a 1D. No són mides aprovades. |
| DS-07 | Primari malva i secundari neutre | Completar i revisar normal, hover, pressió, focus, càrrega, desactivat i acció destructiva, també amb teclat. Les variants descrites són candidates. |
| DS-08 | B: títols editorials i ràdios en targetes quan ajuden | Validar escala 24/26 px de secció, labels/ajudes, densitat i combinacions selected/focus/disabled/error; no canviar classificació dependent ni validació. Les targetes no substitueixen ràdios natius. |
| DS-09 | B orgànica de 1F corregida a 1G.1 i aprovada a 1H | Composició, capçaleres Mel, jerarquia d’unitats i magnitud editorial aprovades; validar radis candidats 28/20 px, densitat amb grups grans i múltiples Recomanacions, focus del desplegable i detalls individuals reals. Capçalera neutra, unitats independents, placeholders comuns i cobertura separada. Provar targetes de Llista abans d’estendre-hi detalls del patró. |
| DS-10 | Navegació V1 validada | Validar breakpoint, sidebar, bottom navigation i dues franges accions/navegació. Provar scroll, safe areas, focus i teclat virtual. 1C només les representa, no valida barra fixa real. |
| DS-11 | Feedback funcional V1 validat | Aparença i durada dels toasts, anunci accessible de càrrega/èxit, errors persistents, estats buits i variants de confirmació. No confondre buit, càrrega i error ni substituir confirmació per toast. |
| DS-12 | Sense estil ni assets d’il·lustració aprovats | Decidir volum i textura: 1C A és més llisa i B més material; totes dues conserven volum. Revisar si cal més presència en mòbil o menys aparença de catàleg. Aprovar un llenguatge coherent abans de generar família de recursos. |
| DS-13 | Iconografia sense selecció definitiva | Escollir família, mides, traç, variants i llicència. L’ús d’icones de mostra a 1C no aprova cap paquet. |
| DS-14 | Criteris d’accessibilitat de treball | Revisió real de contrastos, teclat, lector de pantalla, text 200%, reflow a 320 CSS px, zoom i targets. No hi ha declaració de conformitat WCAG. |
| DS-15 | React/TypeScript i arquitectura A10 | Decidir com incorporar només els valors i peces aprovats quan s’autoritzi implementació. Sense biblioteca externa, abstraccions ni dependències preventives. |

## 2. Discrepàncies i límits de les fonts actuals

| ID | Evidència | Tractament en aquesta tasca |
| --- | --- | --- |
| DOC-01 | [AGENTS.md](../../AGENTS.md), «Estat actual», encara diu que M1 no s’ha iniciat. [Arquitectura V1](../arquitectura-v1.md), introducció i coherència, també conserva M1 com a següent fita. | El context humà actual confirma M1.2 integrada a main; la guia no retrocedeix l’estat ni actualitza aquests fitxers. Registrar una futura correcció documental separada. |
| DOC-02 | [Pla d’implementació](../pla-implementacio-v1.md), §4.4.1 i conclusió, encara presenta M1.2 pendent d’integració. El HEAD de partida d’aquesta tasca és `7819bd1`, merge de M1.2 segons el context humà de PR #2 (`7819bd19e1164f4fbd9342c5aa769ec986422119`). | Estat temporal desactualitzat. Cap d’aquests enunciats autoritza M1.3. Actualitzar l’estat només en una tasca posterior amb abast autoritzat. |
| DOC-03 | [UI/UX V1](../disseny-ui-ux-v1.md), §§2 i 9, manté obertes paleta, fonts i Design System; §8 diu que encara no s’ha creat prototip. Ara hi ha exploracions locals i antecedents Figma a la conversa. | La direcció i els patrons v0.1 ara estan aprovats a 1H; el document UI/UX encara no en registra el tancament. Actualitzar aquesta referència en una tasca posterior amb abast autoritzat, distingint exploració, guia v0.1 i prototip definitiu. El tancament parcial no aprova il·lustracions, tokens definitius ni accessibilitat real. |
| DOC-04 | Els wireframes antics no incorporen totes les correccions; UI/UX §7 ho explicita. | Preval el Markdown funcional. No importar seleccions, camps, retorns o navegació antics com a decisions actuals. |
| LAB-01 | Les fases 1B/1C no estan versionades com a especificacions al repositori. 1C utilitza catàleg parcial, accions/navegació de mostra i no inclou fotografia. | La guia recull conclusions, no assets ni comportament executable. No usar els prototips locals com a font de dades del catàleg o com a substitut de RF-01/RF-32. |
| LAB-02 | Mel i rosa antic es van incorporar després de 1C. 1D els aplica a components A/B, i la persona usuària escull B a 1E. | Direcció general confirmada; distribució exacta i HEX encara oberts. No presentar la selecció de B com a aprovació de totes les combinacions. |

## 3. Resolucions tècniques i catàleg visual

**Antecedent — Consolidació 1G, posteriorment rebutjada visualment:** controls 8 px, blocs de formulari 16 px, targetes orgàniques 28 px i zones internes 20 px; cap color nou. Barra contínua, valors i missatge de cobertura; desplegable d’Items natiu en el catàleg. Estats buits comparteixen el radius orgànic; navegació, botons i feedback conserven els tractaments funcionals. Ajusts descrits a la guia tècnica §7; mides exactes i distribució encara provisionals. Les exploracions 1D/1F es conserven.

**T — Verificació 1G, 9/10/2026:** Chrome/Playwright amb 320/375/430/768/1280/1440 px i text al 200% en cadascuna, sense desbordament. Textos llargs, contrast del text, labels/ajudes/IDs, focus, desplegable amb Espai/Enter, ràdios amb fletxes i accions amb Tab comprovats. El revisor independent va considerar concordants MD/HTML i viable el CSS, però la seva valoració de fidelitat va ser contradita per la revisió humana de 1G.1; ha revisat captures de detall i organització general sense detectar problemes bloquejants. Les captures completes són molt llargues i el visor les redueix: no acrediten per si soles llegibilitat de tots els textos.

**P — Després de 1H:** aprovació global dels HEX i mides; densitat amb grups grans/múltiples Recomanacions; variants i estats combinats; iconografia, il·lustracions i fonts definitives; lector de pantalla, zoom real, barres fixes, teclat virtual i fluxos complets al frontend. La selecció de direccions B no tanca aquests punts ni autoritza M1.3.

**T — Comprovat matemàticament:** contrast de textos, botons normal/hover/pressionat, enllaços, focus, errors, vores, selecció i gràfics funcionals sobre els fons neutres. La taula de la guia registra també combinacions prohibides. Es conserven els colors d’accent originals; la variant rosa funcional és un candidat separat. El focus sobre el botó primari requereix separació neutra i espai exterior. Les vores subtils són decoratives.

**T/P — Mostra:** [guia-visual.html](./guia-visual.html), catàleg estàtic responsive que es pot obrir directament. Representa estats, superfícies i composició, sense routing, enviament de dades ni validació funcional. Les fonts web necessiten connexió; Georgia/system-ui són els fallbacks. No acredita WCAG de Nestly ni validació del seu frontend.

**H — Revisió humana 1H:** direcció visual, distribució de referència i patrons corregits aprovats. **P:** HEX definitius de la variant funcional, pesos/mides exactes per al producte, densitat amb dades reals i variants d’estats no mostrades. Els IDs DS-01 a DS-15 conserven els punts específics oberts de la taula, no una aprovació global pendent de la mateixa mostra. Il·lustracions i iconografia encara sense recursos finals.

**T/P — Consolidació 1E:** el catàleg complet adopta B en seccions, formularis, ràdios, errors i targetes, conservant paleta, tipografia, navegació, feedback i exemples responsive. Ajustos d’usabilitat: dos blocs de registre en lloc de tres; accions amb separador; camps aparellats només si hi caben; sense ornament repetit ni contenidor exterior niat. [L’exploració 1D](./exploracio-components-1d.html) es conserva sense canvis.

**T — Comprovacions 1E, 9/10/2026:** Chrome/Playwright, obertura local directa, fonts carregades, amplades 320/390/768/1024/1440 px sense desbordament; text al 200% a 320/390 px i títol/error llargs sense desbordament. No s’han detectat fallades de contrast de text renderitzat, controls sense label, IDs duplicats ni referències d’ajuda inexistents. Provats fletxes dels ràdios, Tab cap a Cancel·lar, focus de targeta, focus separat de l’error i pressió del secundari amb Espai. Això no verifica lector de pantalla ni zoom real del navegador; les proves del frontend real continuen pendents a DS-10/14.

**Revisió independent en lectura, 1E:** el subagent no ha trobat problemes objectius bloquejants entre Markdown/HTML, colors, semàntica o fidelitat a B. També ha revisat captures de controls mòbil/desktop i targetes: sense retalls ni solapaments visibles. Observació estètica pendent: revisar si les ajudes dels ràdios repeteixen massa el label i si l’altura mòbil es pot reduir amb contingut real. Cap recomanació estètica s’ha tractat com a aprovació humana.

Revisió puntual en lectura del subagent: contrastos i tokens coherents, sense funcionalitats inventades. Correccions acceptades: impedir que el secundari hereti el fons pressionat primari amb teclat (hauria donat 1,11:1), i fixar a 500 el títol editorial de targeta, d’acord amb el pes carregat. La revisió estètica continua sent humana.

Comprovacions locals del catàleg amb Chrome: obertura directa `file://`, fonts Newsreader/Source Sans 3 carregades, encaix a 320/390/768/1024/1440 CSS px, focus de 3 px separat 3 px i activació amb Espai del secundari amb text principal sobre superfície. S’han corregit els desbordaments de títols i mostres d’espai en ampliar text al 200%. No s’han validat lector de pantalla, zoom real del navegador, teclat virtual ni fluxos de Nestly.

**H/T — Correcció 1G.1 i tancament 1H:** recuperades les capçaleres Mel independents, nom editorial més expressiu, número d’unitat secundari, espai per a preparació, títol interior «Cobertura», magnitud protagonista i altures independents. Eliminades llegendes repetides dels placeholders; dades i regles intactes. El revisor va inspeccionar sis captures i va considerar alta la fidelitat a B i clara la diferència de jerarquia, amb més altura com a contrapartida. La valoració estètica va quedar subordinada a l’aprovació humana posterior de 1H.

**T — Comprovacions finals 1H:** mateixa composició visual aprovada; contrast de text mínim de les targetes 4,67:1, barra/Sorra 5,69:1 i vora/Sorra 3,32:1. Catàleg responsive, text 200%, focus i teclat comprovats localment amb Chrome/Playwright. Reflow equivalent a zoom 200% comprovat; zoom real, lector de pantalla i frontend pendents. Enllaços locals i tokens comprovats; captures i informes fora del repositori.

## 4. Com validar sense ampliar l’abast

La revisió visual de la referència queda tancada a 1H. Prioritzar els punts tècnics oberts DS-02/03/05/12. Després, només amb autorització, aplicar les decisions seleccionades a mostres visuals de components i pantalles reals; revisar normal i errors amb el mateix contingut. Mantenir la separació entre aprovació estètica, comprovació d’accessibilitat i autorització d’implementació.

En registrar una aprovació futura, indicar ID, valor o criteri acceptat, persona que decideix, data i evidència. Les direccions B i els patrons corregits estan aprovats a 1H; els IDs mantenen els detalls oberts especificats a la taula. Les referències tècniques i els contrastos són evidències, no aprovacions globals.

No es crea `assets/`: no hi ha recursos finals aprovats a guardar. La verificació de llicències i procedència es farà abans d’incorporar fonts, il·lustracions o icones reals. Els criteris d’il·lustració no autoritzen generar una nova família d’assets.
