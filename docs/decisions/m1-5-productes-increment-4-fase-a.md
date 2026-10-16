# M1.5 — Model de productes · Increment 4, fase A

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

## Estat i muntatge
Routers injectables `createProductsRouter` (GET /api/products) i `createProductItemsRouter` (POST /api/items). Només es munten en una aplicació Express de tests. No hi ha imports ni registres nous a app.ts o index.ts, ni lectures noves activades. Frontend intacte.

El catàleg conserva tots els productes, inclosos noms duplicats; retorna identificador, nom, categoria/subcategoria, fotografia nullable i foto_versio. La selecció sempre serà explícita. El nom visible de les futures lectures deriva de producte; els camps legacy originals de migració es conserven. No s'ha aplicat cap migració ni activació.

## Contracte HTTP
POST accepta exclusivament application/json o multipart/form-data, segons el Content-Type real. JSON conté product (mode new amb nom/categoria_id/subcategoria_id, o existing amb producte_id), quantitat i estat_preparacio. Multipart conté únicament data (aquest JSON) i photo (un fitxer). Per a producte existent amb fitxer, photo_decision conté expected_version i replace_confirmed. Cap transport ni foto_ref és admès dins de les dades del client: l'envolupant transport es construeix al servidor i es valida amb el parser pur.

201 conserva created_count/items, amb producte_id i foto_ref derivada. Les dates es serialitzen a ISO amb Express. Conflictes 409 contenen code, message i product amb id, nom, category, subcategory, foto_ref i foto_versio actuals; no hi ha reintent automàtic. La substitució exigeix confirmació explícita i control de versió dins la transacció existent.

## Errors: 400, 415 i 422
- 400: sintaxi JSON/multipart invàlida, formes/tipus/camps/variants invàlids, classificació incompatible, quantitat/estat/IDs/decisió invàlids. Inclou camps transport/foto_ref injectats pel client i parts duplicades/desconegudes.
- 415: Content-Type de petició no admès (o charset/content-encoding no suportat). El MIME declarat pel fitxer no determina el format real.
- 422: amb transport i dades vàlids, els bytes no són una fotografia processable/admesa: format real no compatible, corrupció, animació o límit de píxels. Manté el mapatge fotogràfic preparat; no canvia el comportament dels controladors legacy, que encara poden usar 415 per format.
- 413: límit de bytes de foto o de dades excedit.
- 404: producte inexistent, també si desapareix entre preflight i persistència.
- 409: PHOTO_CONFIRMATION_REQUIRED o PHOTO_VERSION_CONFLICT.
- 503: saturació, fotos no configurades o PERSISTENCE_UNCERTAIN. Aquest últim avisa de revisar l'inventari abans de repetir, sense assumir rollback ni afegir Retry-After.
- 500: error intern genèric; cap SQL, path, stack o cause es serialitza.

El missatge d'entrada invàlida és general, tal com prepara el parser aprovat. El futur formulari haurà de mostrar-lo com a error general i conservar les dades.

## Proteccions reutilitzades
Mateix Multer i comptador d'operacions: fitxer màxim 10.000.000 bytes, un fitxer photo, un camp data, dues parts, data màxim 16.384 bytes i màxim dues operacions de fotografia en memòria. Permís alliberat en finally. JSON té també un límit explícit de 16.384 bytes. No hi ha parser multipart propi ni dependències noves.

## Validació i límits
Proves HTTP sobre ports efímers 127.0.0.1 amb el cas d'ús i Sharp reals, ports de persistència i emmagatzematge simulats: cap PostgreSQL ni fotografia existent. Les garanties PostgreSQL de concurrència/atomicitat pertanyen a les integracions ja aprovades, no es reimplementen en mocks. Pendent revisió humana abans de fases B–E; no s'ha iniciat I5.

Resultats de la fase A: 249 proves backend sense PostgreSQL superades en 16 fitxers, cap omesa. Les proves HTTP noves cobreixen nou/existent, catàleg amb noms duplicats, JSON/multipart vàlids i malformats, transports no admesos, camps injectats, producte absent, conflictes previs i transaccionals, errors interns/incerts, límits de foto/camp, saturació i servei de fotos no configurat. Typecheck backend superat. Cap integració PostgreSQL s'ha executat en aquesta fase perquè no s'ha canviat la persistència.
