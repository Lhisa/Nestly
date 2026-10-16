# M1.5 · I2 — Normalització i emmagatzematge

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

## Abast i dependències

Sharp 0.35.5 amb Node 24.19.0, libvips 8.18.7 i libheif 1.23.5 en Windows. package.json i package-lock.json del backend actualitzats. Cap connexió amb HTTP, frontend, PostgreSQL o serveis existents. Els canvis no commitejats d'I1 es conserven.

## Processament

Entrada exclusivament per bytes, sense nom, extensió ni MIME declarats. Límit de 10.000.000 bytes abans de copiar. Detecció real per Sharp i descodificació completa abans de retornar. JPEG, PNG i WebP disponibles; TIFF, SVG, GIF, AVIF i altres formats rebutjats. Imatges animades rebutjades per nombre de pàgines, i APNG per chunk acTL perquè el decoder pot exposar només el primer frame.

Orientació EXIF corregida, costat llarg màxim de 1600 px, sense ampliació; sortida WebP amb qualitat 80, sense copiar EXIF ni ICC. Qualitat 80 és una elecció tècnica inicial pendent d'inspecció humana amb fotografies representatives.

Protecció proposada per revisar: 24.000.000 píxels (inclou fotografies habituals de 12/24 MP, exclou originals de 48 MP) i dues operacions simultànies per procés. Un raster RGBA de 24 MP ja ocupa aproximadament 96 MB, sense buffers intermedis. No és un límit absolut de memòria. No hi ha cua il·limitada: una tercera operació rep BUSY; cal mapar-la adequadament en la futura integració HTTP. Slots compartits entre totes les instàncies del processador, alliberats també en error. No es modifica la concurrència global de libvips.

Errors de descodificació encapsulats sense filtrar contingut o missatges interns. El límit de píxels de Sharp pot produir INVALID abans de poder classificar-lo com PIXELS. No s'afirma que això sigui un sandbox o un timeout de CPU.

## HEIC/HEIF: pendent verificat experimentalment

Mostra real descarregada al directori temporal des de https://raw.githubusercontent.com/strukturag/libheif/master/examples/example.heic (718.114 bytes). Sharp llegeix heif, 1280 × 854, però convertir a WebP falla: “Support for this compression format has not been built in: HEVC (a suitable decoder plugin is libde265)”. La presència de libheif o del format heif no acredita un codec HEVC.

No s'ha introduït suport fictici: HEIC/HEIF es rebutja. Integració mínima proposada: libheif-js segons A09, després de validar versió, llicència, límits de memòria, orientació i color amb mostres reals d'iPhone. No s'ha instal·lat encara. No s'ha afegit la mostra externa al repositori ni a la suite automàtica.

## Emmagatzematge

LocalItemPhotoStorage rep una arrel absoluta configurable i una funció que consulta si hi ha referències persistides. Rebutja arrels dins de repositoris Git, referències no generades amb el patró items/<uuid-v4>.webp i links a l'arrel, directori items o fitxer a eliminar. Directori privat fora dels repositoris; en integrar-lo cal configurar-lo explícitament, sense valor per defecte dins del worktree.

Una escriptura genera un UUID, utilitza wx (sense sobreescriure), mode 0600 quan el sistema ho suporta, completa write/sync/close abans de retornar. Si falla, comprova les referències i només intenta eliminar el fitxer parcial amb false explícit; qualsevol incertesa o fallada de neteja conserva un orfe, mai un èxit fictici. L'adaptador guarda bytes ja normalitzats; és un port intern i no substitueix la validació del processador.

Una instància representa una operació: només permet un intent de save i conserva una única referència generada, sense acumulació indefinida. removeIfUnreferenced rebutja referències d'altres operacions abans de consultar persistència. La funció de comprovació és obligatòria; true o error conserva el fitxer. Només false explícit permet eliminar. La inexistència del fitxer és idempotent. No hi ha neteja automàtica de fitxers compartits.

El directori ha de pertànyer exclusivament a l'aplicació i no ser modificable per actors no fiables: les comprovacions de links no eliminen totes les races del filesystem. La comprovació de referències i unlink no són atòmics respecte d'una inserció concurrent. La futura compensació s'ha de limitar a la referència acabada de generar per aquella operació, que cap altra operació pot reutilitzar; no utilitzar aquest mètode com a neteja general concurrent. La comprovació SQL real i la gestió de COMMIT incert queden per a l'increment d'integració.

## Proves i següent pas

Proves amb codecs reals i directoris temporals: formats, dimensions, orientació, metadades, corrupció, bytes, píxels, WebP animat, detecció APNG, concurrència, noms únics, persistència, traversal, referències, comprovació fallida, arrel invàlida i escriptura ENOSPC simulada amb neteja.

Abans d'I3: revisió dels límits i qualitat; decidir/validar HEIC; connectar la comprovació a PostgreSQL i compensació només de referències noves, mapar errors i limitar multipart abans de carregar bytes. Cap canvi de dades personals ni migració.

Fonts: https://sharp.pixelplumbing.com/api-constructor/ i https://sharp.pixelplumbing.com/install/

## Revisió de seguretat posterior

Corregida la compensació: una referència amb UUID vàlid no acredita propietat. Ara només l'adaptador de la mateixa operació pot compensar el seu fitxer, incloent la restricció d'un intent d'escriptura. Els errors d'escriptura conserven el fitxer si la comprovació de referències falla, retorna true o no retorna false explícit. Directoris nous amb mode 0700 quan el sistema ho suporta; a Windows calen ACL adequades.

Proves reforçades: frontera real de 24.000.000 píxels i una fila addicional; alliberament de slots després d'errors; rebuig de referències alienes sense consulta SQL; neteja incerta; rebuig de junctions a l'arrel i a items sense modificar-ne el destí. El límit de bytes precedeix la còpia i qualsevol crida a Sharp. La prova APNG és una declaració de chunk injectada, no una mostra APNG completa amb CRC validat; el rebuig conservador d'acTL es prova, el WebP animat sí es genera amb el codec real.

L'escriptura fa sync del fitxer abans de retornar. No es garanteix la durabilitat del directori davant una caiguda del sistema, ni un sandbox contra canvis concurrents del filesystem. Mode privat i propietat exclusiva continuen sent requisits. El recompte SQL real i la compensació de COMMIT incert encara no estan integrats.

### Experiment HEIC i decisió humana

libheif-js 1.23.5 descarregat exclusivament en un directori temporal, sense modificar dependències del projecte. La mostra real de libheif conté dues imatges estàtiques de 1280 × 854: una és primària. El decoder WASM ha convertit la imatge primària a RGBA i després Sharp a WebP. Handles i context alliberats explícitament; prova amb timeout de procés de 15 segons. Això acredita la descodificació d'aquella mostra HEVC, no totes les variants HEIF ni fotografies reals d'iPhone.

La funció d'alt nivell decode analitza el contenidor abans de poder comprovar les dimensions i no configura els límits específics de l'aplicació. El build inclou creixement WASM amb sostre de 2 GiB. Les funcions C de seguretat sí apareixen exportades (get/set_security_limits), però adaptar l'estructura nativa requereix validar l'ABI de la versió fixada. Un timeout al mateix event loop no interromp una descodificació síncrona; els límits V8 d'un worker tampoc acrediten un límit de memòria WASM.

Decisió humana: revisar l'arquitectura abans d'integrar HEIC. No s'ha creat un worker de producció ni instal·lat libheif-js al backend. Alternatives a revisar: worker aïllat amb timeout extern i límits del codec verificats, o procés separat amb límits de recursos del sistema operatiu. No prometre un límit absolut de memòria només amb resourceLimits de Node. Cal verificar orientació, color/HDR, transparència i rebuig de seqüències amb fixtures representatives abans de donar suport per complet. Dependència declarada LGPL-3.0 pel paquet; revisar-ne la distribució abans d'incorporar-la, sense assumir conclusions legals.

### Qualitat visual

Comparació visual de la mostra natural amb cel, arquitectura, branques i aigua, contra RGBA descodificat: WebP qualitat 80 manté una aparença adequada a 1280 × 854, amb pèrdua fina esperable de compressió. Qualitat 80: 270.894 bytes; qualitat 85: 319.834 bytes (+18%). Aquesta mostra no justifica augmentar globalment la qualitat. Es manté 80. No substitueix una revisió humana amb fotografies d'Items, teixits i llum interior, ni valida fidelitat de color/HDR del decoder HEIC.
