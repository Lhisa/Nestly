import {useRef,useState} from 'react';
import {useForm} from 'react-hook-form';
import {useMutation,useQuery} from '@tanstack/react-query';
import {fetchProducts,createProductItems,ProductApiError} from './product-items-api';
import type {ProductItemsInput,ProductSummary,ProductCreationResponse,PreparationState} from './product-items-api';
import {ClassificationSelectors} from './ClassificationSelectors';
import {ItemPhoto} from './ItemPhoto';
import {ItemPhotoPicker} from './ItemPhotoPicker';
import {UnsavedChangesGuard} from './UnsavedChangesGuard';
import './items.css';
import './product-form.css';

interface Fields {nom:string;quantitat:string;estat_preparacio:PreparationState}
/** Component preparatori: no registrat a App.tsx. El pare futur decidirà la navegació. */
export function CreateProductItemsForm({onCreated}:{onCreated?:(result:ProductCreationResponse)=>void}={}){
  const [mode,setMode]=useState<'new'|'existing'>('new');
  const activeMode=useRef(mode);activeMode.current=mode;
  const [classification,setClassification]=useState({categoryId:'',subcategoryId:''});
  const [productId,setProductId]=useState('');
  const [snapshot,setSnapshot]=useState<ProductSummary>();
  const [files,setFiles]=useState<{new:File|null;existing:File|null}>({new:null,existing:null});
  const [photoErrors,setPhotoErrors]=useState({new:'',existing:''});
  const [confirmation,setConfirmation]=useState<{id:number;version:number;file:File}|null>(null);
  const [message,setMessage]=useState('');
  const [success,setSuccess]=useState<number|null>(null);
  const completed=useRef(false),sending=useRef(false),alert=useRef<HTMLParagraphElement>(null);
  const form=useForm<Fields>({defaultValues:{nom:'',quantitat:'1',estat_preparacio:'no_preparada'},shouldUnregister:false});
  const {register,handleSubmit,formState:{isDirty,errors}}=form;
  const products=useQuery({queryKey:['products'],queryFn:({signal})=>fetchProducts(signal),retry:false,enabled:mode==='existing'});
  const catalogProduct=products.data?.find(p=>String(p.id)===productId);
  const product=snapshot&&String(snapshot.id)===productId&&(!catalogProduct||snapshot.foto_versio>=catalogProduct.foto_versio)?snapshot:catalogProduct;
  const photo=files[mode],photoError=photoErrors[mode];
  const confirmed=!!product&&!!photo&&confirmation?.id===product.id&&confirmation.version===product.foto_versio&&confirmation.file===photo;
  const needsConfirmation=mode==='existing'&&!!photo&&product?.foto_ref!=null;
  const mutation=useMutation({mutationFn:({input,photo}:{input:ProductItemsInput;photo:File|null})=>createProductItems(input,photo),retry:false});
  const disabled=mutation.isPending||success!==null;
  const announce=(text:string)=>{setMessage(text);requestAnimationFrame(()=>alert.current?.focus());};
  const submit=handleSubmit(async values=>{
    if(sending.current||success!==null)return;
    if(photoError){document.getElementById('item-photo')?.focus();return;}
    if(mode==='new'&&(!classification.categoryId||!classification.subcategoryId)){announce('Selecciona una categoria i una subcategoria.');return;}
    if(mode==='existing'&&!product){announce('Selecciona explícitament un producte.');return;}
    if(needsConfirmation&&!confirmed){announce('Confirma que vols substituir la fotografia de totes les unitats.');document.getElementById('product-photo-confirmation')?.focus();return;}
    const base={quantitat:Number(values.quantitat),estat_preparacio:values.estat_preparacio};
    const input:ProductItemsInput=mode==='new'?{...base,product:{mode:'new',nom:values.nom,categoria_id:Number(classification.categoryId),subcategoria_id:Number(classification.subcategoryId)}}:{...base,product:{mode:'existing',producte_id:product!.id},...(photo?{photo_decision:{expected_version:product!.foto_versio,replace_confirmed:confirmed}}:{})};
    sending.current=true;setMessage('');
    let result:ProductCreationResponse;
    try{result=await mutation.mutateAsync({input,photo});}
    catch(error){
      if(error instanceof ProductApiError){
        if(error.product){setSnapshot(error.product);setConfirmation(null);}
        announce(error.message);
      }else announce('No podem confirmar el resultat. Revisa l’inventari abans de repetir l’operació.');
      sending.current=false;return;
    }
    sending.current=false;completed.current=true;setSuccess(result.created_count);
    onCreated?.(result);
  });
  const changeMode=(next:'new'|'existing')=>{setMode(next);form.clearErrors('nom');setConfirmation(null);setMessage('');};
  return <div className="item-form-page product-form-page">
    <header className="editorial-heading"><p className="eyebrow">Preparatius · A casa</p><h1>Un producte, cada unitat amb el seu lloc</h1><p>Tria explícitament què vols registrar. Els noms iguals poden correspondre a productes diferents.</p></header>
    <UnsavedChangesGuard dirty={isDirty||!!files.new||!!files.existing||!!productId||!!classification.categoryId} completed={completed}/>
    <form noValidate aria-label="Registrar Items per producte" aria-busy={mutation.isPending} onSubmit={submit}>
      <p ref={alert} tabIndex={-1} role={message?'alert':undefined} className={message?'general-error':undefined}>{message}</p>
      {success!==null&&<p role="status" className="success-message">S’han creat {success} Items.</p>}
      <section className="form-block"><h2>Què afegim a casa?</h2>
        <fieldset disabled={disabled}><legend>Identitat del producte</legend><div className="radio-pair">
          <label className="radio-card"><input type="radio" name="product-mode" checked={mode==='new'} onChange={()=>changeMode('new')}/>Crear un producte nou</label>
          <label className="radio-card"><input type="radio" name="product-mode" checked={mode==='existing'} onChange={()=>changeMode('existing')}/>Afegir unitats a un producte existent</label>
        </div></fieldset>
        {mode==='new'?<>
          <label htmlFor="product-name">Nom del producte</label><input id="product-name" disabled={disabled} aria-invalid={!!errors.nom} aria-describedby="product-name-help product-name-error" {...register('nom',{validate:value=>activeMode.current!=='new'||(!!value.trim()&&/\p{L}/u.test(value)&&[...value].length<=100&&!/[\u0000\uD800-\uDFFF]/u.test(value))||'El nom ha de contenir una lletra i tenir entre 1 i 100 caràcters.'})}/>
          <p id="product-name-help">Pots crear un producte diferent encara que ja n’hi hagi un amb aquest nom.</p><p id="product-name-error" className="field-error">{errors.nom?.message}</p>
          <ClassificationSelectors value={classification} disabled={disabled} onChange={setClassification}/>
        </>:<>
          {products.isPending?<p role="status">Carregant productes…</p>:products.isError?<div><p role="alert">No s’ha pogut carregar el catàleg.</p><button type="button" onClick={()=>void products.refetch()}>Reintenta el catàleg</button></div>:<>
            <label htmlFor="existing-product">Producte existent</label><select id="existing-product" disabled={disabled} value={productId} onChange={e=>{setProductId(e.target.value);setConfirmation(null);setMessage('');}}>
              <option value="">Selecciona un producte</option>{products.data?.map(p=><option key={p.id} value={p.id}>Producte {p.id} · {p.nom} · {p.category.nom} / {p.subcategory.nom}</option>)}
            </select>{products.data?.length===0&&<p>No hi ha productes disponibles. Pots crear-ne un de nou.</p>}
          </>}
          {product&&<div className="selected-product" aria-label="Producte seleccionat"><h3>{product.nom}</h3><p>{product.category.nom} · {product.subcategory.nom}</p><p className="item-identifier">Producte {product.id}</p><ItemPhoto reference={product.foto_ref} name={product.nom}/><p>Les unitats noves heretaran aquesta fotografia si no en selecciones una altra.</p></div>}
        </>}
      </section>
      <section className="form-block"><h2>Quantes unitats, com estan?</h2>
        <label htmlFor="product-quantity">Quantitat</label><input id="product-quantity" type="number" min="1" max="100" step="1" disabled={disabled} aria-invalid={!!errors.quantitat} aria-describedby="product-quantity-error" {...register('quantitat',{validate:value=>value.trim()!==''&&Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=100||'Indica una quantitat entera entre 1 i 100.'})}/><p id="product-quantity-error" className="field-error">{errors.quantitat?.message}</p>
        <fieldset disabled={disabled}><legend>Estat de preparació de les unitats noves</legend><div className="radio-pair">
          <label className="radio-card"><input type="radio" value="no_preparada" {...register('estat_preparacio')}/>No preparat</label>
          <label className="radio-card"><input type="radio" value="preparada" {...register('estat_preparacio')}/>Preparat</label>
        </div></fieldset>
      </section>
      <ItemPhotoPicker sharedWithProduct photo={photo} error={photoError} disabled={disabled} onChange={file=>{setFiles(current=>({...current,[mode]:file}));setConfirmation(null);}} onError={error=>setPhotoErrors(current=>({...current,[mode]:error}))}/>
      {needsConfirmation&&<div className="form-block product-confirmation"><p id="product-photo-warning">La fotografia nova substituirà l’actual per a totes les unitats del producte, incloses les registrades anteriorment.</p><label><input id="product-photo-confirmation" type="checkbox" disabled={disabled} checked={confirmed} aria-describedby="product-photo-warning" onChange={e=>setConfirmation(e.target.checked&&product&&photo?{id:product.id,version:product.foto_versio,file:photo}:null)}/>Confirmo la substitució de la fotografia de totes les unitats.</label></div>}
      <div className="form-actions"><button type="submit" className="primary" disabled={disabled}>{mutation.isPending?'Registrant…':'Registrar Items'}</button></div>
    </form>
  </div>;
}
