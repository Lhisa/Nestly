/** Error de transport del nou adaptador; no afecta les rutes legacy. */
export class ProductTransportError extends Error {
  constructor() { super('Content-Type no admès.'); }
}
