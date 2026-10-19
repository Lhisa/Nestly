// @vitest-environment jsdom
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {createMemoryRouter,RouterProvider} from 'react-router';
import {CreateProductItemsForm} from './CreateProductItemsForm';
const clients:QueryClient[]=[],routers:ReturnType<typeof createMemoryRouter>[]=[];
const products=[{id:7,nom:'Body',category:{id:1,nom:'Roba'},subcategory:{id:2,nom:'Bodies'},foto_ref:'items/11111111-1111-4111-8111-111111111111.webp',foto_versio:3},{id:8,nom:'Body',category:{id:1,nom:'Roba'},subcategory:{id:2,nom:'Bodies'},foto_ref:null,foto_versio:0}];
beforeEach(()=>{
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 1;});
  URL.createObjectURL=vi.fn(()=> 'blob:preview');URL.revokeObjectURL=vi.fn();
  HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
});
afterEach(()=>{cleanup();clients.splice(0).forEach(c=>c.clear());routers.splice(0).forEach(r=>r.dispose());vi.unstubAllGlobals();});
function mount(post?:(init:RequestInit)=>Promise<Response>){
  const fetch=vi.fn(async(url:string,init?:RequestInit)=>{
    if(url==='/api/products')return Response.json({products});
    if(url==='/api/categories')return Response.json({categories:[{id:1,nom:'Roba',subcategories:[{id:2,nom:'Bodies'}]}]});
    if(init?.method==='POST')return post?post(init):Response.json({created_count:2,items:[{id:21,producte_id:8},{id:22,producte_id:8}]},{status:201});
    throw Error('Unexpected URL');
  });vi.stubGlobal('fetch',fetch);
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});clients.push(client);
  const router=createMemoryRouter([{path:'/',element:<CreateProductItemsForm/>}]);routers.push(router);
  render(<QueryClientProvider client={client}><RouterProvider router={router}/></QueryClientProvider>);
  return {user:userEvent.setup(),client,posts:()=>fetch.mock.calls.filter(([,init])=>init?.method==='POST')};
}
async function existing(user:ReturnType<typeof userEvent.setup>,id='7'){
  await user.click(screen.getByRole('radio',{name:'Afegir unitats a un producte existent'}));
  await user.selectOptions(await screen.findByLabelText('Producte existent'),id);
}
function upload(name='first.png'){fireEvent.change(screen.getByLabelText('Fotografia (opcional)'),{target:{files:[new File(['bytes'],name,{type:'image/png'})]}});}

test('mode nou inicial, esborrany conservat en canviar modes i duplicats seleccionats explícitament',async()=>{
  const {user}=mount();expect(screen.getByRole<HTMLInputElement>('radio',{name:'Crear un producte nou'}).checked).toBe(true);
  await user.type(screen.getByLabelText('Nom del producte'),'Nom propi');await user.clear(screen.getByLabelText('Quantitat'));await user.type(screen.getByLabelText('Quantitat'),'4');
  await user.click(screen.getByRole('radio',{name:'Afegir unitats a un producte existent'}));
  const select=await screen.findByLabelText<HTMLSelectElement>('Producte existent');expect(select.value).toBe('');
  expect(screen.getByRole('option',{name:'Producte 7 · Body · Roba / Bodies'})).toBeTruthy();expect(screen.getByRole('option',{name:'Producte 8 · Body · Roba / Bodies'})).toBeTruthy();
  await user.selectOptions(select,'7');expect(within(screen.getByLabelText('Producte seleccionat')).getByRole('img',{name:'Fotografia de Body'})).toBeTruthy();expect(screen.queryByLabelText('Nom del producte')).toBeNull();
  await user.click(screen.getByRole('radio',{name:'Crear un producte nou'}));expect(screen.getByLabelText<HTMLInputElement>('Nom del producte').value).toBe('Nom propi');expect(screen.getByLabelText<HTMLInputElement>('Quantitat').value).toBe('4');
});

test('producte nou envia JSON sense fusió i herència del producte existent envia només identificador',async()=>{
  const a=mount();await a.user.type(screen.getByLabelText('Nom del producte'),'Body');await a.user.selectOptions(await screen.findByLabelText('Categoria (obligatòria)'),'1');await a.user.selectOptions(screen.getByLabelText('Subcategoria (obligatòria)'),'2');await a.user.click(screen.getByRole('button',{name:'Registrar Items'}));await screen.findByText('S’han creat 2 Items.');
  expect(JSON.parse(a.posts()[0][1]!.body as string).product).toEqual({mode:'new',nom:'Body',categoria_id:1,subcategoria_id:2});
  cleanup();const b=mount();await existing(b.user);await b.user.click(screen.getByRole('button',{name:'Registrar Items'}));await screen.findByText('S’han creat 2 Items.');
  expect(JSON.parse(b.posts()[0][1]!.body as string)).toEqual({product:{mode:'existing',producte_id:7},quantitat:1,estat_preparacio:'no_preparada'});
});

test('confirmació desmarcada, reinicialitzada per fitxer/producte/versió; retirar fitxer conserva foto actual',async()=>{
  const {user,client,posts}=mount();await existing(user);upload();
  let check=await screen.findByRole<HTMLInputElement>('checkbox',{name:'Confirmo la substitució de la fotografia de totes les unitats.'});expect(check.checked).toBe(false);
  await user.click(check);upload('second.png');expect(check.checked).toBe(false);
  await user.click(check);client.setQueryData(['products'],[{...products[0],foto_versio:4},products[1]]);await waitFor(()=>expect(check.checked).toBe(false));
  await user.click(check);await user.selectOptions(screen.getByLabelText('Producte existent'),'8');expect(screen.queryByRole('checkbox')).toBeNull();
  await user.selectOptions(screen.getByLabelText('Producte existent'),'7');check=screen.getByRole('checkbox');expect(check.checked).toBe(false);
  await user.click(screen.getByRole('button',{name:'Retirar fotografia'}));expect(screen.queryByAltText('Previsualització de la fotografia seleccionada')).toBeNull();expect(within(screen.getByLabelText('Producte seleccionat')).getByRole('img')).toBeTruthy();expect(posts()).toHaveLength(0);
});

test('primera fotografia sense confirmació: multipart amb versió observada',async()=>{
  const {user,posts}=mount();await existing(user,'8');upload();expect(screen.queryByRole('checkbox')).toBeNull();await user.click(screen.getByRole('button',{name:'Registrar Items'}));await screen.findByText('S’han creat 2 Items.');
  const body=posts()[0][1]!.body as FormData;expect(JSON.parse(body.get('data') as string).photo_decision).toEqual({expected_version:0,replace_confirmed:false});expect(body.getAll('photo')).toHaveLength(1);
});

test('conflicte sense perdre quantitat/fitxer: estat actualitzat i nova confirmació',async()=>{
  let calls=0;
  const {user,posts}=mount(async()=>++calls===1?Response.json({code:'PHOTO_VERSION_CONFLICT',product:{...products[0],foto_versio:4,foto_ref:'items/22222222-2222-4222-8222-222222222222.webp'}},{status:409}):Response.json({created_count:2,items:[{id:21,producte_id:7},{id:22,producte_id:7}]},{status:201}));
  await existing(user);await user.clear(screen.getByLabelText('Quantitat'));await user.type(screen.getByLabelText('Quantitat'),'2');upload();await user.click(screen.getByRole('checkbox'));await user.click(screen.getByRole('button',{name:'Registrar Items'}));
  const alert=await screen.findByRole('alert');expect(alert.textContent).toContain('La fotografia ha canviat');expect(document.activeElement).toBe(alert);
  expect(screen.getByLabelText<HTMLInputElement>('Quantitat').value).toBe('2');expect(screen.getByAltText('Previsualització de la fotografia seleccionada')).toBeTruthy();expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(false);expect(posts()).toHaveLength(1);
  await user.click(screen.getByRole('checkbox'));await user.click(screen.getByRole('button',{name:'Registrar Items'}));await screen.findByText('S’han creat 2 Items.');expect(JSON.parse((posts()[1][1]!.body as FormData).get('data') as string).photo_decision).toEqual({expected_version:4,replace_confirmed:true});
});

test('persistència incerta conserva el formulari i no reintenta',async()=>{
  const {user,posts}=mount(async()=>Response.json({code:'PERSISTENCE_UNCERTAIN',message:'SQL secret'},{status:503}));await existing(user,'8');await user.click(screen.getByRole('button',{name:'Registrar Items'}));
  const alert=await screen.findByRole('alert');expect(alert.textContent).toContain('Revisa l’inventari');expect(alert.textContent).not.toContain('SQL');expect(posts()).toHaveLength(1);expect(screen.getByLabelText<HTMLSelectElement>('Producte existent').value).toBe('8');
});

test('enviament pendent no permet duplicats ni una nova creació després de l’èxit',async()=>{
  let resolve!:(response:Response)=>void;
  const pending={promise:new Promise<Response>(complete=>{resolve=complete;}),resolve:(response:Response)=>resolve(response)};
  const {user,posts}=mount(()=>pending.promise);await existing(user,'8');
  await user.click(screen.getByRole('button',{name:'Registrar Items'}));
  const form=screen.getByRole('form',{name:'Registrar Items per producte'});
  await waitFor(()=>expect(form.getAttribute('aria-busy')).toBe('true'));
  fireEvent.submit(form);await waitFor(()=>expect(posts()).toHaveLength(1));
  pending.resolve(Response.json({created_count:1,items:[{id:21,producte_id:8}]},{status:201}));
  await screen.findByText('S’ha creat 1 Item.');
  fireEvent.submit(form);expect(posts()).toHaveLength(1);
});
