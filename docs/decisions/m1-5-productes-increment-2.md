# M1.5 — Increment 2: persistència i lectures preparades

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

Aquest increment no activa el model: cap ruta HTTP ni composition root importa els adaptadors nous. No canvia el frontend.

- `ProductsRepository` persisteix atòmicament un producte nou amb N unitats, o N unitats d'un producte existent. No fusiona noms. La quantitat manté el límit existent d'1 a 100.
- `ProductItemsReader` prepara catàleg, lectura interna de qualsevol unitat, detall restringit a casa i inventari sense `item_llista`. El catàleg retorna identificador, classificació i fotografia nullable per distingir noms duplicats.
- `PostgresProducts` deriva nom, subcategoria i fotografia de `producte`; els identificadors, estats i dates provenen d'`item`. La consulta d'inventari detecta assignacions absents en una sola sentència i falla en lloc d'ometre Items silenciosament.
- La creació copia els valors a les columnes legacy com a pont temporal. No s'utilitzen com a font en les lectures noves. Una lectura divergent es prova explícitament.
- La selecció existent bloqueja el producte amb `FOR SHARE` fins al COMMIT. No accepta una fotografia nova ni implementa substitucions. Un COMMIT o ROLLBACK incert retorna un error específic; no elimina fitxers.
- La nova projecció usa claus `home-products:v1:<producte_id>`, conserva estructura i correccions dels filtres, recomptes, ordre d'unitats i màxims independents dels grups. No atribueix fotografia a capçalera de grup.
- El pool destinatari ha de tenir un esquema explícit i preparat, seguint la convenció existent. Les proves creen un esquema UUID nou només a `nestly_test`, executen l'estructura legacy i la preparació, i eliminen exclusivament el seu esquema en acabar. No creen fitxers fotogràfics: les referències són sintètiques.

Pendent abans d'activació: aplicar el mapa revisat, validar fotografies reals, connectar casos d'ús/HTTP i adaptar el context de navegació a les claus noves. La classificació de la petició i l'origen exclusivament servidor de `foto_ref` s'han de validar a la futura capa d'aplicació/HTTP. No hi ha servei de pujada ni compensació nova en aquest increment. La substitució amb confirmació i versió continua fora d'abast.
