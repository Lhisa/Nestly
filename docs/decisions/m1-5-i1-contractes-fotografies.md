# M1.5 · I1 — Contractes i preparació de fotografies

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

## Estat i abast

I1 prepara tipus i ports; no activa uploads, processament, servei estàtic ni canvis visuals. Base: main 03d304e877b3cbec2df0227b5a98872df5cac5ae. Una fotografia opcional per operació; N unitats comparteixen foto_ref. Un altre lot pot tenir una referència diferent sense alterar el grup de M1.4.

## Persistència i contractes actuals

Es reutilitza item.foto_ref TEXT NULL sense migració, unicitat ni taula FOTO. Item i ItemResponse admeten string | null. POST JSON sense foto continua igual: no accepta foto_ref aportada pel client; el repositori continua inserint NULL. GET individual conserva foto_ref. La projecció agrupada pública continua intacta durant I1; l’increment d’integració incorporarà la referència nullable a cada unitat, sense fotografia de grup i sense modificar la clau, comptatges, filtres o ordre.

## Multipart previst, encara inactiu

POST /api/items admetrà application/json com ara, i multipart/form-data per a creacions amb fotografia: un camp data amb l’objecte JSON actual (enters JSON, sense coerció de cadenes) i un fitxer photo. Es rebutjaran parts duplicades, camps desconeguts i més d’un fitxer. El navegador aportarà el boundary; no es fixarà manualment Content-Type amb FormData. Mai s’acceptarà un path o foto_ref del client.

Èxit: 201 amb created_count i items, com ara. Errors previstos: 400 VALIDATION_ERROR per dades o imatge invàlida (fieldErrors.photo), 413 per excés de bytes, 415 per format no admès i 500 controlat per fallades inesperades. La mida total HTTP haurà d’incloure un marge limitat per a metadata i encapsulació. Aquests errors no estan implementats en I1.

## Ports mínims i ordre d’operació

ItemPhotoProcessor rep bytes i retorna bytes WebP normalitzats. ItemPhotoStorage genera i guarda una referència relativa, i ofereix removeIfUnreferenced per a compensacions. No exposen Sharp, PostgreSQL, paths absoluts ni MIME a Domain. La configuració física pertany a Infrastructure.

Flux posterior: validar dades i classificació; normalitzar una imatge; guardar un fitxer; crear N Items atòmicament amb la mateixa referència. Si falla la fotografia, no crear Items. Si falla PostgreSQL, comprovar referències i compensar; si el resultat del COMMIT és incert o la comprovació falla, conservar el fitxer. Fallades de neteja es registren i no reverteixen un èxit funcional. No s’afegeixen jobs preventius d’orfes.

## A09, seguretat i dependències previstes

JPEG, PNG, WebP i HEIC/HEIF; límit inicial de 10 MB. Convenció tècnica proposada per al límit: 10.000.000 bytes, a confirmar abans d’activar l’upload. Decodificació real, orientació corregida, costat llarg màxim de 1600 px sense ampliar, sortida WebP sense original ni metadades fotogràfiques. Els límits de píxels/concurrència i la política d’imatges animades s’han de concretar abans del processador; no es deixaran sense límit.

Sharp està previst per A09 però encara no instal·lat. No s’ha validat el seu binari en aquest entorn. HEIC és un contenidor i el suport real depèn dels codecs de libvips: no es pot donar per garantit amb els binaris precompilats. A09 preveu libheif-js com a decoder específic quan calgui; cal verificar-lo amb fotografies reals d’iPhone, orientació, variants de color i límits de memòria. La qualitat WebP també es validarà amb mostres reals.

Express no interpreta multipart amb express.json; es preveu un parser mantingut (selecció i versions pendents de revisió), sense implementar un parser propi. Cap dependència nova en I1.

Emmagatzematge persistent configurable fora dels repositoris, amb arrel diferent per a test. Referències generades com items/<uuid>.webp, sense nom original ni traversal. Servei estàtic només dels fitxers normalitzats; cap taula nova o cloud en aquesta fase. La ubicació concreta i la URL pública queden per a l’increment d’infraestructura.

Fonts tècniques: [Sharp, instal·lació](https://sharp.pixelplumbing.com/install/), [Sharp, constructor i límits](https://sharp.pixelplumbing.com/api-constructor/), [Express, parsers de body](https://expressjs.com/en/resources/middleware/body-parser/). No substitueixen les proves locals.

## Validació i següent increment proposat

I1: typechecks; contractes nullable i referències compartides/diferents; regressió HTTP JSON; suites existents. I2 proposat: validar dependències i codecs, implementar i provar normalització i storage aïllat amb fitxers temporals, sense activar encara multipart ni modificar dades personals. Proves posteriors de persistència utilitzaran exclusivament nestly_test, esquemes aïllats i directori temporal independent.
