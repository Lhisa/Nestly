# M1.5 — Model de productes · Increment 4, fase B

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

## Estat
Client product-items-api i component CreateProductItemsForm separats del client/formulari legacy. Cap importació ni registre a App.tsx. No hi ha canvis d'inventari, detall o rutes HTTP. No s'ha activat el model.

## Interfície
Mode inicial nou. Dos modes accessibles mitjançant un grup de ràdios explícit. Es conserven nom/classificació i quantitat/preparació en canviar de mode, i es mantenen esborranys de fitxer separats per mode. Cap selecció ni fusió per nom. Selector de productes amb nom, categoria/subcategoria i identificador; resum amb fotografia o placeholder i informació no editable.

El picker existent incorpora únicament un text opcional per producte; el valor per defecte preserva el formulari legacy. La validació JPEG/PNG/WebP i 10.000.000 bytes continua sent provisional al client i definitiva al backend. Retirar el fitxer local no modifica la foto persistent. Estils nous limitats a product-form-page, amb tokens i composició existents.

La confirmació és explícita i està vinculada a producte, versió i instància del File seleccionat. Es reinicialitza en canviar fitxer/producte/mode i deixa de ser vàlida quan canvia la versió observada. Sense foto anterior, s'envia la versió i replace_confirmed=false. Sense fitxer nou, JSON sense photo_decision i herència de fotografia al servidor.

En conflicte, s'actualitza el resum amb l'estat retornat, es preserven quantitat, preparació, selecció i fitxer, i es desmarca la confirmació. Una instantània més recent del conflicte té prioritat sobre dades de catàleg obsoletes. El futur flux no reenvia automàticament. Errors en un anunci amb focus; controls desactivats durant enviament, guard contra dobles submits i guard existent de canvis sense guardar.

## Client i entrega d'èxit
El client separat usa GET /api/products, POST JSON o FormData amb data/photo, sense Content-Type manual per FormData. Errors tipats amb missatges locals fixos, sense mostrar missatges tècnics retornats pel servidor. Xarxa interrompuda o resposta d'èxit no interpretable es tracta conservadorament com a resultat incert. TanStack mutation retry=false; el client tampoc reintenta.

Després d'èxit es mostra el recompte confirmat i es bloqueja un nou submit. El callback onCreated deixa al pare futur la navegació i invalidació de caches: no s'han iniciat les fases C–E. Aquesta fase no invalida inventaris/detalls ni implementa restauracions noves.

## Validació i límits
Proves amb client fetch simulat i formulari muntat només en router de tests; cap crida a serveis manuals ni dades reals. Es comproven selecció de duplicats, canvi de mode, herència, confirmació i invalidació, primera foto, conflicte sense pèrdua, incertesa sense retry, enviaments duplicats, JSON/FormData i etiquetes/focus bàsics. No s'ha fet inspecció visual amb navegador a diferents amplades; queda pendent revisió visual responsive quan s'autoritzi l'entorn integrat.

Resultats: suite frontend completa de 96 proves en 8 fitxers superada; typecheck frontend superat després d'adaptar el helper de promesa de tests a ES2022, sense canviar configuracions. Proves noves reexecutades després d'aquest ajust. Cap backend, migració ni servei manual s'ha executat en aquesta fase.
