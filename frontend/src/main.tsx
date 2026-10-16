import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {createBrowserRouter,RouterProvider} from 'react-router';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {createApplicationRoutes} from './App';
import {selectFrontendModel,verifyBackendModel} from './data-model';
import './shell.css';
const root=createRoot(document.getElementById('root')!);
async function start(){
 try{
  const model=selectFrontendModel(import.meta.env.VITE_NESTLY_DATA_MODEL);
  await verifyBackendModel(model);
  const router=createBrowserRouter(createApplicationRoutes(model));
  root.render(<StrictMode><QueryClientProvider client={new QueryClient()}><RouterProvider router={router}/></QueryClientProvider></StrictMode>);
 }catch{root.render(<main><h1>Nestly està en manteniment</h1><p role="alert">No s’ha pogut verificar la versió de l’aplicació. Recarrega la pàgina més tard.</p></main>);}
}
void start();
