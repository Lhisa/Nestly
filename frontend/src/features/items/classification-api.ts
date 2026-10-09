export interface Category {
  id: number;
  nom: string;
  subcategories: { id: number; nom: string }[];
}

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const response = await fetch('/api/categories', { signal });
  if (!response.ok) {
    throw new Error('No s’ha pogut carregar el catàleg de classificació.');
  }
  const body: { categories: Category[] } = await response.json();
  return body.categories;
}
