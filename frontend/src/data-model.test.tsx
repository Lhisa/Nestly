// @vitest-environment jsdom
import {afterEach,expect,test,vi} from 'vitest';
import {selectFrontendModel,verifyBackendModel} from './data-model';
import {createApplicationRoutes} from './App';
afterEach(()=>vi.unstubAllGlobals());
test('selecció explícita i exclusiva de pàgines, legacy per defecte i URL conservades',()=>{
 expect(selectFrontendModel()).toBe('legacy');expect(()=>selectFrontendModel('invalid')).toThrow();
 const get=(mode:'legacy'|'products-v1')=>createApplicationRoutes(mode)[1].children!.filter(r=>r.path?.startsWith('/items')).map(r=>({path:r.path,name:(r.element as {type:{name:string}}).type.name}));
 expect(get('legacy').map(r=>r.name)).toEqual(['ItemsPage','CreateItemPage','ItemDetailPage']);
 expect(get('products-v1').map(r=>r.name)).toEqual(['ProductItemsPage','ProductCreateItemsPage','ProductItemDetailPage']);
 expect(get('legacy').map(r=>r.path)).toEqual(get('products-v1').map(r=>r.path));
});
test('handshake rebutja model diferent o servei indisponible sense fallback',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(Response.json({model:'legacy'})).mockResolvedValueOnce(Response.json({model:'products-v1'})).mockResolvedValueOnce(Response.json({}, {status:503}));vi.stubGlobal('fetch',fetch);
 await expect(verifyBackendModel('products-v1')).rejects.toThrow();await expect(verifyBackendModel('products-v1')).resolves.toBeUndefined();await expect(verifyBackendModel('legacy')).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(3);
});
