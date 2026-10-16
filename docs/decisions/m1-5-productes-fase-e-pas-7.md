# M1.5 — Fase E, pas 7: barrera de manteniment i retirada segura

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

## Estat
Preparació implementada i assajada. No hi ha activació real de nestly_dev.
Aquest document complementa i actualitza els passos 5/6: seleccionar products-v1
ja NO implica obrir les escriptures. Legacy continua sent el model per defecte.

## Mecanisme i abast
WriteBarrier és middleware global del composition root products-v1, anterior a parsers,
routers, comprovació del header de model i qualsevol ruta auxiliar afegida després.
Permet GET/HEAD/OPTIONS; rebutja qualsevol altre mètode mentre està tancada.
La resposta és HTTP 503, code MAINTENANCE, missatge fix i Cache-Control: no-store.
No descodifica multipart, no normalitza fotos, no persisteix dades ni crea fitxers.
No hi ha endpoint públic, cookie, query parameter o header que permeti obrir-la.
X-Nestly-Model continua sent només comprovació de compatibilitat, no obertura.
No es munten routers legacy al costat dels nous; tampoc es pot esquivar la barrera
amb URLs alternatives, antigues, desconegudes o auxiliars i mètodes d'escriptura.
Les futures rutes GET/HEAD/OPTIONS han de continuar sent de lectura: no s'hi pot
implementar una modificació encoberta. No hi ha jobs/escriptors de fons en l'abast actual.

## Configuració operativa explícita
NESTLY_DATA_MODEL absent -> legacy, sense canvis funcionals del seu contracte.
NESTLY_DATA_MODEL=products-v1 i NESTLY_PRODUCT_WRITES absent o blocked -> bloqueig.
NESTLY_PRODUCT_WRITES=open és l'únic valor que obre a l'arrencada del model nou.
Qualsevol altre valor en products-v1 avorta l'arrencada; no hi ha coerció booleana.
La configuració de productes no altera el comportament legacy per defecte.
No s'ha modificat cap .env, servei habitual o configuració de desplegament.

Per verificar durant l'activació futura:
1. Pausar i drenar tots els escriptors legacy de l'origen aprovat.
2. Executar l'activació únicament amb autorització específica i snapshot vigent.
3. Arrencar products-v1 amb NESTLY_PRODUCT_WRITES=blocked (o absent).
4. Verificar model, esquema, catàleg, inventari, detall i fotos mitjançant lectures.
5. Verificar també que POST/PATCH/PUT/DELETE retornen MAINTENANCE sense efectes.
6. Només després d'aprovació operativa: aturada ordenada d'aquesta instància i
   nova arrencada explícita amb NESTLY_PRODUCT_WRITES=open. Es mantenen exactament
   base, esquema, versió de codi, model frontend i arrel fotogràfica aprovats.
7. Renovar pestanyes i comprovar coherentment backend/frontend, sense reintentar creacions.
No persistir open despreocupadament en un fitxer que es reutilitzi per a una activació:
cal revisar/eliminar la variable abans de cada nova finestra de manteniment.
La barrera no substitueix la decisió humana ni autentica usuaris.

## Tancament i drenatge
El composition root conserva una barrera per procés. SIGINT/SIGTERM:
- Tanca immediatament admissions d'escriptura.
- Espera fins a 15 segons les peticions d'escriptura admeses abans del tancament.
- Només després de confirmar el drenatge tanca el servidor HTTP i el pool.
- Si falla el drenatge, registra un avís fix, manté les escriptures tancades i NO
  declara l'aturada completada. No força una obertura ni elimina fotos.
En una composició de confiança, open/block/closeAndDrain són mètodes interns,
mai un endpoint públic. open es rebutja si encara hi ha operacions actives o incertesa.
Per rebre lectures mentre es revisa el sistema, tornar a arrencar en blocked.

El comptador s'allibera amb finish, no amb close del socket. Els handlers actuals
esperen totes les operacions de DB/processament/compensació abans de respondre.
No és un seguiment genèric de treball deslligat executat després de respondre;
si en el futur s'introdueix, s'haurà d'integrar explícitament en el drenatge.
Si el client es desconnecta abans de finish, el treball pot continuar. La barrera
es tanca, marca incertesa i no allibera fictíciament el comptador ni permet reobrir.
Un timeout tampoc acredita que s'hagi cancel·lat o revertit el treball.

### Si no es pot confirmar el drenatge
No executar DDL ni continuar l'activació. Mantenir escriptors bloquejats.
Identificar totes les instàncies/PIDs que apunten a l'origen, no només la del navegador.
Esperar l'aturada ordenada; comprovar absència dels processos i connexions/transaccions
corresponents a PostgreSQL abans de continuar. Una aturada forçada (inclòs Stop-Process
quan no lliura SIGINT/SIGTERM) NO equival a un drenatge confirmat.
Si cal forçar-la, tractar el resultat de persistència com a incert, conservar tots els
fitxers i repetir snapshot, integritat, referències i backup/revisió abans d'aplicar res.
No assumir rollback perquè s'hagi tancat el client; no eliminar possibles orfes automàticament.
A Windows cal confirmar el mecanisme real de senyal/aturada de l'host que s'utilitzarà.
La barrera és local al procés: no bloqueja SQL extern, altres backends o futurs workers.
La pausa operativa i la verificació de totes les instàncies continuen sent obligatòries.

## Proves efectuades
Esquema nou de nestly_test; catàleg sintètic 8/41 i fotos en directori temporal propi.
- Legacy per defecte: POST JSON correcte; després d'activar l'esquema, escriptura legacy rebutjada.
- products-v1 sense obertura: POST rebutjat per defecte; lectures disponibles.
- Famílies: POST items/products/photos, PUT/PATCH/DELETE, URLs legacy i auxiliars.
- JSON malformat i multipart amb foto: rebuig abans del processament.
- Comparació d'inventari complet i fitxers abans/després de peticions bloquejades.
- Obertura explícita: creació real amb dues unitats i fotografia; lectura de foto HTTP 200.
- Tres escriptures auxiliars concurrents admeses i pausades amb barreres de Promises,
  sense sleeps; tancament rebutja vuit peticions noves i espera les tres ja admeses.
- Alliberament controlat: les tres acaben i el drenatge es confirma; no hi ha noves admissions.
- Client HTTP real desconnectat: el treball admès continua i persisteix una unitat,
  però la barrera manté incertesa i no permet reobrir. El test espera aquest treball
  abans de retirar els seus recursos; no ho confon amb un rollback.
- Proves unitàries de timeout i esdeveniments close/finish per protegir la política conservadora.

Resultats: 267 proves backend (28 fitxers) i 102 frontend (10), totes superades.
Cap omesa entre les seleccionades. catalog-postgres.test.ts no executat: consulta public
preexistent i no calia per al canvi. Typechecks backend/frontend superats.
No s'ha assajat una pèrdua real de xarxa PostgreSQL ni un tancament forçat de processos habituals.
El camí de drenatge normal s'ha assajat amb la mateixa barrera; els senyals de l'host
real i la pausa de qualsevol altre escriptor s'han de verificar durant la finestra aprovada.

## Retirada del pas 6, executada després de verificar identitat
Verificats via Win32_Process, sockets, metadades locals i estat del control temporal:
- Host manual de l'assaig: ports 5397, 5399, 5400 (arrencador retirat en la consolidació documental).
- PID 35856, fill de 38004: preactivation-backend.ts; port 5398.
- Procés esbuild 36328 fill del host temporal.
- Esquema migration_e_e897d5302b7d4c2bac6dc83add1b2ce2, nestly_test.
- Directori exacte <directori-temporal-exclusiu-de-l’assaig>,
  resolt i no reparse point. Contenia només recursos sintètics del nostre fixture:
  5 WebP, pink.png/blue.png, dump/manifest de prova i metadades.
Les cinc referències fotogràfiques no apareixien a cap altre esquema de nestly_test.
La procedència coincideix amb el codi generador i les evidències del pas 6.
Executada només l'aturada ordenada del seu control: tanca servidors/pool i retira
l'esquema i el directori propis; cap kill genèric ni neteja per patrons.
Comprovació posterior: cap listener als quatre ports, cap dels PIDs identificats,
directori absent i esquema absent. Docker/PostgreSQL continuen saludables.

Conservats: backup privat i manifest del pas 4, arrel persistent products-v1,
captures visuals del pas 6, esquema manual (23 Items), public de test (6 Items)
i assaig estructural preexistent (2 Items). Empremtes d'Items iguals a les inicials.
nestly_dev verificat READ ONLY: dades, estructura i seqüències idèntiques al manifest.
No s'han modificat ni eliminat fotografies preexistents d'altres entorns.

## Fitxers d'aquest pas
Nous: backend/src/http/write-barrier.ts; backend/tests/write-barrier.test.ts;
backend/tests/write-barrier-postgres.test.ts; aquest document.
Modificats: backend/src/http/runtime-app.ts; backend/src/index.ts;
backend/tests/activation-postgres.test.ts; backend/tests/support/preactivation-backend.ts.
Aquest últim respecta també NESTLY_PRODUCT_WRITES: el runner històric E6 només pot
reobrir amb configuració explícita open, mai per haver seleccionat products-v1.

## Pendent abans d'activar nestly_dev
Revisió humana del diff; nova autorització; identificació i drenatge dels escriptors
reals; revalidació del backup/snapshot i configuració coordinada backend/frontend.
La garantia contra noves peticions del servidor products-v1 ja està implementada.
La garantia contra escriptors externs o resultat transaccional incert continua exigint
verificació operativa; no es pot donar per resolta amb un flag.
Sense staging, commit, push o PR. I5 no iniciat.
