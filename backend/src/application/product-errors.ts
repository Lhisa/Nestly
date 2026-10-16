import { ItemValidationError } from '../domain/item.js';

export class ProductInputError extends ItemValidationError {
  constructor() { super({product:'Les dades de creació no són vàlides.'}); }
}
export class ProductNotFoundError extends Error {
  constructor() { super('Producte inexistent.'); }
}
