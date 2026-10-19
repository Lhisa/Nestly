import { ItemPhoto } from './ItemPhoto';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchItems } from './items-api';
import type { EffectiveFilters, ItemGroup, ItemUnitSummary } from './items-api';
import { fetchCategories } from './classification-api';
import type { Category } from './classification-api';
import { canonicalItemsSearch, itemFilterQuery, provisionalItemFilters } from './items-url';
import * as legacyContext from './inventory-context';
import type { InventoryContext } from './inventory-context';
import './items.css';

function PreparationIcon({ state }: { state: ItemUnitSummary['preparation_status'] }) {
  return <svg className="preparation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" />
    {state === 'preparada' ? <path d="m8 12 2.5 2.5L16 9" /> : state === null ? <path d="M8 12h8" /> : <circle cx="12" cy="12" r="3" strokeDasharray="1 3" />}
  </svg>;
}

export function Preparation({ state }: { state: ItemUnitSummary['preparation_status'] }) {
  const text = state === null ? 'Estat no indicat' : state === 'preparada' ? 'Preparat' : 'No preparat';
  return <p className="item-preparation"><PreparationIcon state={state} /><span>{text}</span></p>;
}

function ItemDetailLink({ unit, search, detail }: { unit: ItemUnitSummary; search: string; detail: (id: number) => void }) {
  return <Link className="item-detail-link" aria-label={`Veure el detall de ${unit.name} (Item ${unit.id})`} to={{ pathname: `/items/${unit.id}`, search }} onClick={(event) => {
    if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); detail(unit.id); }
  }}><span className="item-detail-name">{unit.name}</span><span className="item-detail-access" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d="M7 17 17 7M7 7h10v10" /></svg></span></Link>;
}

function GroupCard({ group, initial, remember, detail, createdIds, search }: { group: ItemGroup; initial?: { open: boolean; visible: number }; remember: (state: { open: boolean; visible: number }) => void; detail: (id: number) => void; search: string; createdIds: number[] }) {
  const [open, setOpen] = useState(initial?.open ?? false);
  const [visible, setVisible] = useState(initial?.visible ?? 5);
  const appliedCreation = useRef('');
  const containsNew = group.units.some((unit) => createdIds.includes(unit.id));
  useEffect(() => {
    const key = createdIds.join(',');
    if (!containsNew || appliedCreation.current === key) return;
    appliedCreation.current = key;
    const last = group.units.reduce((index, unit, current) => createdIds.includes(unit.id) ? current : index, -1);
    const next = { open: group.total_units > 1, visible: Math.max(5, Math.ceil((last + 1) / 5) * 5) };
    setOpen(next.open); setVisible(next.visible); remember(next);
  }, [containsNew, createdIds, group, remember]);
  const context = <p className="item-classification">{group.category.name} · {group.subcategory.name}</p>;
  if (group.total_units === 1) {
    const unit = group.units[0];
    return <li className={`item-card${containsNew ? ' newly-created' : ''}`} data-created-group={containsNew || undefined}><h2><ItemDetailLink unit={unit} search={search} detail={detail} /></h2>{context}<ItemPhoto reference={unit.foto_ref} name={unit.name} /><p className="item-identifier">Item {unit.id}</p><Preparation state={unit.preparation_status} /></li>;
  }
  return <li className="item-card item-group-card" data-created-group={containsNew || undefined}><header className="item-group-heading"><div><h2>{group.name}</h2>{context}</div><p className="item-unit-count">{group.total_units} unitats</p></header>
    <ul className="preparation-counts" aria-label="Recomptes de preparació">
      <li className={group.preparation_counts.prepared === 0 ? 'count-zero' : undefined}><PreparationIcon state="preparada" /><span><strong>{group.preparation_counts.prepared}</strong> preparats</span></li>
      <li className={group.preparation_counts.not_prepared === 0 ? 'count-zero' : undefined}><PreparationIcon state="no_preparada" /><span><strong>{group.preparation_counts.not_prepared}</strong> no preparats</span></li>
      <li className={group.preparation_counts.unspecified === 0 ? 'count-zero' : undefined}><PreparationIcon state={null} /><span><strong>{group.preparation_counts.unspecified}</strong> amb estat no indicat</span></li>
    </ul>
    <button className="group-toggle" aria-expanded={open} aria-controls={`units-${group.units[0].id}`} onClick={() => { const next = { open: !open, visible: open ? 5 : visible }; setOpen(next.open); setVisible(next.visible); remember(next); }}>
      <svg className="disclosure-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} /></svg>{open ? 'Plega' : 'Desplega'} {group.name}
    </button>
    <div id={`units-${group.units[0].id}`} hidden={!open}>{open && <><ul className="group-units">{group.units.slice(0, visible).map((unit) => <li key={unit.id} className={createdIds.includes(unit.id) ? 'newly-created' : undefined}><h3><ItemDetailLink unit={unit} search={search} detail={detail} /></h3><ItemPhoto reference={unit.foto_ref} name={unit.name} /><p className="item-identifier">Item {unit.id}</p><Preparation state={unit.preparation_status} /></li>)}</ul>
      {visible < group.units.length && <button onClick={() => { setVisible(visible + 5); remember({ open, visible: visible + 5 }); }}>Mostra'n més</button>}</>}
    </div>
  </li>;
}

function FilterFields({ value, onChange, categories, prefix }: { value: EffectiveFilters; onChange: (filters: EffectiveFilters) => void; categories: Category[]; prefix: string }) {
  const category = categories.find((entry) => entry.id === value.categoria_id);
  const subcategories = category?.subcategories ?? categories.flatMap((entry) => entry.subcategories);
  return <div className="field-pair inventory-filter-fields"><label htmlFor={`${prefix}-category`}>Categoria
    <select id={`${prefix}-category`} value={value.categoria_id ?? ''} onChange={(event) => {
      const id = event.target.value ? Number(event.target.value) : null;
      const next = categories.find((entry) => entry.id === id);
      onChange({ categoria_id: id, subcategoria_id: next?.subcategories.some((sub) => sub.id === value.subcategoria_id) ? value.subcategoria_id : null });
    }}><option value="">Totes les categories</option>{value.categoria_id !== null && !category && <option value={value.categoria_id}>Categoria {value.categoria_id} (pendent de validar)</option>}{categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.nom}</option>)}</select>
    </label><label htmlFor={`${prefix}-subcategory`}>Subcategoria
    <select id={`${prefix}-subcategory`} value={value.subcategoria_id ?? ''} disabled={!category && value.subcategoria_id === null} onChange={(event) => onChange({ ...value, subcategoria_id: event.target.value ? Number(event.target.value) : null })}>
      <option value="">Totes les subcategories</option>{value.subcategoria_id !== null && !subcategories.some((entry) => entry.id === value.subcategoria_id) && <option value={value.subcategoria_id}>Subcategoria {value.subcategoria_id} (pendent de validar)</option>}{subcategories.map((entry) => <option key={entry.id} value={entry.id}>{entry.nom}</option>)}
    </select></label></div>;
}

interface ItemsPageDependencies {
  loadItems?: typeof fetchItems;
  queryScope?: string;
  context?: typeof legacyContext;
}
const itemsKey=(scope:string|undefined,query:string)=>scope?['items',scope,query]:['items',query];

/** Defaults legacy preservats; el wrapper de productes injecta client i context separats. */
export function ItemsPage({loadItems=fetchItems,queryScope,context=legacyContext}:ItemsPageDependencies={}) {
  const {getCreationContext,getInventoryContext,saveInventoryContext}=context;
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // URL correction retains this visit; user navigation starts another one.
  const visitKey = location.state?.inventoryVisitKey ?? location.key;
  const restored = useMemo(() => {
    const context = getInventoryContext(location.state?.inventoryContextKey);
    return context && itemFilterQuery(context.search) === itemFilterQuery(location.search) ? context : undefined;
  }, [visitKey]);
  const groupStates = useMemo<{ current: InventoryContext['groups'] }>(() => ({ current: { ...restored?.groups } }), [visitKey]);
  const creation = getCreationContext(location.state?.creationKey);
  const scrolled = useMemo(() => ({ current: false }), [visitKey]);
  const root = useRef<HTMLDivElement>(null);
  const [confirmation, setConfirmation] = useState<number | null>(location.state?.createdCount ?? null);
  useEffect(() => { setConfirmation(location.state?.createdCount ?? null); }, [visitKey]);
  useEffect(() => { if (confirmation === null) return; const timer = setTimeout(() => setConfirmation(null), 8000); return () => clearTimeout(timer); }, [confirmation]);
  const [draft, setDraft] = useState<EffectiveFilters>({ categoria_id: null, subcategoria_id: null });
  const dialog = useRef<HTMLDialogElement>(null);
  const filterQuery = itemFilterQuery(location.search);
  const activeFilterQuery = useRef(filterQuery);
  activeFilterQuery.current = filterQuery;
  const query = useQuery({ queryKey: itemsKey(queryScope,filterQuery), queryFn: async ({ signal }) => ({ filterQuery, response: await loadItems(signal, filterQuery) }), retry: false });
  const catalog = useQuery({ queryKey: ['categories'], queryFn: ({ signal }) => fetchCategories(signal), retry: false });
  const data = query.data?.filterQuery === filterQuery ? query.data.response : undefined;
  const effective = data?.filters ?? provisionalItemFilters(location.search);
  useEffect(() => {
    if (activeFilterQuery.current !== filterQuery) return;
    const search = data ? canonicalItemsSearch(location.search, data.filters) : location.search;
    if (data && search !== location.search) {
      const canonicalQuery = itemFilterQuery(search);
      queryClient.setQueryData(itemsKey(queryScope,canonicalQuery), { filterQuery: canonicalQuery, response: data });
    }
    if (search !== location.search || location.state?.createdCount !== undefined) {
      const state = { ...location.state, createdCount: undefined, inventoryVisitKey: visitKey };
      void navigate({ pathname: location.pathname, search, hash: location.hash }, { replace: true, state });
    }
  }, [data, filterQuery, location.search, location.pathname, location.hash, location.state, navigate, queryClient, visitKey, queryScope]);
  useEffect(() => {
    if (!data || query.isFetching || scrolled.current) return;
    const target = creation ? root.current?.querySelector<HTMLElement>('[data-created-group]') : undefined;
    if (creation && !target) { scrolled.current = true; return; }
    if (!creation && !restored) return;
    const frame = requestAnimationFrame(() => {
      if (target) target.scrollIntoView({ block: 'center', behavior: 'auto' });
      else if (restored) window.scrollTo({ top: restored.scrollY, behavior: 'auto' });
      scrolled.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [data, query.isFetching, creation, restored, scrolled]);
  const foundCreated = creation && data ? new Set(data.groups.flatMap((group) => group.units.filter((unit) => creation.ids.includes(unit.id)).map((unit) => unit.id))).size : 0;
  const missingCreatedCount = creation && data && !query.isFetching ? Math.max(0, creation.count - foundCreated) : 0;
  const dismissCreation = () => {
    void navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: { inventoryVisitKey: visitKey } });
  };
  const saveContext = () => saveInventoryContext({ search: data ? canonicalItemsSearch(location.search, data.filters) : location.search, hash: location.hash, scrollY: window.scrollY, groups: groupStates.current });
  const detail = (id: number) => {
    const inventoryContextKey = saveContext();
    void navigate({ pathname: `/items/${id}`, search: location.search }, { state: { inventoryContextKey } });
  };
  const apply = (filters: EffectiveFilters) => {
    const search = canonicalItemsSearch(location.search, filters);
    activeFilterQuery.current = itemFilterQuery(search);
    void navigate({ pathname: location.pathname, search, hash: location.hash }, { state: null });
  };
  return <div className="items-page" ref={root}><header className="editorial-heading"><p className="eyebrow">Els preparatius, al teu ritme</p><h1>Items a casa</h1><p>Cada unitat té el seu lloc i el seu estat de preparació.</p><Link className="primary action-link" to={{ pathname: '/items/nou', search: location.search }} onClick={(event) => { if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); void navigate({ pathname: '/items/nou', search: location.search }, { state: { inventoryContextKey: saveContext() } }); } }}>Registrar Items</Link></header>
    <div role="status" aria-live="polite">{confirmation !== null && <p className="success-message">{confirmation === 1 ? 'S’ha creat 1 Item.' : `S’han creat ${confirmation} Items.`}</p>}</div>
    {missingCreatedCount > 0 && <section className="inventory-empty" aria-labelledby="created-missing-title"><h2 id="created-missing-title">No hem pogut localitzar tots els Items creats</h2><p>El registre s’ha confirmat, però la consulta actual no mostra {missingCreatedCount} dels Items retornats. Pots tornar a consultar l’inventari o continuar amb els resultats disponibles.</p><button onClick={() => { scrolled.current = false; void query.refetch(); }}>Torna a consultar l’inventari</button><button onClick={dismissCreation}>Continua amb l’inventari</button></section>}
    {creation?.filtersChanged && <button onClick={() => { activeFilterQuery.current = itemFilterQuery(creation.previousSearch); void navigate({ pathname: '/items', search: creation.previousSearch }); }}>Recuperar filtres anteriors</button>}
    {catalog.isPending ? <p role="status">Carregant filtres…</p> : catalog.isError ? <div><p role="alert">No s’han pogut carregar els filtres.</p><button onClick={() => void catalog.refetch()}>Reintenta els filtres</button></div> : <>
      <div className="desktop-inventory-filters"><FilterFields prefix="desktop" categories={catalog.data} value={effective} onChange={apply} /></div>
      <button className="mobile-inventory-filters" disabled={!data || query.isFetching} onClick={() => { setDraft({ ...effective }); dialog.current?.showModal(); }}>Filtres</button>
      <dialog ref={dialog} className="inventory-filter-sheet" aria-labelledby="filter-title"><h2 id="filter-title">Filtres d’Items</h2><FilterFields prefix="mobile" categories={catalog.data} value={draft} onChange={setDraft} /><div className="form-actions"><button onClick={() => dialog.current?.close()}>Cancel·la</button><button className="primary" onClick={() => { apply(draft); dialog.current?.close(); }}>Aplica</button></div></dialog>
    </>}
    {query.isPending ? <p role="status">Carregant Items…</p> : query.isError ? <div className="general-error"><p role="alert">No s’han pogut carregar els Items. Els filtres s’han conservat.</p><button onClick={() => void query.refetch()}>Torna-ho a provar</button></div> : data && (
      data.inventory_count === 0 ? <section className="inventory-empty"><h2>Encara no hi ha Items a casa</h2><p>Pots registrar el primer quan vulguis.</p></section> : data.matched_count === 0 ? <section className="inventory-empty"><h2>Cap Item coincideix amb els filtres</h2><p>Prova de canviar els filtres per trobar els Items que busques.</p><button onClick={() => apply({ categoria_id: null, subcategoria_id: null })}>Netejar filtres</button></section> : <ul className="item-grid" key={visitKey + canonicalItemsSearch('', effective)}>{data.groups.map((group) => {
        const lastNew = creation ? group.units.reduce((last, unit, index) => creation.ids.includes(unit.id) ? index : last, -1) : -1;
        const initial = lastNew >= 0 ? { open: group.total_units > 1, visible: Math.max(5, Math.ceil((lastNew + 1) / 5) * 5) } : groupStates.current[group.key];
        return <GroupCard key={group.key} group={group} initial={initial} remember={(state) => { groupStates.current[group.key] = state; }} detail={detail} search={location.search} createdIds={creation?.ids ?? []} />;
      })}</ul>
    )}
  </div>;
}
