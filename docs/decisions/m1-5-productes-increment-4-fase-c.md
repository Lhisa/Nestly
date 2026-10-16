# M1.5 — Model de productes · Increment 4, fase C

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

## Estat i abast
Lectures, cache i navegació preparades. Cap registre nou a app.ts, index.ts o App.tsx. Els defaults de les pàgines actives continuen sent legacy; les noves pàgines injecten explícitament dependències. No hi ha fallback de files producte a legacy, ni agrupació textual nova. No s'han iniciat fases D/E ni I5.

## Backend
createProductItemsReadRouter prepara GET /api/items i /api/items/:id amb getGroupedProductItems i findHomeById. Manté paràmetres repetits via URLSearchParams, errors explícits, 404 de detall, dates ISO i foto/classificació/nom derivats del producte. Les exclusions de item_llista es mantenen a l'adaptador PostgreSQL aprovat.

createProductPhotosRouter reutilitza el validador UUID, les capçaleres WebP/nosniff/no-store i el lector segur. LocalProductPhotoReader prepara la composició LocalItemPhotoStorage + PostgresProductPhotoReferences, que comprova producte i tots els Items legacy. No accepta un path del client. La signatura del router antic només s'ha estret a la dependència read que ja utilitzava; no n'ha canviat el comportament.

## Frontend
ProductReadPages prepara inventari i detall a les mateixes URLs futures. ItemsPage i ItemDetailPage admeten dependències opcionals; els valors per defecte, les rutes i el comportament actiu continuen iguals. Això evita duplicar les pàgines i les garanties d'I3/I4.

Client product-reads-api exigeix producte_id i claus home-products:v1:<id>, sense fallback a noms legacy. La capa visual conserva nom/foto per unitat tal com arriba del producte, estat nullable, filtres, recomptes i ordre del backend. Les claus de grup són opaques i estables; les unitats es localitzen sempre per id individual.

Cache de productes sota ['items','products-v1',query] i ['item','products-v1',id], separada dels DTO legacy. Invalidació per prefix ['items'], ['item'] i ['products'], inclosos detalls d'unitats antigues. Les fallades de refetch no converteixen una creació confirmada en una fallada de creació.

product-inventory-context manté magatzems transitoris independents, limitats a 30 entrades, amb la mateixa semàntica aprovada: expansions, unitats revelades i scroll només en retorn intern; recàrrega o accés directe no inventa context. No s'ha canviat el magatzem legacy.

ProductCreateItemsPage és un wrapper desconnectat del formulari preparatori. Després d'èxit invalida caches i calcula la classificació a partir de subcategoria_id/producte_id de les unitats retornades i el catàleg, mai de camps ocults del formulari. Conserva filtres compatibles i paràmetres aliens, guarda els filtres anteriors i els IDs nous perquè inventari desplegui/reveli/localitzi el grup. Si falla la preparació de navegació després d'un èxit confirmat, manté la confirmació i ofereix retorn a l'inventari amb avís explícit de no repetir la creació.

## Validació i límits
Proves HTTP: agrupació per identitat amb noms duplicats, paràmetres repetits, comptatges, detall nullable/dates; fotos reals sintètiques en directori temporal, referències producte/legacy simulades, orfes, traversal, capçaleres i errors sense dades internes. Les consultes SQL i el checker combinat ja tenen cobertura PostgreSQL real als increments previs.

Proves frontend: grups amb noms duplicats, expansió i blocs de cinc, detall amb foto compartida, actualització del detall antic després d'invalidació, retorn/scroll/context stable, filtres de creació a partir del resultat i navegació amb IDs nous. Regressions legacy executades per protegir els defaults injectables.

Pendent: revisió humana i assaig integrat amb activació explícita posterior. El wiring futur ha d'usar pool/esquema migrat i root fotogràfic correcte. Cap client nou s'ha d'emprar contra un backend legacy per activar parcialment el model. La revisió visual de les pàgines amb dades reals correspon a una fase posterior autoritzada.

Resultats de la fase C: 100 proves frontend superades en 9 fitxers; 255 proves backend superades en 19 fitxers, cap omesa. Inclou products-postgres i product-photos-postgres reexecutades exclusivament en esquemes nous de nestly_test. Typechecks frontend/backend superats. Les integracions PostgreSQL legacy restants no s'han repetit. Els directoris de fotos de proves són temporals i exclusius; no s'ha consultat ni alterat l'entorn manual.
