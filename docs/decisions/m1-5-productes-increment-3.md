# M1.5 — Increment 3: creació i fotografia compartida

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

Infraestructura desconnectada: no s'han canviat rutes, composition root ni frontend.

`createProductItems` consumeix els contractes JSON/multipart preparats, comprova dades, camps desconeguts i classificació abans de normalitzar o desar. Nom literal compatible amb VARCHAR(100). Cap referència aportada pel client s'accepta. El processador Sharp i l'emmagatzematge local anteriors es reutilitzen sense canvis. La futura capa HTTP ha de parsejar rigorosament formes i parts i mapar errors coneguts; mai serialitzar Error/cause ni paths interns.

Per a fotografia sobre producte existent cal versió observada i confirmació booleana; si ja hi ha foto, només true autoritza substitució. Es fa preflight sense bloquejos per estalviar processament, i es torna a comprovar sota FOR UPDATE dins la transacció. Dues primeres fotografies amb versió 0 no poden guanyar totes dues. Sense fotografia nova es conserva FOR SHARE i la foto actual. La normalització i l'escriptura del fitxer sempre precedeixen BEGIN.

La creació inicial conserva la versió base 0 del contracte anterior, també si inicialitza fotografia. Cada assignació o substitució posterior incrementa la versió. Un desbordament de l'INTEGER provoca rollback, mai wraparound ni actualització parcial.

La transacció conté producte nou o actualització foto, més les N unitats; cap escriptura de fitxer forma part de PostgreSQL. Els camps legacy es copien només a les unitats noves com a pont: no s'actualitzen unitats antigues ni els seus estats/dates. Totes les lectures noves deriven foto de producte. Les referències antigues legacy continuen protegides.

`PostgresProductPhotoReferences` comprova producte i tots els Items (incloent llistes) en una consulta; davant error o resultat no booleà es conserva el fitxer. S'ha d'injectar aquest checker a cada instància exclusiva de LocalItemPhotoStorage del nou cas d'ús. Les rutes antigues continuen utilitzant el checker legacy fins a l'activació coordinada.

Compensació només de la referència generada per aquella instància/operació després d'una fallada certa i comprovació negativa de referències. COMMIT incert o ROLLBACK fallit conserva fitxer i registra incident. Si el checker falla, no s'elimina. Mai s'elimina la fotografia substituïda. No es comparteixen instàncies d'emmagatzematge entre operacions. Els incidents han de quedar en logs privats, no en respostes HTTP.

Validació: proves simulades d'incertesa/neteja i PostgreSQL real en esquemes UUID de nestly_test; fitxers exclusivament en directoris temporals creats per la prova. Cap lectura ni escriptura de fotografies o dades existents. Continuen pendents l'aplicació del mapa revisat, activació HTTP/UI, revisió de missatges d'error del transport i HEIC/HEIF. No s'ha iniciat l'increment 4 ni I5.

Resultats de validació de l’increment: 239 proves superades en 16 fitxers (suites backend sense PostgreSQL més products-postgres i product-photos-postgres), cap omesa. Inclou COMMIT/ROLLBACK incerts simulats, FOR SHARE/NOWAIT real i carrera de primera fotografia. Typecheck backend superat. Les altres integracions PostgreSQL anteriors no s’han tornat a executar en aquest increment.

## Consolidació: frontera d'entrada i errors

El parser pur `parseProductItemsCreationRequest` valida una envolupant interna de transport i dades desconegudes: formes, camps permesos, discriminants, enters dins INTEGER, quantitat 1–100, preparació i decisió fotogràfica. Retorna dades reconstruïdes, sense coercions. JSON prohibeix decisió i fitxer; multipart nou prohibeix decisió; multipart existent exigeix versió no negativa i booleà explícit. La necessitat de true si hi ha foto continua comprovant-se contra l'estat actual i sota bloqueig transaccional.

El futur controlador ha de derivar transport de Content-Type, parsejar el JSON del camp data i controlar els límits/duplicats de parts multipart; el parser no és un parser multipart. No hi ha cap ruta activada.

`ProductInputError` i `ProductNotFoundError` permeten diferenciar entrada invàlida i producte inexistent. El mapatge HTTP pur preparatori retorna 400, 404, 409 segons conflicte, 503 amb advertiment de comprovar inventari abans de repetir si la persistència és incerta, i 500 genèric per errors interns. No serialitza causes, traces, missatges SQL ni propietats internes. Errors fotogràfics coneguts tenen codis i missatges fixos.

Nom: les regles funcionals exigeixen almenys una lletra, absència de NUL/surrogates aïllats i un màxim literal de 100 punts de codi incloent espais; no es normalitza ni retalla el valor persistit. PostgreSQL només imposa VARCHAR(100) i nom no buit després de btrim, com a defensa mínima d'integritat. La diferència és intencionada: SQL no substitueix la validació funcional del cas d'ús ni la revisió del mapa de migració.

Validació de la consolidació: 244 proves superades en 17 fitxers, cap omesa; typecheck backend superat. Inclou parser/mapatge pur i dues substitucions confirmades concurrents amb PostgreSQL real, esquema nou i fitxers temporals propis. Un únic lot de tres unitats es confirma, l'altre rep PHOTO_VERSION_CONFLICT, i els bytes de la fotografia anterior es conserven. Les altres integracions PostgreSQL anteriors no s'han repetit. La lògica transaccional no s'ha modificat; només s'ha tipat l'error de producte inexistent.
