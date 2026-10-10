import { useState } from 'react';
import type { Ref } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from './classification-api';

interface Props {
  value?: { categoryId: string; subcategoryId: string };
  onChange?: (value: { categoryId: string; subcategoryId: string }) => void;
  onBlur?: (field: 'categoria_id' | 'subcategoria_id') => void;
  errors?: { categoria_id?: string; subcategoria_id?: string };
  categoryRef?: Ref<HTMLSelectElement>; subcategoryRef?: Ref<HTMLSelectElement>;
  disabled?: boolean;
}
export function ClassificationSelectors(props: Props = {}) {
  const [local, setLocal] = useState({ categoryId: '', subcategoryId: '' });
  const { categoryId, subcategoryId } = props.value ?? local;
  const change = props.onChange ?? setLocal;
  const catalog = useQuery({ queryKey: ['categories'], queryFn: ({ signal }) => fetchCategories(signal), retry: false });
  const categories = catalog.data ?? [];
  const category = categories.find((entry) => String(entry.id) === categoryId);
  const subcategories = category?.subcategories ?? [];
  const selected = subcategories.some((entry) => String(entry.id) === subcategoryId) ? subcategoryId : '';
  if (catalog.isPending) return <p role="status">Carregant classificació…</p>;
  if (catalog.isError) return <div><p role="alert">No s’ha pogut carregar el catàleg de classificació.</p><button type="button" onClick={() => void catalog.refetch()}>Torna-ho a provar</button></div>;
  if (!categories.length) return <p role="status">No hi ha Categories disponibles.</p>;
  return <fieldset className="classification-fields"><legend>Classificació</legend><div className="field-pair">
    <div><label htmlFor="item-category">Categoria (obligatòria)</label>
      <select id="item-category" ref={props.categoryRef} value={category ? categoryId : ''} required disabled={props.disabled}
        aria-invalid={!!props.errors?.categoria_id} aria-describedby={props.errors?.categoria_id ? 'category-error' : undefined}
        onBlur={() => props.onBlur?.('categoria_id')} onChange={(event) => {
          const next = categories.find((entry) => String(entry.id) === event.target.value);
          change({ categoryId: event.target.value, subcategoryId: next?.subcategories.some((sub) => String(sub.id) === subcategoryId) ? subcategoryId : '' });
        }}><option value="">Selecciona una Categoria</option>{categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.nom}</option>)}</select>
      {props.errors?.categoria_id && <p className="field-error" id="category-error">{props.errors.categoria_id}</p>}
    </div><div><label htmlFor="item-subcategory">Subcategoria (obligatòria)</label>
      <select id="item-subcategory" ref={props.subcategoryRef} value={selected} required disabled={props.disabled || !category || !subcategories.length}
        aria-invalid={!!props.errors?.subcategoria_id} aria-describedby={`subcategory-help${props.errors?.subcategoria_id ? ' subcategory-error' : ''}`}
        onBlur={() => props.onBlur?.('subcategoria_id')} onChange={(event) => change({ categoryId, subcategoryId: event.target.value })}>
        <option value="">Selecciona una Subcategoria</option>{subcategories.map((entry) => <option key={entry.id} value={entry.id}>{entry.nom}</option>)}</select>
      <p id="subcategory-help" role="status">{!category ? 'Selecciona primer una Categoria.' : !subcategories.length ? 'Aquesta Categoria no té Subcategories disponibles.' : 'Selecciona explícitament una Subcategoria.'}</p>
      {props.errors?.subcategoria_id && <p className="field-error" id="subcategory-error">{props.errors.subcategoria_id}</p>}
    </div></div></fieldset>;
}
