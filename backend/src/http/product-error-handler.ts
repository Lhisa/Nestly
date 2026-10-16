import type { ErrorRequestHandler } from 'express';
import { mapProductCreationError } from './product-error-mapping.js';

/** S'instal·la només dins dels routers preparatoris injectables. */
export const productErrorHandler: ErrorRequestHandler=(error:unknown,_request,response,next)=>{
  if(response.headersSent){next(error);return;}
  const mapped=mapProductCreationError(error);
  response.status(mapped.status).json(mapped.body);
};
