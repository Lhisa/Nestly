import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main>
      <h1>Nestly</h1>
      <p>El bootstrap de React funciona.</p>
    </main>
  </StrictMode>,
);
