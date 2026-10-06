import { Link } from 'react-router';

export function LandingPage() {
  return (
    <main className="standalone-page">
      <h1>Nestly Central</h1>
      <Link to="/inici">Entrar</Link>
    </main>
  );
}

export function PlaceholderPage({ title, message = 'Funcionalitat pendent d’implementar.' }: { title: string; message?: string }) {
  return (
    <>
      <h1>{title}</h1>
      <p>{message}</p>
    </>
  );
}

export function MorePage() {
  return (
    <>
      <h1>Més</h1>
      <ul>
        <li><Link to="/recomanacions">Recomanacions</Link></li>
        <li><Link to="/botigues">Botigues</Link></li>
      </ul>
    </>
  );
}

export function NotFoundPage() {
  return (
    <>
      <h1>404 — Pàgina no trobada</h1>
      <p>Aquesta URL no correspon a cap pàgina de Nestly.</p>
      <Link to="/inici">Torna a Inici</Link>
    </>
  );
}
