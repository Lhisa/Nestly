// @vitest-environment jsdom
import {act,cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,expect,test,vi} from 'vitest';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {createMemoryRouter,RouterProvider} from 'react-router';
import {ProductItemsPage,ProductItemDetailPage} from './ProductReadPages';
import {ProductCreateItemsPage} from './ProductCreateItemsPage';
import {invalidateProductCreation,productCreationDestination} from './product-navigation';
import {getCreationContext} from './product-inventory-context';
import {fetchProductInventory} from './product-reads-api';
const clients:QueryClient[]=[],routers:ReturnType<typeof createMemoryRouter>[]=[];
afterEach(()=>{cleanup();clients.splice(0).forEach(c=>c.clear());routers.splice(0).forEach(r=>r.dispose());vi.restoreAllMocks();vi.unstubAllGlobals();});
const catalog=[{id:1,nom:'Roba',subcategories:[{id:2,nom:'Bodies'}]},{id:3,nom:'Descans',subcategories:[{id:4,nom:'Mantes'}]}];
const refA='items/11111111-1111-4111-8111-111111111111.webp',refB='items/22222222-2222-4222-8222-222222222222.webp';
const group=(id:number,count:number,photo=refA,sub=2)=>({key:`home-products:v1:${id}`,producte_id:id,name:'Body',category:{id:sub===2?1:3,name:sub===2?'Roba':'Descans'},subcategory:{id:sub,name:sub===2?'Bodies':'Mantes'},total_units:count,preparation_counts:{prepared:0,not_prepared:0,unspecified:count},units:Array.from({length:count},(_,i)=>({id:id===7?i+1:8,name:'Body',preparation_status:null,foto_ref:photo,created_at:'2026-02-01T00:00:00Z'}))});
function mount(path:string,load:(url:string,init?:RequestInit)=>Promise<Response>){
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>url==='/api/categories'?Response.json({categories:catalog}):load(url,init)));
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{});Element.prototype.scrollIntoView=vi.fn();
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 const cache=new QueryClient({defaultOptions:{queries:{retry:false}}});clients.push(cache);
 const router=createMemoryRouter([{path:'/items',element:<ProductItemsPage/>},{path:'/items/:id',element:<ProductItemDetailPage/>},{path:'/items/nou',element:<ProductCreateItemsPage/>}],{initialEntries:[path]});routers.push(router);
 render(<QueryClientProvider client={cache}><RouterProvider router={router}/></QueryClientProvider>);return {cache,router,user:userEvent.setup()};
}

test('identitats separades, detall compartit, invalidació de foto antiga i context/scroll restaurats',async()=>{
 let photo=refA;
 const {cache,user,router}=mount('/items?categoria_id=1&subcategoria_id=2',async url=>url.startsWith('/api/items/')?Response.json({item:{id:6,producte_id:7,nom:'Body',subcategoria_id:2,estat_preparacio:null,foto_ref:photo,data_creacio:'2026-02-01Z',data_entrada_casa:'2026-01-01Z'}}):Response.json({groups:[group(7,6,photo),group(8,1,refB)],filters:{categoria_id:1,subcategoria_id:2},corrections:[],inventory_count:7,matched_count:7}));
 await user.click(await screen.findByRole('button',{name:'Desplega Body'}));await user.click(screen.getByRole('button',{name:"Mostra'n més"}));
 expect(screen.getAllByRole('link',{name:/Veure el detall/})).toHaveLength(7);
 vi.spyOn(window,'scrollY','get').mockReturnValue(420);
 await user.click(screen.getByRole('link',{name:'Veure el detall de Body (Item 6)'}));await screen.findByRole('heading',{name:'Body',level:1});
 expect(screen.getByRole('img',{name:'Fotografia de Body'}).getAttribute('src')).toContain('11111111');
 cache.setQueryData(['products'],[]);photo=refB;
 await act(async()=>{await invalidateProductCreation(cache);});
 await waitFor(()=>expect(screen.getByRole('img',{name:'Fotografia de Body'}).getAttribute('src')).toContain('22222222'));
 expect(cache.getQueryState(['products'])?.isInvalidated).toBe(true);
 await user.click(screen.getByRole('link',{name:'Tornar a l’inventari'}));await screen.findByRole('button',{name:'Plega Body'});
 expect(router.state.location.search).toContain('categoria_id=1');expect(screen.getAllByRole('link',{name:/Veure el detall/})).toHaveLength(7);
 await waitFor(()=>expect(window.scrollTo).toHaveBeenCalledWith({top:420,behavior:'auto'}));
});

test('retorn de creació usa classificació efectiva del resultat i conserva paràmetres aliens',()=>{
 const result={created_count:1,items:[{id:22,producte_id:7,nom:'Body',subcategoria_id:4,estat_preparacio:null,foto_ref:refB,data_creacio:'2026-02-01Z',data_entrada_casa:null}]} as const;
 const destination=productCreationDestination({...result,items:[...result.items]},'?categoria_id=1&subcategoria_id=2&view=compact',catalog);
 expect(destination.to.search).toBe('?view=compact');const context=getCreationContext(destination.state.creationKey);expect(context).toMatchObject({ids:[22],filtersChanged:true,previousSearch:'?categoria_id=1&subcategoria_id=2&view=compact'});
 const compatible=productCreationDestination({...result,items:[...result.items]},'?categoria_id=3&view=compact',catalog);expect(compatible.to.search).toContain('categoria_id=3');
});

test('wrapper després de crear localitza les unitats noves, revela grup i ajusta filtres sense camps ocults',async()=>{
 const unit={id:1,producte_id:7,nom:'Body',subcategoria_id:4,estat_preparacio:'preparada',foto_ref:refB,data_creacio:'2026-02-01Z',data_entrada_casa:null};
 const {router,user}=mount('/items/nou?categoria_id=1&subcategoria_id=2&view=compact',async(url,init)=>{
   if(url==='/api/products')return Response.json({products:[{id:7,nom:'Body',category:{id:3,nom:'Descans'},subcategory:{id:4,nom:'Mantes'},foto_ref:refB,foto_versio:1}]});
   if(init?.method==='POST')return Response.json({created_count:1,items:[unit]},{status:201});
   return Response.json({groups:[group(7,6,refB,4)],filters:{categoria_id:null,subcategoria_id:null},corrections:[],inventory_count:6,matched_count:6});
 });
 await user.click(screen.getByRole('radio',{name:'Afegir unitats a un producte existent'}));await user.selectOptions(await screen.findByLabelText('Producte existent'),'7');await user.click(screen.getByRole('button',{name:'Registrar Items'}));
 await screen.findByRole('button',{name:'Plega Body'});expect(router.state.location.pathname).toBe('/items');expect(router.state.location.search).toBe('?view=compact');expect(screen.getByRole('button',{name:'Recuperar filtres anteriors'})).toBeTruthy();
 await waitFor(()=>expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
});

test('client de lectures rebutja DTO legacy sense fallback silenciós',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({groups:[{key:'legacy-name'}]})));
 await expect(fetchProductInventory()).rejects.toThrow('incompatible');
});
