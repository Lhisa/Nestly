/** Planned multipart contract only: not connected to the current POST route. */
export interface CreateItemsMultipartFields {
  /** JSON object with the same fields and numeric types as the current JSON POST. */
  data: string;
}

export interface CreateItemsMultipartParts {
  fields: CreateItemsMultipartFields;
  /** Exactly one file part named photo. Filename and declared MIME are untrusted. */
  photo: Uint8Array;
}
