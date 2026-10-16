# M1.5 — Fase E, pas 3: assajos de migració i inicialització neta

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

## Abast i estat
Material preparatori desconnectat. No és una ordre d'activació.
Els SQL 003/004 continuen fora de la cua activa de migracions.
No s'ha modificat nestly_dev, cap esquema preexistent ni el composition root.
La decisió humana és començar nestly_dev amb inventari buit; els tres Items actuals són ficticis.
Això no autoritza encara eliminar-los. Els esquemes preexistents de nestly_test es conserven.

## Revisió de nestly_dev.public (2026-10-16, només lectura)
- item: 3 files; item_llista: 0; cap foto_ref no nul·la.
- categoria: 8; subcategoria: 41; recomanacio: 0.
- botiga: 0; llista_nado: 0; pgmigrations: 2.
- Única FK entrant a item: item_llista.item_id -> item.id, ON DELETE CASCADE.
- item.subcategoria_id -> subcategoria.id, RESTRICT.
- item_llista.llista_id -> llista_nado.id, RESTRICT.
- llista_nado.botiga_id -> botiga.id, RESTRICT.
- subcategoria.categoria_id -> categoria.id, RESTRICT.
- recomanacio.subcategoria_id -> subcategoria.id, CASCADE.
No hi ha producte ni item.producte_id en aquest origen.
La comprovació s'haurà de repetir immediatament abans d'activar: aquest inventari no és permanent.

## Via A — dades legacy conservades
El suport de proves crea un esquema migration_e_<uuid> nou, només a nestly_test,
i reprodueix 001 + 002 abans de preparar productes. Els fitxers són WebP sintètics
creats en un directori privat temporal propi nestly-migration-e-*.

Fixture: cinc Items, quatre amb el mateix nom/subcategoria; 1 i 2 comparteixen foto,
3 té una altra referència i 4 no té foto. 5 està vinculat a una llista.
El mapa uneix explícitament només 1 i 2. 3 i 4 continuen sent productes diferents.
No es consulta la coincidència textual per decidir identitat.

L'aplicador d'assaig:
1. Exigeix una empremta SHA-256 exacta del pla tipat revisat.
2. Bloqueja item, item_llista, producte i classificació dins de la transacció.
3. Revalida origen, snapshot, cobertura, classificació i fotografia original.
4. Refusa aplicacions parcials/repetides i comprova catàleg i fitxers WebP sintètics.
5. Crea productes, assigna item.producte_id i executa el cos de 004 en la mateixa transacció.
6. Comprova que tots els camps legacy romanen idèntics.

L'empremta vincula la revisió a un artefacte; NO autentica una persona ni acredita
aprovació humana per si sola. Al test l'aprovació és una decisió explícita del fixture.
Un aplicador real necessitarà parser de fitxer, dossier d'aprovació, backup verificat,
control d'accés, registre del resultat i política explícita de recuperació.
Aquest suport no accepta un esquema CLI: només pot operar sobre l'esquema que acaba de crear.

Negatives: mapa absent/modificat/incomplet, snapshot obsolet, classificació incompatible,
foto aliena, activació sense cobertura i intent de repetir el pla.
Fallada injectada després de la primera assignació: rollback de productes/assignacions;
producte_id continua nullable. Les seqüències PostgreSQL no es reverteixen: els salts són normals.
Les relacions de llista, estats, dates, noms i fotos legacy es conserven.

## Via B — inventari buit
Fixture independent: catàleg complet 8/41 i tres Items sintètics sense fotos ni llistes.
Una única transacció bloqueja item/item_llista, revalida el snapshot de buidatge,
refusa fotos o vinculacions no previstes, elimina només els IDs aprovats,
executa 003 i 004. Un snapshot incomplet és rebutjat sense eliminar files.
No es reinicien seqüències ni es buiden catàlegs.

Després: inventari/productes buits, FK i NOT NULL presents, categories/subcategories
idèntiques. El cas d'ús real crea dues unitats amb una sola foto, després substitueix
la foto confirmant versió 0; totes les lectures comparteixen la nova referència.
Una versió obsoleta és rebutjada sense afegir unitats. La foto anterior es conserva.
No s'activen rutes: les proves HTTP integrades existents cobreixen separadament els routers.

## Operacions mínimes futures sobre nestly_dev — NO executades
1. Aprovar versió final del codi, backup/restauració i configuració persistent de fotos.
2. Pausar tots els escriptors; verificar base nestly_dev, esquema public i esquema legacy esperat.
3. Començar UNA transacció; bloquejar item/item_llista i l'estructura necessària.
4. Revalidar exactament els tres Items aprovats, IDs 1, 2 i 3, foto_ref NULL,
   absència de relacions item_llista i absència de noves FK o triggers inesperats.
   Si qualsevol fet ha canviat, avortar i tornar a revisió humana.
5. DELETE FROM public.item WHERE id IN (1,2,3), comprovant exactament tres files.
   No TRUNCATE CASCADE, no RESTART IDENTITY, no eliminació de fitxers.
6. Executar el cos de 003 amb destí explícit nestly_dev/public: crear producte,
   FK nullable i índex de item.producte_id. Executar el cos de 004 per imposar NOT NULL.
   No executar els embolcalls BEGIN/COMMIT interns dins de la transacció externa:
   cal preparar i revisar un executor coordinat abans d'autoritzar l'operació real.
7. Verificar item/item_llista/producte buits, catàlegs 8/41 intactes, altres taules,
   FK, checks, índex i seqüències sense reinicialització; COMMIT només si tot és coherent.
8. Activar backend i frontend compatibles de manera coordinada; no reobrir escriptures
   fins a validar inventari buit, catàleg, errors i connexió/esquema/arrel fotogràfica correctes.
Una creació de comprovació posterior requerirà autorització: ja seria una escriptura nova.
No s'aplica cap mapa legacy en aquesta via: els tres Items són descartats per decisió humana.

## Backup i restauració — procediment pendent d'execució/aprovació
- Amb escriptors pausats, guardar un pg_dump de format custom de nestly_dev en una
  ubicació privada fora del repositori. Utilitzar connexió protegida/pgpass o service,
  mai credencials literals a documentació, arguments visibles o logs.
- Guardar manifest: data, origen, versió PostgreSQL, commit aplicació, migracions,
  recomptes, seqüències i SHA-256 de l'arxiu. Codi de sortida 0 obligatori.
- pg_restore --list comprova lectura i contingut de l'arxiu, però NO prova restaurabilitat.
- Restaurar l'arxiu en una BASE NOVA de comprovació, en una instància separada compatible,
  amb pg_restore --exit-on-error; verificar esquema, dades, FK, seqüències i lectures.
  No --clean sobre bases existents; no restaurar una còpia de dev sobre nestly_test existent.
- Revisar també rols/propietaris/grants necessaris (el dump d'una base no inclou tots els globals).
- Inventariar arrels de fotos i conservar còpia/manifest coherent si hi ha referències.
  Ara no n'hi ha a dev, però s'ha de revalidar. No copiar ni tocar fotos de l'entorn manual.
- Desar registre de verificació de la restauració abans de considerar vàlid el backup.
En aquest pas NO s'ha creat ni restaurat un backup real; manca aquest assaig operatiu.

## Recuperació i criteris d'aturada
Abans del COMMIT: rollback; mai continuar amb cobertura parcial o DDL parcial.
COMMIT incert: mantenir escriptors pausats i consultar l'estat abans de repetir res.
Després del COMMIT però abans de noves escriptures: activar la recuperació assajada,
preferentment restaurant en una base separada i canviant la connexió després d'aprovació.
No es promet un down automàtic després de backfill o després de noves dades.
Després de noves escriptures: congelar, conservar còpia de l'estat nou i tots els fitxers,
reconciliar o corregir endavant. No restaurar la còpia antiga perdent dades silenciosament.
Tornar al backend legacy és insegur: no coneix producte_id, fusiona per text i pot llegir
foto/nom/classificació legacy obsolets després d'una substitució compartida.

## Validació reproduïble
NESTLY_ITEMS_TEST_DATABASE_URL ha d'apuntar explícitament a nestly_test.
Executar vitest amb product-migration-rehearsal.test.ts i product-migration-plan.test.ts.
Regressió entre capes: product-integrated-postgres.test.ts.
Executar typechecks backend/frontend i git diff --check (també fitxers nous).
Comparar empremtes/recomptes de totes les taules preexistents abans/després.
Només eliminar els esquemes i directoris creats per cada fixture.
Davant COMMIT/ROLLBACK incert, el suport conserva aquests recursos per diagnòstic.

## Recomanació
Via B per a l'activació definitiva de nestly_dev, després d'aprovar backup/restauració,
executor coordinat i canvis d'activació. Via A queda com a assaig de preservació de dades,
no com a justificació per migrar els esquemes manuals o públics de nestly_test.
HEIC/HEIF i I5 continuen fora d'abast.

## Resultats de l'execució del pas 3
- 11 proves superades, 3 fitxers: els dos assajos reals, 8 casos del validador i regressió HTTP/PostgreSQL.
- Typechecks backend i frontend superats; no s'ha executat tota la suite general en aquest pas.
- Empremtes i recomptes de totes les taules preexistents de nestly_dev i nestly_test idèntics abans/després.
- Es conserven els 3 Items de dev i els 23 Items manuals; cap fotografia preexistent oberta o modificada.
- Els esquemes migration_e_* i integrated_products_* creats per les proves s'han retirat; no en queda cap.
- Cap defecte de producció detectat. Backup/restauració real i activació continuen pendents.
