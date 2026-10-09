export interface Subcategory {
  id: number;
  nom: string;
}

export interface Category {
  id: number;
  nom: string;
  subcategories: Subcategory[];
}
