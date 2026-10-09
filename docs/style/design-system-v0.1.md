# Guia d’estils — Design System v0.1 de Nestly

**Estat:** v0.1 tancada documentalment; direcció visual i patrons aprovats a Design Lab 1H. **Data:** 9 d’octubre de 2026.

La guia documenta la direcció visual i els patrons aprovats per la persona responsable del projecte a Design Lab 1H, després de revisar la correcció 1G.1. És la base documental v0.1 per preparar la integració; no tanca les decisions tècniques pendents, no aprova il·lustracions definitives, no certifica accessibilitat ni acredita implementació. No autoritza M1.3. Els fragments CSS són exemples dins d’aquest document; no s’han incorporat al frontend.

## 1. Fonts, estat de les decisions i principis

Fonts funcionals: [AGENTS.md](../../AGENTS.md), [UI/UX V1](../disseny-ui-ux-v1.md), [Requisits V1](../requisits-v1.md) i [Arquitectura V1](../arquitectura-v1.md), especialment A10 i A12. Les decisions funcionals d’aquests documents prevalen sobre les exploracions visuals i els wireframes antics.

Les fases 1B i 1C estan disponibles a la conversa del Design Lab, amb moodboards i composicions locals provisionals. No són una especificació aprovada ni una biblioteca reutilitzable. Aquesta guia recull les conclusions útils; no incorpora els assets generats ni depèn dels fitxers locals de la conversa.

| Marca | Significat |
| --- | --- |
| **H — Preferència humana confirmada** | Direcció expressada per la persona usuària per continuar el treball; no aprova tots els seus detalls. |
| **T — Valor tècnic proposat** | Candidat concret, amb justificació i, quan és possible, comprovació matemàtica. |
| **P — Pendent de validació** | Requereix revisió visual, proves reals o una decisió humana explícita. |

**H:** concepte «Tendresa sofisticada»; personalitat càlida, afectuosa i acollidora, elegant i madura amb un toc infantil subtil; Newsreader per a títols i Source Sans 3 per al contingut funcional; base Sorra i malva amb accents Mel i rosa antic. La direcció i els patrons mostrats estan aprovats per a v0.1; els HEX definitius, les variants no mostrades, la iconografia i l’estil d’il·lustració continuen pendents.

### 1.1. Direcció dels components seleccionada a 1E

**H — Decisió humana del 9/10/2026:** la persona responsable del projecte ha escollit **B — Editorial expressiva**, després de comparar el [Design Lab 1D](./exploracio-components-1d.html). S’incorporen com a direcció general la jerarquia editorial, els agrupaments intencionats, el ritme vertical i els ràdios en targetes quan ajuden a triar. Això no aprova automàticament HEX, mides, ornaments, variants ni el Design System complet.

**T — Adaptació al catàleg:** conservar títols Newsreader 500 i controls Source Sans 3; agrupar per informació relacionada; usar Mel en petites marques editorials amb text principal i rosa clar només com a accent decoratiu puntual. Evitar posar una targeta exterior al voltant de blocs que ja tenen superfície. En la mostra de registre, Quantitat i preparació comparteixen bloc: redueix altura i repetició respecte als tres contenidors de B a 1D. La franja d’accions usa un separador, sense una quarta targeta. No es canvia cap camp ni ordre funcional.

**P:** validar densitat, longitud dels formularis, mides exactes i combinacions d’estats en pantalles reals. La B dels components no decideix entre les variants A/B d’il·lustració de 1C. L’exploració 1D es conserva intacta com a registre històric.

**H — Decisió humana a 1G, 9/10/2026:** **B — Orgànica contemporània** del [Design Lab 1F](./exploracio-targetes-1f.html) és la direcció preferida per a targetes d’Items i Recomanacions. Conviu amb B — Editorial expressiva de 1D per a formularis. Cap de les dues seleccions aprova tots els tokens, variants o il·lustracions. Les exploracions 1D/1F es conserven intactes.

**H — Tancament 1H, 9/10/2026:** aprovació humana explícita del resultat corregit de 1G.1, de Tendresa sofisticada, Sorra i malva + Mel i rosa antic, Newsreader + Source Sans 3, formularis B — Editorial expressiva de 1D i targetes B — Orgànica contemporània de 1F amb correcció 1G.1. Evidència: petició «Design Lab 1H» a la conversa. El resultat inicial de 1G va ser rebutjat; la guia HTML actual és la referència visual aprovada. Les exploracions 1D/1F són registre històric, no alternatives vigents. L’aprovació dels patrons no converteix tots els valors T/P en tokens definitius.

Principi conjunt: Newsreader per construir jerarquia, Source Sans 3 per llegir i operar; superfícies neutres suaus per contenir informació, accents puntuals sense significat de negoci. Controls compactes i identificables; targetes més arrodonides, sense estendre aquesta geometria a tots els components. No transformar navegació, feedback o camps que ja funcionen en noves composicions decoratives.

Principis d’aplicació:

- Prioritzar la lectura, les accions i l’organització dels preparatius. L’expressivitat editorial acompanya aquesta feina.
- Reservar el gest infantil subtil als materials, al color i als possibles motius; evitar mascotes caricaturesques i llenguatge infantilitzat.
- Donar presència cromàtica a capçaleres, separadors decoratius o blocs editorials, mantenint netes les zones funcionals. Evitar tant la monocromia total com repetir ornaments en cada control.
- Fer servir espai, tipografia i agrupació per construir jerarquia; el color no substitueix labels ni estats.
- Mantenir una guia petita i implementable. A10 no autoritza abstraccions preventives ni una biblioteca de components externa per disposar d’aquesta documentació.

## 2. Paleta i tokens semàntics proposats

**H:** les famílies cromàtiques. **T/P:** tots els valors següents, els seus noms i la distribució visual. Els noms estan preparats per a CSS custom properties; descriuen funció, no una entitat de domini.

| Token proposat | Valor | Ús i límits |
| --- | --- | --- |
| `--color-background` | `#F0E7DD` | Fons Sorra del shell. |
| `--color-surface` | `#FBF8F4` | Formularis, targetes i controls. |
| `--color-text-primary` | `#49383F` | Text principal i labels. |
| `--color-text-secondary` | `#75616B` | Ajuda i metadades sobre Sorra o superfície; sense reduir opacitat. |
| `--color-action-primary` | `#695363` | Acció principal i indicador actiu sobre fons neutres. |
| `--color-on-action` | `#FBF8F4` | Text sobre acció primària. |
| `--color-action-hover` | `#5C4857` | Candidat més fosc per hover primari. |
| `--color-action-pressed` | `#503E4C` | Candidat per estat pressionat. |
| `--color-accent-honey` | `#D7B16D` | Mel: accent editorial, amb text principal si cal. No és un estat d’advertència. |
| `--color-accent-old-rose` | `#B58D9C` | Rosa antic: decoració; evitar text funcional superposat. No és un error. |
| `--color-text-accent` | `#8A596C` | Rosa antic funcional: text normal sobre Sorra o superfície, sempre opac. No és un error. |
| `--color-link` | `var(--color-text-accent)` | Enllaços subratllats sobre Sorra o superfície; el subratllat els diferencia del text. |
| `--color-selected-indicator` | `var(--color-action-primary)` | Marca, vora o indicador seleccionat sobre Sorra o superfície, amb senyal addicional al color. |
| `--color-graphic-functional` | `var(--color-action-primary)` | Icones i barres informatives sobre Sorra o superfície. |
| `--color-border-control` | `#8E7885` | Vores necessàries per identificar controls. |
| `--color-border-subtle` | `#DBC5AD` | Separadors decoratius i contenidors que ja s’identifiquen per estructura; heretat de 1C, pendent de confirmar. No usar com a única vora d’un input. |
| `--color-focus-ring` | `var(--color-action-primary)` | Anell de focus sobre Sorra o superfície; sobre altres fons cal recalcular. |
| `--color-error` | `#8C3949` | Text i vora d’error; candidat heretat de 1C. |
| `--color-success-text` | `var(--color-text-primary)` | Èxit amb text i icona, sense imposar un nou verd a la paleta. |
| `--color-surface-disabled` | `var(--color-background)` | Control desactivat sobre una superfície. |
| `--color-text-disabled` | `var(--color-text-secondary)` | Label llegible; estat també expressat semànticament. |

No s’assignen colors de marca als estats de negoci «Preparat», «Pagat» o «Recollit». La seva representació ha de conservar les etiquetes documentades i no confondre estat de preparació, comanda i economia.

### 2.1. Evidències de contrast

**T:** càlcul del 9/10/2026 sobre HEX sRGB opacs. Luminància relativa amb pesos 0,2126/0,7152/0,0722, linealització sRGB i relació `(Lclara + 0,05) / (Lfosca + 0,05)`. Es mostren dos decimals, però els llindars es comparen amb el valor sense arrodonir. No és una auditoria de la interfície real.

| Parella | Contrast | Conseqüència |
| --- | --- | --- |
| Text principal / superfície | 10,33:1 | Adequat per a text normal. |
| Text principal / Sorra | 8,94:1 | Adequat per a capçaleres i contingut. |
| Text secundari / superfície | 5,39:1 | Adequat per a text normal. |
| Text secundari / Sorra | 4,67:1 | Passa 4,5:1 amb marge reduït; no afegir transparència. |
| Text del botó / acció principal | 6,57:1 | Adequat per a labels normals. |
| Text del botó / hover / pressionat | 7,87:1 / 9,29:1 | Els dos candidats mantenen la lectura. |
| Vora funcional / superfície / Sorra | 3,83:1 / 3,32:1 | Adequada per delimitar controls sobre aquests fons. |
| Focus / superfície / Sorra | 6,57:1 / 5,69:1 | Adequat sobre aquestes superfícies; geometria i visibilitat pendents de provar. |
| Error / superfície / Sorra | 7,09:1 / 6,14:1 | Adequat per a missatges i vores d’error. |
| Text principal / Mel | 5,41:1 | Pot usar-se en un bloc editorial amb text normal. |
| Mel / superfície | 1,91:1 | No usar com a text, anell o única vora funcional. |
| Text principal / Rosa antic | 3,78:1 | Insuficient per a text normal; es restringeix a decoració en aquesta v0.1. |
| Rosa antic / superfície | 2,73:1 | Insuficient com a únic indicador funcional de 3:1. |
| Rosa antic decoratiu / Sorra | 2,37:1 | També insuficient per a text gran i elements funcionals. |
| Rosa antic funcional / superfície / Sorra | 5,32:1 / 4,61:1 | Passa text normal, sense transparència; sobre Sorra el marge és reduït. |
| Indicador seleccionat o gràfic funcional / superfície / Sorra | 6,57:1 / 5,69:1 | Passa 3:1 sobre aquestes superfícies. |
| Mel / Sorra | 1,65:1 | Només decoratiu, no delimita controls ni selecció. |
| Vora subtil / superfície / Sorra | 1,57:1 / 1,36:1 | Només separador decoratiu; no identifica controls. |
| Rosa antic funcional / Mel / rosa decoratiu | 2,79:1 / 1,95:1 | No usar per a text ni gràfics funcionals en aquests fons. |
| Text secundari / Mel / rosa decoratiu | 2,83:1 / 1,97:1 | No usar per a text en aquests fons. |
| Acció malva / Mel / rosa decoratiu | 3,45:1 / 2,40:1 | No serveix per a text normal sobre cap dels dos; sobre rosa tampoc per a gràfics. |
| Vora funcional / Mel / rosa decoratiu | 2,01:1 / 1,40:1 | No delimita controls sobre aquests accents. |
| Error / Mel / rosa decoratiu | 3,72:1 / 2,59:1 | No usar missatges normals en aquests fons; sobre rosa també falla 3:1. |

### 2.2. Rosa decoratiu i funcional: resolució tècnica provisional

**H:** conservar la família rosa antic. **T:** mantenir `#B58D9C` com a accent decoratiu i afegir `#8A596C` per a text i enllaços funcionals. La variant proposada passa 4,5:1 en els dos fons neutres sense ajustar el HEX: valors calculats 5,323228:1 i 4,610528:1, respectivament; la comparació usa tota la precisió del càlcul. **P:** aprovació visual de la variant i de la seva distribució. Una comprovació de contrast no és una aprovació de marca.

Usos permesos: rosa original en ornaments sense significat funcional; rosa funcional en text i enllaços subratllats sobre Sorra o superfície. Evitar rosa original en labels, placeholders, errors, focus, vores de controls, marques seleccionades o icones informatives. No aplicar transparència al rosa funcional ni al text secundari sobre Sorra.

Els controls, les marques seleccionades, els gràfics informatius i els errors es col·loquen sobre Sorra o superfície. En blocs Mel, només text principal: 5,41:1. No superposar controls ni focus a Mel o rosa decoratiu en aquesta proposta. L’anell malva d’un botó malva necessita la separació neutra de 3 px: tocant el mateix color tindria 1:1. Cal deixar espai exterior i evitar retallar l’anell. Les icones dins del botó poden usar `--color-on-action`, amb els mateixos contrastos del label.

El botó secundari usa text principal i vora funcional sobre superfície; en hover, sobre Sorra (8,94:1 i 3,32:1). El desactivat conserva text secundari sobre Sorra (4,67:1), sense opacitat global; els components inactius tenen excepció WCAG, però es prioritza llegibilitat. No es proposen botons Mel o rosa: requeririen una parella i uns estats específics. Els percentatges d’ús de color continuen oberts.

## 3. Tipografia

**H:** Newsreader editorial i Source Sans 3 funcional. **T/P:** pesos, escala i interlineats.

| Token | Valor proposat | Ús |
| --- | --- | --- |
| `--font-family-editorial` | `"Newsreader", Georgia, serif` | Títols i peces editorials. |
| `--font-family-functional` | `"Source Sans 3", system-ui, sans-serif` | Text, camps, botons, labels i navegació. |
| `--font-weight-regular` | `400` | Text i valors. |
| `--font-weight-medium` | `500` | Títols editorials. |
| `--font-weight-semibold` | `600` | Labels, botons i seccions funcionals. |
| `--font-size-small` | `0.875rem` | Ajuda i metadades: 14 px amb arrel de 16 px. |
| `--font-size-body` | `1rem` | Text i controls: 16 px de referència. |
| `--font-size-section` | `1.125rem` | Seccions funcionals. |
| `--font-size-section-editorial` | `1.5rem` mòbil; `1.625rem` desktop | Seccions expressives de B; Newsreader 500, no labels. |
| `--font-size-title` | `2rem` mòbil; fins a `2.375rem` desktop | Títol de pantalla, 32–38 px de referència. |
| `--font-size-display` | `2.5rem` mòbil; fins a `3rem` desktop | Només portada o peça editorial, 40–48 px. |
| `--line-height-body` | `1.5` | Text funcional, ajuda i missatges. |
| `--line-height-title` | `1.15` | Títols; comprovar accents i salts de línia. |
| `--line-height-section-editorial` | `1.2` | Seccions B, amb salts de línia per a textos llargs. |

Newsreader disposa d’eix de pes 200–800 i mida òptica 6–72; Source Sans 3 disposa de pes 200–900. Els pesos proposats són disponibles, no negretes sintètiques. Fonts: [metadades de Newsreader](https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/METADATA.pb) i [Source Sans 3](https://raw.githubusercontent.com/google/fonts/main/ofl/sourcesans3/METADATA.pb). A la mostra 1C es va comprovar la càrrega de Newsreader 500 i Source Sans 3 400/500/600; això no comprova encara la càrrega al frontend de Nestly.

Proposar `font-optical-sizing: auto` per a Newsreader i `font-synthesis: none`. Evitar serif fina en labels petits i cursiva en textos d’error. Permetre salts de línia sense truncar contingut essencial. Comprovar català (`Il·lusió`, accents), números i euros; usar números tabulars en imports i recomptes comparables.

Responsive: mesures en `rem`, títols adaptables sense reduir text funcional per encaixar una pantalla, arrel respectuosa amb la mida configurada al navegador. **P:** fitxers de font, subconjunts, pesos efectivament descarregats, allotjament local o extern, fallback i llicències OFL de cada fitxer. El catàleg HTML consulta Google Fonts per mostrar les famílies i usa Georgia/system-ui sense connexió; això no decideix l’allotjament del frontend ni instal·la fonts.

## 4. Espai, amplades i superfícies

Tots aquests valors són **T/P**, inspirats en 1C i ajustables després de provar contingut real.

| Família de tokens | Candidats | Aplicació |
| --- | --- | --- |
| `--space-1` a `--space-8` | `0.25rem`, `0.5rem`, `0.75rem`, `1rem`, `1.5rem`, `2rem`, `2.5rem`, `3rem` | Escala de 4, 8, 12, 16, 24, 32, 40 i 48 px de referència. |
| `--width-form-max` | `46rem` | Formulari contingut en desktop, no camp estirat a tot el viewport. |
| `--width-content-max` | `72rem` | Contingut general; no límit de mida del navegador. |
| `--width-sidebar` | `11rem` | Candidat desktop; labels llargs i zoom poden exigir més espai. |
| `--radius-control` | `0.5rem` | Inputs, botons i selectors. |
| `--radius-container` | `1rem` | Blocs de formulari i contenidors generals; targetes orgàniques amb `--radius-card`. |
| `--radius-card` | `1.75rem` | Targetes orgàniques d’Items/Recomanacions i estats buits; candidat de 1F. |
| `--radius-unit` | `1.25rem` | Zones de les unitats i magnituds dins de les targetes orgàniques. |
| `--radius-progress` | `1rem` | Barra contínua; no canvia la regla de cobertura. |
| `--border-width-control` | `1px` | Vora de control amb el color funcional. |
| `--border-width-error` | `2px` | Error més text; preservar dimensions amb `box-sizing`. |
| `--focus-width` / `--focus-offset` | `3px` / `3px` | Focus extern amb espai per evitar retall. |
| `--control-min-height` | `2.875rem` | 46 px de referència; creix amb text i zoom. |
| `--shadow-container` | `0 8px 24px rgb(73 56 63 / 0.04)` | Ombra discreta opcional; no és l’únic senyal de límit. |

Mòbil: marge lateral candidat de `--space-4` o `--space-5`; una columna. Desktop: Categoria i Subcategoria poden compartir fila quan les etiquetes i errors hi caben. Les altures són mínimes, no fixes. No es fixa un breakpoint definitiu ni s’introdueix mode fosc en aquesta guia.

### 4.1. Agrupaments editorials B

**H:** agrupaments recognoscibles i ritme vertical més treballat. **T/P:** `--space-form-block-gap: var(--space-5)` (24 px de referència); `--space-form-block-padding: var(--space-4)` mòbil i `var(--space-5)` desktop; `--space-form-field-gap: var(--space-5)`; `--space-radio-card-padding: var(--space-4)`. Mantenir radius de contenidor i vora subtil a les superfícies, sense ombra repetida en cada bloc.

Un títol editorial amb subtítol curt pot ordenar un bloc. Separar-ne els camps amb espai i, opcionalment, una línia decorativa; una marca Mel numerada és opcional, no un pas ni un indicador de progrés. Usar headings de nivell coherent; reservar `fieldset/legend` a grups de controls relacionats. No convertir cada camp o ajuda en una targeta. Nom/classificació poden compartir bloc; quantitat/preparació, un altre. En formularis curts, una única superfície és suficient.

Responsive: una columna en mòbil; parelles de camps només quan hi caben els placeholders, les ajudes i els errors. En el catàleg la parella Categoria/Subcategoria s’apila en columnes estretes fins i tot en desktop: no es redueix la font per forçar-la. Evitar altures fixes, textos truncats i padding acumulat entre contenidors.

## 5. Botons i estats

**T/P:** tractament visual. Les accions i els efectes són els de UI/UX V1.

| Variant o estat | Proposta |
| --- | --- |
| Primari | Acció malva, text `--color-on-action`, pes 600. Una acció principal per grup, com Crear o Desar. |
| Secundari | Superfície, text principal i vora funcional; Cancel·lar. |
| Hover primari | `--color-action-hover`; sense moviment que desplaci el label. |
| Pressionat primari | `--color-action-pressed`; no confondre pressió transitòria amb selecció persistent. |
| Hover secundari | Fons Sorra i mateixa vora funcional. |
| Focus | Anell comú visible, també en controls primaris; no eliminar-lo per motius estètics. |
| Càrrega | Conservar el label i afegir indicador i text comprensible. Evitar doble enviament; anunciar el procés sense moure focus. |
| Desactivat | Sorra, text secundari, vora funcional; no abaixar l’opacitat de tot el component. Explicar el motiu quan no sigui evident. |
| Acció destructiva | Pendent de disseny específic. Usar error candidat només amb text explícit i confirmació funcional existent; no aprovar una variant completa aquí. |

Botons natius per a accions i enllaços per a navegació. Àrea mínima proposada de 44 × 44 CSS px, amb altura de control de 46 px; labels poden créixer o ocupar més d’una línia. Cap acció essencial només amb icona. **P:** totes les variants de càrrega, error i destrucció, incloses combinacions d’estats.

Patró B: una franja d’accions amb separador subtil, espai de focus i Crear/Desar com a primari malva; Cancel·lar com a secundari. No augmentar la decoració dels botons per fer-los editorials: label funcional 600 i mateix radius de control. Hover/pressió del primari s’apliquen només al primari; el secundari no ha d’heretar-ne el fons fosc. Selecció persistent correspon a ràdios o navegació, no a Crear. La fixació mòbil de la barra continua pendent de validació real segons §8.

## 6. Camps, selects, ràdios, labels i ajudes

Superfície clara, text principal de 16 px de referència, vora funcional i radius de control. Label visible separat del valor; placeholder no substitueix label ni conté informació imprescindible. Ajuda en text secundari i error en color d’error amb descripció concreta. Connectar label, ajuda i error al control; no dependre d’un asterisc sense explicar els camps obligatoris.

Selects: prioritzar el control natiu. En creació directa a casa, Categoria i Subcategoria comencen sense selecció; Subcategoria resta desactivada amb «Selecciona primer la categoria» fins que correspon. Un canvi de Categoria neteja una Subcategoria incompatible. «Pendent de classificar» requereix tria explícita. La càrrega o fallada del catàleg no assigna dades per defecte.

Ràdios: agrupar amb `fieldset` i `legend`, label tàctil complet i indicador de selecció que no depengui només del color. «No preparat» és inicial; «Preparat» és l’altra opció del registre directe. No afegir un tercer estat.

### 6.1. Ràdios en targetes seleccionables

**H:** patró preferit B quan les opcions són poques i el format ajuda a comprendre-les. No imposar-lo a tots els ràdios o a llistes llargues. **T/P:** un `input type="radio"` natiu, dins d’un label que ocupa la targeta; nom de grup compartit, valors diferents i ajudes breus associades. Teclat Tab per entrar al grup, fletxes per canviar opció i Espai per seleccionar. Cap `div` amb un clic que substitueixi la semàntica nativa.

| Estat del patró B | Tractament proposat |
| --- | --- |
| Normal | Superfície, text principal, ajuda secundària opcional, vora funcional 1 px, radius de contenidor. |
| Hover | Vora malva, sense moure el label ni canviar la selecció. Només en opcions habilitades. |
| Focus | Anell malva de 3 px separat 3 px al voltant del label quan el ràdio té focus visible. Mantenir focus natiu si no hi ha estil equivalent compatible. |
| Selected | Punt natiu marcat, vora malva 2 px i fons Sorra. Compensar el padding per evitar salt de mida. No dependre només del fons. |
| Disabled | `disabled` natiu, Sorra i text secundari, sense opacitat global ni hover; ajuda amb motiu quan cal. No introdueix una regla per desactivar Preparat. |
| Error | Missatge associat al grup, `aria-invalid` quan correspon i vora d’error 2 px; conservar la selecció i distingir-la del focus. Sense generar un error obligatori artificial per a preparació inicialment vàlida. |

En mòbil, opcions apilades; en desktop, dues columnes només amb espai suficient. El label complet és target tàctil, amb mínim 46 px d’altura i altura adaptable. **P:** selected + focus, selected + disabled, error + focus i error + selected en frontend real. El catàleg mostra selected amb focus, una opció desactivada aïllada i errors de camp; no implementa totes les combinacions del grup.

### 6.2. Etiquetes, ajudes i errors en B

Labels Source Sans 3 600; ajudes secundàries de 14 px de referència; errors de 14 px en color d’error, amb text explícit i vora funcional de 2 px. B pot afegir una línia d’error lateral al missatge, sense una nova targeta ni un fons d’accent. No fer desaparèixer l’ajuda imprescindible en mostrar l’error. El focus continua malva, separat de la vora d’error, perquè no es confonguin els dos estats.

Errors segons UI/UX §4.2: validar en blur i tornar a validar en Crear/Desar, conservar les dades i mostrar tots els errors inline; portar scroll i focus al primer camp amb error. No donar errors prematurs mentre s’escriu. Provar canvis d’altura dels missatges per evitar desplaçar una acció durant la pulsació.

## 7. Targetes i contenidors

Superfície clara, padding candidat `--space-5` o `--space-6`, radius de contenidor i ombra opcional. La jerarquia la dona el contingut, no una decoració diferent per a cada targeta. No fer tota una targeta clicable si inclou altres controls amb accions independents.

Patró B: títol de targeta Newsreader 500 quan aporta jerarquia, metadades Source Sans 3, separadors subtils i una superfície per agrupament real. Les targetes de ràdio són controls dins d’un bloc, una excepció funcional a la regla d’evitar targetes niades. L’accent rosa al marge és puntual; no s’afegeix a totes les targetes ni identifica un estat. Les capçaleres de grup d’Items continuen neutres.

En M1, la capçalera de grup d’Items és visualment neutra i mostra el total; no representa la fotografia d’una unitat. El desplegament preserva l’accés als detalls individuals. Les unitats poden tenir preparacions i fotos diferents. Sense foto, placeholder neutre comú, sense assignar una icona de Categoria com a substitut.

En Llistes i Recomanacions, respectar la informació i la jerarquia documentades, sense afegir mètriques de Dashboard ni informació econòmica al resum dels Items a casa. Mel pot donar personalitat a una peça editorial; Rosa antic pot aparèixer com a gest al marge. Cap accent es reserva com a prova d’un estat de negoci.

### 7.1. Targetes orgàniques consolidades com a direcció

**H:** B de 1F amb la correcció 1G.1 aprovada a 1H: composició càlida i fluida, geometria regular suau i jerarquia entre grup i unitats. **T/P:** superfície Ivori, radius de targeta 28 px de referència, zones internes Sorra amb radius 20 px i espai de 16–24 px. Sense ombres afegides ni vores funcionals per contenidors passius que ja s’identifiquen per estructura. Una marca rosa decorativa pot acompanyar el títol de Recomanacions; no apareix en cada unitat. La neutralitat de grup significa absència de foto atribuïda al conjunt, d’icona de Categoria substitutiva i d’un estat de preparació agregat.

Composició de referència 1G.1: dues capçaleres de context independents amb gest Mel, sense repetir els subtítols explicatius de 1F; altures de targeta independents, sense estirar-les per igualar-les. Nom del grup Newsreader 500 a 28 px desktop / 26 px mòbil; nom funcional de cada unitat, número en línia secundària i preparació amb espai propi, sense repetir una llegenda del placeholder. «Cobertura» és el títol interior curt; la magnitud usa Newsreader 500 a 56 px desktop / 48 px mòbil i «de 8» a 18 px. La separació entre contextos és de 32 px de referència; padding de targeta 28/24 px en desktop i 24/20 px en mòbil. Aquests valors descriuen l’HTML aprovat, però continuen sent T/P per a la seva aplicació al frontend.

Grup d’Items: nom Newsreader 500 i total explícit; desplegament natiu `details/summary` en el catàleg, amb focus visible i indicador natiu. Cada unitat conserva nom, preparació escrita i placeholder neutre propi. La superfície Sorra ajuda a separar unitats; no converteix un grup en entitat persistent. En producció cada unitat ha de mantenir accés al seu detall amb identificador. El catàleg no implementa routing ni el detall individual, i no prescriu `details` com a component React definitiu.

Recomanacions: targeta separada, sense associar el grup Body a una Subcategoria inventada. Magnitud «6 de 8» en zona Sorra, missatge «Falten 2», barra contínua malva i desglossament «4 a casa · 2 en llistes». `role="progressbar"` amb nom, límits, valor i alternativa textual; decoració oculta. La zona buida de la barra té vora funcional (3,83:1 sobre Ivori), i el tram malva contrasta 5,69:1 amb Sorra. En excés, barra plena i text neutre segons UI/UX; sense nou estat d’error ni nova regla de càlcul.

Responsive: dues targetes en una fila del catàleg quan hi caben; una columna en mòbil. Unitats apilades, altura adaptable, text que pot ocupar més d’una línia. Selected i error no s’assignen a contenidors passius; només als controls que els necessiten. El desplegable té hover amb fons neutre i focus exterior, sense moviment. Provar grups grans i múltiples Recomanacions abans de consolidar densitat o virtualització; aquesta guia no introdueix cap d’aquestes funcionalitats.

### 7.2. Adaptació global respecte a 1F

El catàleg conserva els blocs editorials de formulari amb radius 16 px i els controls de 8 px. Usa 28/20 px només per a la família orgànica, i 28 px als estats buits per donar continuïtat. Els exemples de geometria mostren els quatre radis; les barres són contínues. La navegació i els botons mantenen els estats accessibles ja documentats. Això unifica el llenguatge sense copiar tots els ornaments o modificar funcionalitats.

Respecte a les mostres anteriors de la guia: files d’unitats amb separadors passen a zones Sorra independents; la cobertura petita passa a una magnitud editorial amb barra contínua semàntica; els formularis conserven els dos blocs de 1E. Les dues targetes continuen sent exemples de contextos separats, sense representar una pantalla conjunta nova.

## 8. Navegació mòbil i desktop

**Funció ja validada a UI/UX §4.3:** mòbil amb Inici, Items, Llistes i Més. Més és una pantalla, no un bottom sheet, amb Recomanacions i Botigues; també es considera actiu en aquestes àrees. Desktop amb sidebar permanent per a Inici, Items, Llistes, Recomanacions i Botigues. No afegir perfil, autenticació ni comptes.

**T/P:** labels Source Sans 3, indicador actiu malva amb línia o marca i `aria-current` quan sigui una ruta; ítems amb targets generosos, icona opcional més label. Evitar diferenciar la ruta activa només canviant el color.

**P:** barra inferior d’accions del formulari i bottom navigation. 1C les va dibuixar en dues franges separades; no va validar la fixació durant scroll, teclat virtual ni safe areas. UI/UX demana accions accessibles en una barra inferior fixa: la futura prova ha de reservar espai de contingut, conservar el focus visible i evitar qualsevol superposició. No convertir la mostra estàtica en una decisió implementada.

La navegació descriu la V1 completa. Cada increment només ha d’exposar funcionalitats disponibles segons el pla; tenir-ne el disseny no acredita implementació.

## 9. Feedback i estats

| Situació | Funció documentada / proposta visual |
| --- | --- |
| Èxit | Toast temporal no bloquejant segons UI/UX §4.5; text explícit i, opcionalment, icona. Color neutre llegible. Exemple real: «S’han creat N Items»; N no és el total acumulat del grup. |
| Error de camp | Missatge inline associat, vora d’error i text. Conservar les dades. |
| Error general | Missatge persistent a pantalla amb causa comprensible i possibilitat de resoldre o reintentar quan correspongui; no desapareix com un toast. |
| Càrrega | Text i indicador moderat, anunci accessible i sense animacions obligatòries. No mostrar un estat buit abans de completar la consulta. |
| Buit | Distingir absència de dades i absència de coincidències. Accions exclusivament documentades: crear quan no hi ha dades o «Netejar filtres» quan no hi ha resultats; aquesta última restableix també situació i cerca quan existeixen en l’increment. «Netejar» al bottom sheet només restableix els filtres secundaris (UI/UX §4.4). Il·lustració opcional, mai única explicació. |
| Desactivat | Semàntica nativa quan correspon; explicar dependència o motiu. No convertir una restricció del domini en un botó només gris sense missatge. |

Els diàlegs demanen confirmació, no comuniquen èxit. Totes les eliminacions respecten restriccions i conseqüències documentades. Sortir d’un formulari amb canvis requereix la confirmació existent; la guia no introdueix esborranys, autosave ni nous fluxos.

La cobertura de Recomanacions conserva barra, recomptes i desglossament; en excés, barra plena i text neutral, sense tractar l’excés com un error. **P:** aparença, durada accessible dels toasts, variants de missatges i estats en pantalles reals.

## 10. Accessibilitat i comprovacions pendents

**T:** objectiu tècnic WCAG 2.2 AA; no declaració de conformitat de Nestly. Text normal mínim 4,5:1; text gran mínim 3:1 (24 CSS px normal o aproximadament 18,67 px en negreta). Controls i indicadors necessaris mínim 3:1 respecte al fons adjacent. Aquest document prioritza 4,5:1 també en títols. Referències: [contrast de text](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) i [contrast no textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Targets: proposta Nestly de 44 × 44 CSS px, diferenciada del mínim AA de 24 × 24 CSS px amb les excepcions del criteri [2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). No presentar 44 px com el llindar mínim obligatori d’aquest criteri AA.

Comprovar amb la futura interfície:

- Teclat complet: ordre DOM coherent, Enter/Espai segons control, focus visible no ocult per barres, i retorn de focus en tancar diàlegs o bottom sheets; sense trampes de teclat.
- Zoom de text al 200% i reflow a amplada equivalent de 320 CSS px (inclosa prova de zoom al 400% quan correspongui). Sense pèrdua de controls ni scroll horitzontal de formularis.
- Labels accessibles, agrupació dels ràdios, `aria-invalid` i associació d’errors/ajudes; ús moderat d’anuncis per a processos i resultat, sense llegir cada pulsació.
- Safe areas, teclat virtual, contingut llarg en català, errors multilínia i noves preferències de mida de text.
- Contrast real de hover, focus, pressió, càrrega, error i desactivat. No sumar transparències sobre fons desconeguts.
- Respectar `prefers-reduced-motion`; no fixar ara l’animació de portada.

Les comprovacions locals de 1C van cobrir càrrega de fonts, contrast de parelles, classificació dependent i encaix visual entre 320 i 1024 px. No cobreixen lector de pantalla, zoom real, fluxos complets, totes les variants ni l’aplicació de producció.

**T — Evidències locals 1E, 9/10/2026:** catàleg obert directament amb Chrome/Playwright; fonts Newsreader 400/500 i Source Sans 3 400/500/600 carregades; encaix sense desbordament a 320, 390, 768, 1024 i 1440 CSS px. Text al 200% a 320/390 px i títol/error llargs de prova sense desbordament. Comprovació del contrast del text renderitzat sense fallades detectades; els estats cromàtics continuen subjectes a les parelles de §2.1. Labels, IDs i ajudes associades comprovats; fletxes canvien el ràdio, Tab passa a Cancel·lar, focus de targeta i focus sobre error visibles i secundari amb Espai llegible. Les proves no executen validació ni creació d’Items. Lector de pantalla, zoom real del navegador, teclat virtual, barres fixes i combinacions completes continuen pendents del frontend.

**T — Evidències locals 1G (versió visual posteriorment rebutjada), 9/10/2026:** comprovades totes les amplades demanades (320, 375, 430, 768, 1280 i 1440 CSS px), també amb text al 200%, sense desbordament. Noms de secció i errors llargs de prova encaixen a 320 px. Contrast del text renderitzat sense fallades detectades; paleta intacta. Provats Espai/Enter al desplegable d’Items, focus exterior de 3 px separat 3 px, fletxes dels ràdios, Tab a les accions i focus sobre error. Labels, ajudes i IDs coherents; barra amb valor 6 de 8 i text equivalent. Captures completes i detalls revisats; no substitueixen lector de pantalla ni proves del frontend real.

**T — Verificació 1H:** la guia conserva la composició 1G.1 aprovada; s’ha comprovat coherència dels tokens i les rutes locals. Catàleg renderitzat amb Chrome/Playwright a 320/375/430/768/1280/1440 CSS px, text al 200%, focus i teclat; contrastos sobre superfícies neutres i semàntica dels exemples. La prova de reflow equivalent a zoom 200% no acciona el zoom real del navegador. No és certificació del frontend; lector de pantalla, zoom real, teclat virtual i fluxos complets continuen pendents.

## 11. Il·lustració i iconografia

**H:** expressivitat discreta, tendresa adulta i absència d’estil definitiu. **P:** tractament pictòric final, recursos, autoria i sistema d’icones.

Criteris d’il·lustració:

- Colors suaus relacionats amb la paleta, contorns no dominants i textura lleugera; evitar aparença de dibuix animat o conte infantil.
- Coherència de llum, enquadrament, escala i densitat entre peces. Les variants de manta i peücs de 1C són estudis, no assets aprovats. A conserva volum més llis; B més materialitat; la tria queda oberta.
- Una peça discreta a la capçalera, portada o estat buit pot aportar personalitat; no repetir-la al costat de cada camp. Cap il·lustració interfereix amb labels, errors, focus o navegació ni substitueix una foto d’Item.
- Provar variants simplificades a mida petita, nitidesa en pantalles denses, halos, transparències i càrrega. Mesurar pes i dimensió d’exportació segons ús real; no decidir una quota arbitrària d’assets ni copiar la política de fotografies A09 com si fos la d’il·lustracions.
- Decoració amb `alt=""`; informació necessària amb alternativa textual. No posar text funcional dins d’una imatge.
- Abans d’incorporar un recurs, registrar origen, autoria, llicència o condicions del proveïdor, atribució i permís per a l’ús previst. Una referència de moodboard no concedeix drets de reutilització. Generació per IA no significa aprovació ni exclusivitat.

Iconografia: proposta d’un únic llenguatge lineal simple, 20–24 px de referència amb traç consistent i label visible. L’icona no defineix estats de negoci per si sola. **P:** biblioteca o recursos propis i llicència; que 1C utilitzés icones de mostra no aprova cap dependència ni paquet. No es creen assets en aquesta tasca.

## 12. Fragments CSS orientatius

**T/P — Proposta documental, no codi implementat.** Subconjunt coherent dels tokens, per mostrar com es podrien traslladar; no és un full d’estils complet ni un contracte de components React.

```css
:root {
  --color-background: #F0E7DD;
  --color-surface: #FBF8F4;
  --color-text-primary: #49383F;
  --color-text-secondary: #75616B;
  --color-action-primary: #695363;
  --color-on-action: #FBF8F4;
  --color-action-hover: #5C4857;
  --color-action-pressed: #503E4C;
  --color-accent-honey: #D7B16D;
  --color-accent-old-rose: #B58D9C;
  --color-text-accent: #8A596C;
  --color-link: var(--color-text-accent);
  --color-selected-indicator: var(--color-action-primary);
  --color-graphic-functional: var(--color-action-primary);
  --color-border-control: #8E7885;
  --color-border-subtle: #DBC5AD;
  --color-error: #8C3949;
  --color-focus-ring: var(--color-action-primary);
  --font-family-editorial: "Newsreader", Georgia, serif;
  --font-family-functional: "Source Sans 3", system-ui, sans-serif;
  --font-size-body: 1rem;
  --font-size-title: clamp(2rem, 1.6rem + 1vw, 2.375rem);
  --font-size-section-editorial: 1.625rem;
  --line-height-section-editorial: 1.2;
  --line-height-body: 1.5;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-form-block-gap: var(--space-5);
  --space-form-block-padding: var(--space-5);
  --space-form-field-gap: var(--space-5);
  --space-radio-card-padding: var(--space-4);
  --radius-control: 0.5rem;
  --radius-container: 1rem;
  --radius-card: 1.75rem;
  --radius-unit: 1.25rem;
  --radius-progress: 1rem;
  --control-min-height: 2.875rem;
  --focus-width: 3px;
  --focus-offset: 3px;
}

/* Breakpoint il·lustratiu, pendent per al producte. */
@media (max-width: 42rem) {
  :root {
    --font-size-section-editorial: 1.5rem;
    --space-form-block-padding: var(--space-4);
  }
}

.example-form-block {
  padding: var(--space-form-block-padding);
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-container);
}
.example-form-block + .example-form-block {
  margin-top: var(--space-form-block-gap);
}
.example-section-heading {
  font: 500 var(--font-size-section-editorial) /
    var(--line-height-section-editorial) var(--font-family-editorial);
}
.example-radio-card {
  display: flex;
  gap: 0.75rem;
  min-height: var(--control-min-height);
  padding: var(--space-radio-card-padding);
  border: 1px solid var(--color-border-control);
  border-radius: var(--radius-container);
  background: var(--color-surface);
}
.example-radio-card:has(input:checked) {
  border: 2px solid var(--color-selected-indicator);
  padding: calc(var(--space-radio-card-padding) - 1px);
  background: var(--color-background);
}
.example-radio-card:has(input:focus-visible) {
  outline: var(--focus-width) solid var(--color-focus-ring);
  outline-offset: var(--focus-offset);
}
/* Conservar l’input natiu; hover, disabled i error s’han de completar
   seguint §6.1 abans de traslladar la proposta al frontend. */

/* Noms de classes només il·lustratius. */
.example-organic-card {
  padding: 1.75rem var(--space-5);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}
.example-unit-zone {
  padding: var(--space-4);
  border-radius: var(--radius-unit);
  background: var(--color-background);
}
.example-progress-track {
  height: 0.75rem;
  border: 1px solid var(--color-border-control);
  border-radius: var(--radius-progress);
  background: var(--color-background);
}
/* Només exemple 6/8: l’amplada real deriva de la cobertura V1. */
.example-progress-fill {
  width: 75%;
  height: 100%;
  border-radius: var(--radius-progress);
  background: var(--color-graphic-functional);
}

.example-primary-button {
  min-height: var(--control-min-height);
  padding: 0.625rem var(--space-5);
  border: 1px solid var(--color-action-primary);
  border-radius: var(--radius-control);
  background: var(--color-action-primary);
  color: var(--color-on-action);
  font: 600 var(--font-size-body) / var(--line-height-body)
    var(--font-family-functional);
}
.example-primary-button:hover:not(:disabled) {
  background: var(--color-action-hover);
}
.example-primary-button:active:not(:disabled) {
  background: var(--color-action-pressed);
}
.example-primary-button:focus-visible {
  outline: var(--focus-width) solid var(--color-focus-ring);
  outline-offset: var(--focus-offset);
}
```

No copiar aquest exemple sense validar els estats que no representa, fonts carregades, fallback, focus sobre altres superfícies i variants desactivades. No hi ha `@font-face`, framework CSS ni dependència nova prescrits.

## 13. Relació amb V1 i criteri d’implementació futura

| Pantalla o context real | Aplicació de la guia i límit funcional |
| --- | --- |
| Portada de Nestly Central | Títol editorial i possible il·lustració; entrada al Dashboard, sense login. |
| Dashboard | Accessos a les quatre àrees, sense afegir mètriques. |
| Registre directe a casa, M1 | Nom, Categoria i Subcategoria explícites, quantitat inicial 1 entre 1 i 100, No preparat inicial i Crear/Cancel·lar. Sense situació ni dates manuals. Fotografia opcional prevista en M1, fora de la mostra 1C i de l’increment M1.3 sense fotografia. |
| Consulta d’Items M1 | Grups neutrals, unitats individuals, classificació dependent i distinció de buits. Cerca i tabs V1 no apareixen abans del seu increment. |
| Detall d’Item a casa | Preparació prioritària, procedència si és de Llista; informació econòmica en el context d’adquisició corresponent. |
| Llistes i Botigues | Formularis i targetes segons casos existents; restriccions d’eliminació i creacions secundàries es mantenen. |
| Recomanacions | Cobertura orientativa, barra i recompte; Subcategoria fixa durant edició i excés neutral. |

A10 manté React/TypeScript, features i reutilització quan hi ha una necessitat real. Els tokens podrien centralitzar valors visuals; no substitueixen domain rules, validació autoritativa del backend, estat de formulari ni routing. Els noms de classes del fragment no obliguen a crear nous components. Aquesta guia no decideix rutes, endpoints, esquema, llibreries ni organització addicional del frontend.

La [guia visual HTML](./guia-visual.html) aplica aquests candidats a mostres estàtiques, sense implementar components del frontend ni validar fluxos. Els botons de mostra no creen dades; els controls natius permeten observar focus i selecció, però no implementen classificació dependent, validació ni routing. La distribució visual de referència està aprovada a 1H; els HEX definitius i l’aplicació en pantalles reals continuen subjectes als punts oberts. L’estat dels documents originals té discrepàncies temporals registrades a [Decisions pendents](./decisions-pendents.md); no es corregeixen silenciosament.

**Pas següent pendent:** confirmació humana del commit i dels passos d’integració preparats a 1H. Després, només amb autorització de la fase corresponent, comprovació de components i pantalles amb dades reals. Ni aquesta guia ni un contrast correcte aproven automàticament la implementació.
