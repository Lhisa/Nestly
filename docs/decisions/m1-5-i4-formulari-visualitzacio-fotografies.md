# M1.5 · I4 — Formulari i visualització de fotografies

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

## Abast i composició

Fotografia opcional al tercer bloc del formulari editorial, sense alterar nom, classificació, quantitat ni preparació. Selector natiu accessible, previsualització continguda sense retallar, substitució seleccionant un altre fitxer i acció explícita de retirada. Es reutilitzen tokens, Newsreader, Source Sans 3 i targetes existents; sense dependències visuals noves.

Una selecció invàlida no reemplaça silenciosament la foto anterior: mostra error i bloqueja l'enviament fins a seleccionar-ne una de vàlida o retirar-la. En retirar, es pot tornar a enviar JSON. La fotografia es conserva davant errors HTTP; les dades del formulari i el flux contextual de M1.4 també. La foto seleccionada activa l'avís existent de canvis sense desar. Els controls queden desactivats durant l'enviament i el guard de duplicats existent continua actiu.

## Contractes i validació

Frontend comprova MIME declarat JPEG/PNG/WebP i mida màxima de 10.000.000 bytes abans de previsualitzar. És una comprovació orientativa per a l'usuari: el backend detecta el format real i valida els bytes definitivament. HEIC/HEIF es rebutja explícitament.

Sense foto: POST JSON existent. Amb foto: FormData amb data JSON i photo, sense Content-Type manual. Errors de mida/format es mostren al camp; indisponibilitat i errors incerts es mostren sense eliminar les dades ni repetir automàticament POST.

Els object URLs de previsualització es revoquen en substituir, retirar i desmuntar. Les fotos persistides utilitzen exclusivament una URL relativa derivada del patró items/<uuid-v4>.webp; referències inesperades no es converteixen en URLs arbitràries.

## Inventari i detall

Foto per targeta individual i per unitat desplegada, mai a la capçalera de grup. Unitats equivalents poden tenir fotos diferents. Sense foto, text discret “Sense fotografia”; si la lectura de la imatge falla, “Fotografia no disponible”. Imatges amb alt descriptiu i object-fit contain, sense retall forçat. Alçada reservada per a la càrrega diferida i el fallback d'error per no alterar el scroll restaurat. No es canvia la navegació, l'expansió ni la paginació local.

La inspecció visual humana responsive continua pendent. No s'han arrencat ni reiniciat serveis existents ni creat dades personals per validar la interfície.

## Petites correccions d'I3

Documentació rectificada: la prova PostgreSQL d'I3 no cobreix item_llista. Multer limitat a 10.000.000 bytes, confiant en l'ajust inclusiu intern de 2.4.0; prova HTTP de frontera exacta i un byte addicional. Error 500 del servei de fotografies amb missatge propi i prova de regressió.

## Configuració

NESTLY_PHOTO_ROOT segueix sense valor per defecte. Instruccions a docs/arrencada-local.md; arrel persistent fora del repositori, privada i diferent de la de test. Cap .env modificat i cap canvi de model, migració o dada de nestly_dev. HEIC no s'ha integrat; I5 no s'ha iniciat.
