export type PreparationState = 'no_preparada' | 'preparada';

export interface Item {
  id: number;
  nom: string;
  subcategoria_id: number;
  estat_preparacio: PreparationState;
  foto_ref: null;
  data_entrada_casa: null;
  data_creacio: Date;
}

export interface CreateHomeItemsInput {
  nom: string;
  categoria_id: number;
  subcategoria_id: number;
  quantitat: number;
  estat_preparacio: PreparationState;
}

export class ItemValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super('Hi ha camps invàlids');
    this.name = 'ItemValidationError';
  }
}

export function validateHomeItems(input: CreateHomeItemsInput): CreateHomeItemsInput {
  const errors: Record<string, string> = {};
  const nom = typeof input.nom === 'string' ? input.nom.trim() : '';
  if (!nom || !/\p{L}/u.test(nom) || [...nom].length > 100) {
    errors.nom = 'El nom ha de contenir una lletra i tenir entre 1 i 100 caràcters.';
  }
  if (!Number.isInteger(input.quantitat) || input.quantitat < 1 || input.quantitat > 100) {
    errors.quantitat = 'La quantitat ha de ser un enter entre 1 i 100.';
  }
  for (const field of ['categoria_id', 'subcategoria_id'] as const) {
    if (!Number.isInteger(input[field]) || input[field] < 1) errors[field] = 'Cal seleccionar un identificador vàlid.';
  }
  if (input.estat_preparacio !== 'no_preparada' && input.estat_preparacio !== 'preparada') {
    errors.estat_preparacio = 'Cal seleccionar un estat de preparació vàlid.';
  }
  if (Object.keys(errors).length) throw new ItemValidationError(errors);
  return { ...input, nom };
}
