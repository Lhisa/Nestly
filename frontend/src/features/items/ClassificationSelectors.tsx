import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from './classification-api';

export function ClassificationSelectors() {
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const catalog = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => fetchCategories(signal),
    retry: false,
  });
  const categories = catalog.data ?? [];
  const category = categories.find((entry) => String(entry.id) === categoryId);
  const subcategories = category?.subcategories ?? [];
  const selectedSubcategory = subcategories.some((entry) => String(entry.id) === subcategoryId)
    ? subcategoryId : '';

  if (catalog.isPending) return <p role="status">Carregant classificació…</p>;
  if (catalog.isError) return (
    <div>
      <p role="alert">No s’ha pogut carregar el catàleg de classificació.</p>
      <button type="button" onClick={() => void catalog.refetch()}>Torna-ho a provar</button>
    </div>
  );
  if (categories.length === 0) return <p role="status">No hi ha Categories disponibles.</p>;

  return (
    <fieldset className="classification-fields">
      <legend>Classificació</legend>
      <div>
        <label htmlFor="item-category">Categoria (obligatòria)</label>
        <select id="item-category" value={category ? categoryId : ''} required onChange={(event) => {
          const nextId = event.target.value;
          const nextCategory = categories.find((entry) => String(entry.id) === nextId);
          setCategoryId(nextId);
          if (!nextCategory?.subcategories.some((entry) => String(entry.id) === subcategoryId)) {
            setSubcategoryId('');
          }
        }}>
          <option value="">Selecciona una Categoria</option>
          {categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.nom}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="item-subcategory">Subcategoria (obligatòria)</label>
        <select id="item-subcategory" value={selectedSubcategory} required disabled={!category || subcategories.length === 0}
          aria-describedby="subcategory-help" onChange={(event) => setSubcategoryId(event.target.value)}>
          <option value="">Selecciona una Subcategoria</option>
          {subcategories.map((entry) => <option key={entry.id} value={entry.id}>{entry.nom}</option>)}
        </select>
        <p id="subcategory-help" role="status">
          {!category ? 'Selecciona primer una Categoria.'
            : subcategories.length === 0 ? 'Aquesta Categoria no té Subcategories disponibles.'
              : 'Selecciona explícitament una Subcategoria.'}
        </p>
      </div>
    </fieldset>
  );
}
