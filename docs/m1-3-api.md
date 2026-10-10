# M1.3 — Contracte HTTP de la fase 2

Decisions aprovades per la persona usuària. Abast temporal: registre i consulta plana d’Items incorporats directament a casa, sense fotografies, agrupació ni filtres. No completa tota la consulta de CU-09.

- `POST /api/items`: objecte JSON amb nom, categoria_id, subcategoria_id, quantitat i estat_preparacio obligatoris. Sense defaults; camps desconeguts rebutjats. Reutilitza createHomeItems i persistència atòmica. Resposta 201 després de COMMIT amb created_count i les N unitats dins d’items.
- `GET /api/items`: sense paràmetres de consulta; resposta 200 amb items, també buit. Ordre data_creacio DESC, id DESC. Només Items sense item_llista.
- `GET /api/items/:id`: enter positiu fins a 2147483647. Resposta 200 amb item; 404 NOT_FOUND si no existeix dins de l’abast. Identificador invàlid: 400 VALIDATION_ERROR.

Cada Item retorna id, nom, subcategoria_id, estat_preparacio, foto_ref, data_entrada_casa i data_creacio. Les dates es serialitzen en ISO 8601 UTC. Quantitat només pertany a l’operació.

Errors de validació: 400 amb code VALIDATION_ERROR, message «Hi ha camps invàlids» i fieldErrors. La decisió específica aprovada per a aquesta API retorna 400 també per Categoria/Subcategoria inexistents; concreta i substitueix aquí el 404 conceptual per referència inexistent d’A06/A08. Una Subcategoria incompatible també retorna 400. L’error d’aplicació ClassificationNotFoundError es conserva i es tradueix a HTTP a la frontera.

Errors inesperats: 500 INTERNAL_ERROR amb missatge genèric; el detall tècnic només es registra al servidor. No es converteixen errors PostgreSQL inesperats en errors de validació.

Les proves HTTP utilitzen ports simulats. La integració real utilitza NESTLY_ITEMS_TEST_DATABASE_URL amb nestly_test, comprova current_database abans d’escriure i crea un esquema temporal exclusiu que elimina al final. No utilitza nestly_dev.
