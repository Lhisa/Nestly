# M1.5 · I3 — Integració backend de fotografies

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

## Contractes i configuració

POST /api/items conserva el JSON sense fotografia: mateix input, validacions i resposta 201. Multipart accepta exclusivament un camp data amb el mateix objecte JSON i un fitxer photo. foto_ref mai és input del client; es genera al servidor. Una operació comparteix la referència entre totes les unitats; lots diferents produeixen UUID diferents.

NESTLY_PHOTO_ROOT configura una arrel absoluta privada i persistent fora dels repositoris. No s'ha creat ni modificat cap .env. Sense aquesta variable, el backend conserva JSON i retorna 503 en crear amb foto. Una arrel relativa falla en la composició; les comprovacions de repositori i links es fan abans d'escriure. No es publiquen carpetes amb express.static.

GET /api/item-photos/<uuid-v4> deriva internament items/<uuid>.webp. Només retorna el fitxer si PostgreSQL confirma una referència en qualsevol Item, inclosos els vinculats a item_llista. Paths o UUID invàlids, referències inexistents i fitxers absents: 404. Incertesa SQL, errors de disc o fitxers insegurs: 500. Content-Type image/webp, nosniff i private/no-store. V1 continua sent local a 127.0.0.1, sense introduir un model d'autenticació nou.

Lectura individual conserva foto_ref i la projecció agrupada afegeix foto_ref nullable a cada unitat. Cap fotografia a la capçalera del grup. Clau, ordre, filtres, comptatges i navegació romanen iguals. El frontend ignora aquest camp addicional; no s'ha canviat presentació ni formulari.

## Parser i límits

Multer 2.4.0 i @types/multer 2.3.0; sense parser propi. memoryStorage, màxim un fitxer, un camp, dues parts, camp de 16.384 bytes i nom de camp de 32 bytes. Límit de parser de fitxer 10.000.000 bytes, amb comprovació posterior del mateix límit. Multer 2.4.0 ajusta internament la frontera inclusiva.

Dues operacions multipart simultànies per procés, des d'abans del buffering fins al final de persistència/compensació. Excés retorna 503 sense processar el cos. Les duplicacions, parts desconegudes, JSON malformat o manca de foto retornen 400; mida excessiva, 413; format real no admès, 415; errors inesperats, 500. HEIC/HEIF continua rebutjat, pendent de l'increment específic aprovat.

La validació de dades i classificació precedeix normalització i escriptura. El parser ha de rebre el fitxer per poder validar totes les parts, però encara no desa res persistent. MIME i nom original no decideixen el format.

## Transaccions i compensació

HomeItemsRepository rep foto_ref com a argument intern separat; el contracte de creació del client no inclou aquest camp. PostgreSQL insereix la mateixa referència parametritzada a les N files dins de BEGIN/COMMIT.

Un error de COMMIT després d'enviar-lo, o un rollback fallit, es propaga com ItemPersistenceUncertainError: es conserva el fitxer i es registra l'incident. Davant errors previs amb rollback confirmat, només l'adaptador de l'operació intenta compensar la seva fotografia; consulta totes les referències persistides abans d'unlink. true, resposta no booleana, errors SQL o manca de propietat conserven el fitxer. Errors d'escriptura i compensació es registren i no generen èxit fictici.

Comprovació SQL i unlink continuen sense atomicitat global. La seguretat depèn que altres operacions no puguin reutilitzar referències arbitràries: cada operació genera UUID propi, el client no pot aportar-lo i només l'adaptador propietari pot compensar. No s'ha afegit una neteja general d'orfes ni persistència d'operacions.

## Validació reproduïble

Suites HTTP amb servidor efímer, codecs reals i directoris temporals; error PostgreSQL i COMMIT incert simulats, límits i compensació. Suite PostgreSQL nova sense skip: exigeix NESTLY_ITEMS_TEST_DATABASE_URL amb pathname /nestly_test i verifica SELECT current_database() abans de qualsevol DDL. Crea un esquema m15_<uuid> i aplica l'esquema existent com a fixture; no executa el migrador ni altera l'esquema public. Arrel temporal fora del repo; neteja només el seu esquema, servidor i fitxers temporals.

La prova real cobreix lots compartits/diferents, JSON sense foto, lectura individual i agrupada, servei referenciat, rollback real amb trigger de prova i eliminació compensatòria del fitxer nou. La pèrdua d'ACK de COMMIT es prova amb mocks; no es presenta com una fallada de xarxa injectada contra PostgreSQL real.

## Límits oberts

HEIC, revisió humana de qualitat, permisos ACL a Windows i durabilitat davant crash continuen pendents com a I2. El processador no és un sandbox ni té un límit absolut de memòria/CPU. Multipart té límits de contingut i concurrència, però no s'ha afegit infraestructura global de rate limiting ni un timeout absolut per a operacions SQL/HTTP lentes. Els errors inesperats es registren al servidor; no es retornen detalls de disc o SQL al client. L'ús del servei de fotos fora d'una aplicació estrictament local requerirà revisar l'accés.

Cap migració, dada de nestly_dev, servei existent o presentació frontend s'ha modificat. No s'ha fet staging ni commit.

La consulta SQL de referències inclou tots els Items, però la prova real d'I3 no crea item_llista; no es declara aquesta cobertura específica.
