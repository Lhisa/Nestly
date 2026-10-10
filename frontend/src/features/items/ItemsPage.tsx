import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchItems } from './items-api';
import './items.css';
export function ItemsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState<number | null>(location.state?.createdCount ?? null);
  useEffect(() => { if (confirmation === null) return; const timer = setTimeout(() => setConfirmation(null), 8000); return () => clearTimeout(timer); }, [confirmation]);
  useEffect(() => { if (location.state?.createdCount !== undefined) void navigate(location.pathname, { replace: true, state: null }); }, [location.state, location.pathname, navigate]);
  const query = useQuery({ queryKey: ['items'], queryFn: ({ signal }) => fetchItems(signal), retry: false });
  return <div className="items-page"><header className="editorial-heading"><p className="eyebrow">Els preparatius, al teu ritme</p><h1>Items a casa</h1><p>Cada unitat té el seu lloc i el seu estat de preparació.</p><Link className="primary action-link" to="/items/nou">Registrar Items</Link></header>
    <div role="status" aria-live="polite">{confirmation !== null && <p className="success-message">S’han creat {confirmation} Items.</p>}</div>
    {query.isPending ? <p role="status">Carregant Items…</p> : query.isError ? <div><p role="alert">No s’han pogut carregar els Items.</p><button onClick={() => void query.refetch()}>Torna-ho a provar</button></div> : !query.data?.length ? <p>Encara no hi ha Items a casa. Pots registrar el primer quan vulguis.</p> : <ul className="item-grid">{query.data.map((item) => <li className="item-card" key={item.id}><h2>{item.nom}</h2><p className="item-identifier">Item {item.id}</p><p className="item-preparation"><svg className="preparation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" />{item.estat_preparacio === 'preparada' && <path d="m8 12 2.5 2.5L16 9" />}</svg><span>{item.estat_preparacio === 'preparada' ? 'Preparat' : 'No preparat'}</span></p></li>)}</ul>}
  </div>;
}
