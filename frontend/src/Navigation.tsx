import { Link, NavLink, useLocation } from 'react-router';
import { getInventoryContext } from './features/items/inventory-context';

const primaryLinks = [
  { to: '/inici', label: 'Inici' },
  { to: '/items', label: 'Items' },
  { to: '/llistes', label: 'Llistes' },
];

const desktopLinks = [
  ...primaryLinks,
  { to: '/recomanacions', label: 'Recomanacions' },
  { to: '/botigues', label: 'Botigues' },
];

export function Navigation() {
  const { pathname, state, search } = useLocation();
  const inventory = pathname.startsWith('/items/') ? getInventoryContext(state?.inventoryContextKey) : undefined;
  const inventoryTarget = { pathname: '/items', search: inventory?.search ?? (pathname.startsWith('/items/') ? search : ''), hash: inventory?.hash ?? '' };
  const currentPath = pathname.replace(/\/$/, '');
  const moreActive = ['/mes', '/recomanacions', '/botigues'].includes(currentPath);

  return (
    <>
      <nav className="desktop-navigation" aria-label="Navegació principal desktop">
        {desktopLinks.map(({ to, label }) => (
          <NavLink key={to} to={to === '/items' ? inventoryTarget : to} state={to === '/items' && inventory ? { inventoryContextKey: state.inventoryContextKey } : null} end={to !== '/items'}>{label}</NavLink>
        ))}
      </nav>
      <nav className="mobile-navigation" aria-label="Navegació principal mòbil">
        {primaryLinks.map(({ to, label }) => (
          <NavLink key={to} to={to === '/items' ? inventoryTarget : to} state={to === '/items' && inventory ? { inventoryContextKey: state.inventoryContextKey } : null} end={to !== '/items'}>{label}</NavLink>
        ))}
        <Link
          to="/mes"
          className={moreActive ? 'active' : undefined}
          aria-current={moreActive ? (currentPath === '/mes' ? 'page' : 'true') : undefined}
        >
          Més
        </Link>
      </nav>
    </>
  );
}
