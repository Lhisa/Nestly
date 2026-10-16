import multer from 'multer';
import type { Request, Response } from 'express';

export class PhotoHttpError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10_000_000, files: 1, fields: 1, parts: 2, fieldSize: 16_384, fieldNameSize: 32, headerPairs: 32 },
}).single('photo');
let active = 0;

/** Bounds all in-memory multipart operations, not just the decoder. */
export function acquirePhotoOperation(): () => void {
  if (active >= 2) throw new PhotoHttpError(503, 'PHOTO_BUSY');
  active++;
  return () => { active--; };
}

export async function readCreationMultipart(request: Request, response: Response): Promise<{ data: unknown; bytes: Uint8Array }> {
  await new Promise<void>((resolve, reject) => upload(request, response, error => {
    if (error) {
      if (error instanceof multer.MulterError) {
        reject(new PhotoHttpError(error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FIELD_VALUE' ? 413 : 400, 'INVALID_MULTIPART'));
      } else reject(new PhotoHttpError(400, 'INVALID_MULTIPART'));
    } else resolve();
  }));
  if (!request.file || request.file.size > 10_000_000) {
    throw new PhotoHttpError(request.file ? 413 : 400, 'INVALID_MULTIPART');
  }
  const fields = request.body as Record<string, unknown> | undefined;
  if (!fields || Object.keys(fields).length !== 1 || typeof fields.data !== 'string') {
    throw new PhotoHttpError(400, 'INVALID_MULTIPART');
  }
  try { return { data: JSON.parse(fields.data) as unknown, bytes: request.file.buffer }; }
  catch { throw new PhotoHttpError(400, 'INVALID_MULTIPART'); }
}
