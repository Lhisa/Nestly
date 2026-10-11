import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchItems } from './items-api';
import type { EffectiveFilters, ItemGroup, ItemUnitSummary } from './items-api';
import { fetchCategories } from './classification-api';
import type { Category } from './classification-api';
import { canonicalItemsSearch, itemFilterQuery, provisionalItemFilters } from './items-url';
import './items.css';

function PreparationIcon({ state }: { state: ItemUnitSummary['preparation_status'] }) {
  return <svg className="preparation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" />
    {state === 'preparada' ? <path d="m8 12 2.5 2.5L16 9" /> : state === null ? <path d="M8 12h8" /> : <circle cx="12" cy="12" r="3" strokeDasharray="1 3" />}
  </svg>;
}

function Preparation({ state }: { state: ItemUnitSummary['preparation_status'] }) {
  const text = state === null ? 'Estat no indicat' : state === 'preparada' ? 'Preparat' : 'No preparat';
  return <p className="item-preparation"><PreparationIcon state={state} /><span>{text}</span></p>;
}

function GroupCard({ group }: { group: ItemGroup }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(5);
  const context = <p className="item-classification">{group.category.name} · {group.subcategory.name}</p>;
  if (group.total_units === 1) {
    const unit = group.units[0];
    return <li className="item-card"><h2>{unit.name}</h2>{context}<p className="item-identifier">Item {unit.id}</p><Preparation state={unit.preparation_status} /></li>;
  }
  return <li className="item-card item-group-card"><header className="item-group-heading"><div><h2>{group.name}</h2>{context}</div><p className="item-unit-count">{group.total_units} unitats</p></header>
    <ul className="preparation-counts" aria-label="Recomptes de preparació">
      <li className={group.preparation_counts.prepared === 0 ? 'count-zero' : undefined}><PreparationIcon state="preparada" /><span><strong>{group.preparation_counts.prepared}</strong> preparats</span></li>
      <li className={group.preparation_counts.not_prepared === 0 ? 'count-zero' : undefined}><PreparationIcon state="no_preparada" /><span><strong>{group.preparation_counts.not_prepared}</strong> no preparats</span></li>
      <li className={group.preparation_counts.unspecified === 0 ? 'count-zero' : undefined}><PreparationIcon state={null} /><span><strong>{group.preparation_counts.unspecified}</strong> amb estat no indicat</span></li>
    </ul>
    <button className="group-toggle" aria-expanded={open} aria-controls={`units-${group.units[0].id}`} onClick={() => { setOpen(!open); if (open) setVisible(5); }}>
      <svg className="disclosure-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} /></svg>{open ? 'Plega' : 'Desplega'} {group.name}
    </button>
    <div id={`units-${group.units[0].id}`} hidden={!open}>{open && <><ul className="group-units">{group.units.slice(0, visible).map((unit) => <li key={unit.id}><h3>{unit.name}</h3><p className="item-identifier">Item {unit.id}</p><Preparation state={unit.preparation_status} /></li>)}</ul>
      {visible < group.units.length && <button onClick={() => setVisible((count) => count + 5)}>Mostra'n més</button>}</>}
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

export function ItemsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState<number | null>(location.state?.createdCount ?? null);
  useEffect(() => { if (confirmation === null) return; const timer = setTimeout(() => setConfirmation(null), 8000); return () => clearTimeout(timer); }, [confirmation]);
  const [draft, setDraft] = useState<EffectiveFilters>({ categoria_id: null, subcategoria_id: null });
  const dialog = useRef<HTMLDialogElement>(null);
  const filterQuery = itemFilterQuery(location.search);
  const activeFilterQuery = useRef(filterQuery);
  activeFilterQuery.current = filterQuery;
  const query = useQuery({ queryKey: ['items', filterQuery], queryFn: async ({ signal }) => ({ filterQuery, response: await fetchItems(signal, filterQuery) }), retry: false });
  const catalog = useQuery({ queryKey: ['categories'], queryFn: ({ signal }) => fetchCategories(signal), retry: false });
  const data = query.data?.filterQuery === filterQuery ? query.data.response : undefined;
  const effective = data?.filters ?? provisionalItemFilters(location.search);
  useEffect(() => {
    if (activeFilterQuery.current !== filterQuery) return;
    const search = data ? canonicalItemsSearch(location.search, data.filters) : location.search;
    if (search !== location.search || location.state?.createdCount !== undefined) {
      void navigate({ pathname: location.pathname, search, hash: location.hash }, { replace: true, state: location.state?.createdCount !== undefined ? null : location.state });
    }
  }, [data, filterQuery, location.search, location.pathname, location.hash, location.state, navigate]);
  const apply = (filters: EffectiveFilters) => {
    const search = canonicalItemsSearch(location.search, filters);
    activeFilterQuery.current = itemFilterQuery(search);
    void navigate({ pathname: location.pathname, search, hash: location.hash }, { state: location.state });
  };
  return <div className="items-page"><header className="editorial-heading"><p className="eyebrow">Els preparatius, al teu ritme</p><h1>Items a casa</h1><p>Cada unitat té el seu lloc i el seu estat de preparació.</p><Link className="primary action-link" to="/items/nou">Registrar Items</Link></header>
    <div role="status" aria-live="polite">{confirmation !== null && <p className="success-message">S’han creat {confirmation} Items.</p>}</div>
    {catalog.isPending ? <p role="status">Carregant filtres…</p> : catalog.isError ? <div><p role="alert">No s’han pogut carregar els filtres.</p><button onClick={() => void catalog.refetch()}>Reintenta els filtres</button></div> : <>
      <div className="desktop-inventory-filters"><FilterFields prefix="desktop" categories={catalog.data} value={effective} onChange={apply} /></div>
      <button className="mobile-inventory-filters" disabled={!data || query.isFetching} onClick={() => { setDraft({ ...effective }); dialog.current?.showModal(); }}>Filtres</button>
      <dialog ref={dialog} className="inventory-filter-sheet" aria-labelledby="filter-title"><h2 id="filter-title">Filtres d’Items</h2><FilterFields prefix="mobile" categories={catalog.data} value={draft} onChange={setDraft} /><div className="form-actions"><button onClick={() => dialog.current?.close()}>Cancel·la</button><button className="primary" onClick={() => { apply(draft); dialog.current?.close(); }}>Aplica</button></div></dialog>
    </>}
    {query.isPending ? <p role="status">Carregant Items…</p> : query.isError ? <div className="general-error"><p role="alert">No s’han pogut carregar els Items. Els filtres s’han conservat.</p><button onClick={() => void query.refetch()}>Torna-ho a provar</button></div> : data && (
      data.inventory_count === 0 ? <section className="inventory-empty"><h2>Encara no hi ha Items a casa</h2><p>Pots registrar el primer quan vulguis.</p></section> : data.matched_count === 0 ? <section className="inventory-empty"><h2>Cap Item coincideix amb els filtres</h2><p>Prova de canviar els filtres per trobar els Items que busques.</p><button onClick={() => apply({ categoria_id: null, subcategoria_id: null })}>Netejar filtres</button></section> : <ul className="item-grid" key={filterQuery}>{data.groups.map((group) => <GroupCard key={group.key} group={group} />)}</ul>
    )}
  </div>;
}
