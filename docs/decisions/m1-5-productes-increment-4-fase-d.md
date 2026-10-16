# M1.5 — Model de productes · Increment 4, fase D

> Document històric de l'increment indicat: descriu l'estat i les decisions d'aquell moment.
> El [model vigent i l'operació actual](../arrencada-local.md#model-vigent-products-v1)
> són `products-v1`, amb identitat explícita i fotografia compartida per producte.
> Les indicacions de preparació, desconnexió o activació pendent següents no descriuen l'estat actual.

## Configuració exclusiva d'assaig
Worktree m1-5-photos/Nestly, codex/m1-5. Composició de tests separada dels punts d'entrada actius; no s'han modificat app.ts, index.ts ni App.tsx.

La fixture startProductRehearsal exigeix nestly_test tant a la URL com a current_database(), crea un esquema UUID exclusiu, configura el pool amb search_path i el verifica abans de crear les taules legacy i executar el SQL preparatori. No usa el migrador actiu ni fa backfill de dades reals. Les fotos són sintètiques i es guarden en un mkdtemp nestly-products-integrated-* fora del repositori.

Prova automatitzada en port HTTP efímer. Navegador real amb backend 127.0.0.1:5298 i Vite 127.0.0.1:5297, strictPort, proxy només a aquell backend. Esquema del navegador: integrated_products_70b83ec649e84bd1b87f5a7d82443bc1; root temporal nestly-products-integrated-zpgivl. Primer intent de composició (integrated_products_d221a100cf024e08998ad66d1cbb21e1) retirat ordenadament després de corregir només el preàmbul React de la vista temporal. Ambdós esquemes s'han verificat absents després de la neteja.

## Fluxos HTTP + PostgreSQL real
Una prova integral recorre el contracte entre capes amb els routers, cas d'ús, repositoris, checker i processador Sharp reals:
- Producte nou amb tres unitats i fotografia; segon producte amb el mateix nom/subcategoria, identitat separada.
- Addició de dues unitats amb fotografia heretada; primera fotografia d'un producte sense foto.
- Substitució sense confirmació refusada; substitució confirmada vàlida; versió obsoleta refusada.
- Foto actualitzada a totes les unitats antigues del producte, també la vinculada a item_llista; altres productes intactes.
- Inventari exclou item_llista, detall de casa retorna 404 per aquesta unitat, lectura interna conserva producte/foto.
- Catàleg, detall, filtres repetits/inferència, recompte, agrupació i resultat sense coincidències.
- Fitxer referenciat accessible; fitxer orfe físic conservat però HTTP 404.
- Fotografia anterior conservada al disc.
- Trigger sintètic falla a la segona unitat: rollback del producte i del lot, compensació només del fitxer nou.
- Pèrdua simulada d'ACK després d'un COMMIT real: resposta 503 PERSISTENCE_UNCERTAIN, dades persistides i fitxer conservat. La simulació és exclusiva de la fixture, no modifica l'adaptador de producció.

## Navegador real
S'han muntat ProductItemsPage, ProductCreateItemsPage i ProductItemDetailPage en una entrada Vite temporal pròpia, amb React Query i router reals; sense mocks de fetch. Les peticions van al backend aïllat i a PostgreSQL.

Verificats dos productes duplicats amb fotografies sintètiques diferents, selecció explícita, creació de producte nou amb nom duplicat i addició a existent. Navegació inventari/formulari/detall; retorn amb filtres, set unitats revelades i scroll mesurat 2694 -> 2694. Després de crear, s'ha localitzat i desplegat el grup amb IDs nous.

Substitució: formulari amb fitxer blau i confirmació; una segona petició HTTP canvia la versió; el formulari rep conflicte real, conserva quantitat 2 i sample-blue.png, enfoca l'avís i desmarca confirmació. Nova confirmació permet desar; el detall de l'Item antic 2 canvia de referència i mostra la imatge blava.

Creació a una altra categoria: només s'eliminen categoria/subcategoria incompatibles, es conserva view=review i es mostra Recuperar filtres anteriors; l'acció els restaura. Incertesa: el servidor passa de 8 a 9 POSTs i es manté en 9 durant la comprovació, sense reintent automàtic; selecció i quantitat es conserven. L'operació incerta havia confirmat les dades, com exigeix l'escenari.

Responsive bàsic a 390, 768 i 1440 px: inventari, formulari i detall observats durant els fluxos, sense desbordament horitzontal detectat. No és una auditoria completa d'accessibilitat ni de tots els dispositius. Captures conservades fora del repositori als artifacts de la conversa.

## Resultats i incidències
256 proves backend superades en 20 fitxers, 100 frontend en 9; cap omesa. Inclou les integracions de productes anteriors i la nova integral; les altres integracions legacy PostgreSQL no s'han repetit. Typechecks backend/frontend superats. git diff --check superat.

No s'ha detectat cap defecte de producció ni s'han canviat contractes. Incidència de muntatge temporal: HTML servit directament sense el preàmbul React de Vite; resolta amb transformIndexHtml a l'arrencador de proves abans de continuar.

## Recursos i reproducció
Es conserven product-rehearsal.ts i product-integrated-postgres.test.ts: permeten reproduir la integració amb PostgreSQL real i HTTP efímer dins de la suite. L'arrencador manual de la inspecció visual es va retirar durant la consolidació documental; no és necessari per executar la prova automatitzada. Els endpoints auxiliars de la fixture no es registren a l'aplicació activa.

Els dos esquemes de navegador, els esquemes de cada test, les seves fotos, els processos i la vista temporal s'han retirat. No s'han consultat Items ni fotografies de nestly_dev, de l'esquema manual o d'altres esquemes preexistents. No s'han aturat serveis existents ni canviat Docker/configuracions. No hi ha staging ni commit.

Veredicte: fase D satisfactòria dins de l'abast aïllat. No valida la migració de dades reals ni autoritza activació: mapa revisat, còpies/restauració, validació de fotos existents i fase E continuen pendents d'aprovació. HEIC/HEIF continua fora d'aquest increment.
