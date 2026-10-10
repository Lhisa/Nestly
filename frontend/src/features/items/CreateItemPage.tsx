import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { ClassificationSelectors } from './ClassificationSelectors';
import { createItems, ItemsApiError } from './items-api';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import './items.css';

interface Fields { nom: string; categoria_id: string; subcategoria_id: string; quantitat: string; estat_preparacio: 'no_preparada' | 'preparada' }
const fieldOrder: (keyof Fields)[] = ['nom', 'categoria_id', 'subcategoria_id', 'quantitat', 'estat_preparacio'];
export function CreateItemPage() {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [generalError, setGeneralError] = useState('');
  const completed = useRef(false);
  const submitting = useRef(false);
  const mutation = useMutation({ mutationFn: createItems, retry: false });
  const form = useForm<Fields>({ mode: 'onBlur', defaultValues: { nom: '', categoria_id: '', subcategoria_id: '', quantitat: '1', estat_preparacio: 'no_preparada' } });
  const { register, control, watch, setValue, setError, setFocus, handleSubmit, formState: { errors, isDirty } } = form;
  const categoryId = watch('categoria_id');
  const subcategoryId = watch('subcategoria_id');
  const submit = handleSubmit(async (values) => {
    if (submitting.current) return;
    submitting.current = true; setGeneralError('');
    try {
      const result = await mutation.mutateAsync({ nom: values.nom.trim(), categoria_id: Number(values.categoria_id), subcategoria_id: Number(values.subcategoria_id), quantitat: Number(values.quantitat), estat_preparacio: values.estat_preparacio });
      completed.current = true;
      form.reset(values);
      await cache.invalidateQueries({ queryKey: ['items'] });
      void navigate('/items', { state: { createdCount: result.created_count } });
    } catch (error) {
      if (error instanceof ItemsApiError && error.fieldErrors) {
        let first: keyof Fields | undefined;
        for (const field of fieldOrder) if (error.fieldErrors[field]) { setError(field, { type: 'server', message: error.fieldErrors[field] }); first ??= field; }
        if (first) setFocus(first); else setGeneralError(error.message);
      } else setGeneralError('No s’ha pogut confirmar el registre. Revisa el llistat abans de tornar-ho a intentar.');
    } finally { submitting.current = false; }
  });
  return <div className="item-form-page"><header className="editorial-heading"><p className="eyebrow">Preparatius · A casa</p><h1>Un lloc per a cada petit detall</h1><p>Registra els objectes que ja tens a casa. Cada unitat tindrà el seu propi registre.</p></header>
    <UnsavedChangesGuard dirty={isDirty} completed={completed} />
    <form noValidate onSubmit={submit} aria-label="Registrar Items" aria-busy={mutation.isPending}>
      {generalError && <p className="general-error" role="alert">{generalError}</p>}
      <section className="form-block" aria-labelledby="identity-heading"><header><span className="editorial-number" aria-hidden="true">01</span><div><h2 id="identity-heading">Què afegim a casa?</h2><p>Un nom i una classificació per trobar-ho fàcilment.</p></div></header>
        <label htmlFor="item-name">Nom de l’Item (obligatori)</label><input disabled={mutation.isPending} id="item-name" aria-invalid={!!errors.nom} aria-describedby="name-help name-error" {...register('nom', { validate: (value) => { const name = value.trim(); return !!name && /\p{L}/u.test(name) && [...name].length <= 100 || 'El nom ha de contenir una lletra i tenir entre 1 i 100 caràcters.'; } })} />
        <p id="name-help">Fins a 100 caràcters. Pots incloure números i símbols juntament amb lletres.</p><p className="field-error" id="name-error">{errors.nom?.message}</p>
        <Controller name="categoria_id" control={control} rules={{ required: 'Selecciona una Categoria.' }} render={({ field: category }) =>
          <Controller name="subcategoria_id" control={control} rules={{ required: 'Selecciona una Subcategoria.' }} render={({ field: subcategory }) =>
            <ClassificationSelectors disabled={mutation.isPending} value={{ categoryId, subcategoryId }} categoryRef={category.ref} subcategoryRef={subcategory.ref}
              onBlur={(field) => field === 'categoria_id' ? category.onBlur() : subcategory.onBlur()}
              onChange={(value) => { category.onChange(value.categoryId); setValue('subcategoria_id', value.subcategoryId, { shouldDirty: true, shouldValidate: !!errors.subcategoria_id }); }}
              errors={{ categoria_id: errors.categoria_id?.message, subcategoria_id: errors.subcategoria_id?.message }} />
          } />
        } />
      </section>
      <section className="form-block" aria-labelledby="units-heading"><header><span className="editorial-number" aria-hidden="true">02</span><div><h2 id="units-heading">Quantes unitats, com estan?</h2><p>La preparació escollida s’aplicarà a totes les unitats.</p></div></header>
        <label htmlFor="item-quantity">Quantitat (obligatòria)</label><input disabled={mutation.isPending} id="item-quantity" type="number" min="1" max="100" step="1" inputMode="numeric" aria-invalid={!!errors.quantitat} aria-describedby="quantity-help quantity-error" {...register('quantitat', { validate: (value) => { const n = Number(value); return value.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= 100 || 'La quantitat ha de ser un enter entre 1 i 100.'; } })} />
        <p id="quantity-help">D’1 a 100. Cada unitat serà un Item independent.</p><p className="field-error" id="quantity-error">{errors.quantitat?.message}</p>
        <fieldset className="preparation" disabled={mutation.isPending}><legend>Estat de preparació</legend><div className="radio-pair">
          <label className="radio-card"><input type="radio" value="no_preparada" {...register('estat_preparacio', { validate: (value) => value === 'no_preparada' || value === 'preparada' || 'Selecciona un estat vàlid.' })} /><span>No preparat</span></label>
          <label className="radio-card"><input type="radio" value="preparada" {...register('estat_preparacio')} /><span>Preparat</span></label>
        </div>{errors.estat_preparacio && <p className="field-error" role="alert">{errors.estat_preparacio.message}</p>}</fieldset>
      </section>
      <div className="form-actions"><button type="button" disabled={mutation.isPending} onClick={() => void navigate('/items')}>Cancel·lar</button><button className="primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Registrant…' : 'Registrar Items'}</button></div>
    </form></div>;
}
