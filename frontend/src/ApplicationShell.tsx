import { Outlet } from 'react-router';
import { Navigation } from './Navigation';

export function ApplicationShell() {
  return (
    <div className="application-shell">
      <a className="skip-link" href="#main-content">Salta al contingut</a>
      <Navigation />
      <main id="main-content" className="shell-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
