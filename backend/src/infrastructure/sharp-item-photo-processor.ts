import sharp from 'sharp';
import type { ItemPhotoProcessor, NormalizedItemPhoto } from '../application/item-photos.js';

export const PHOTO_MAX_BYTES = 10_000_000;
export const PHOTO_MAX_PIXELS = 24_000_000;
export const PHOTO_MAX_CONCURRENT = 2;
let active = 0;

import { PhotoProcessingError } from '../application/item-photos.js';
export { PhotoProcessingError } from '../application/item-photos.js';

export class SharpItemPhotoProcessor implements ItemPhotoProcessor {
  async normalize(input: Uint8Array): Promise<NormalizedItemPhoto> {
    if (input.byteLength > PHOTO_MAX_BYTES) throw new PhotoProcessingError('SIZE');
    if (active >= PHOTO_MAX_CONCURRENT) throw new PhotoProcessingError('BUSY');
    active++;
    try {
      // Copy so caller mutations cannot change bytes between inspection and decoding.
      const bytes = Buffer.from(input);
      const options = { failOn: 'warning' as const, limitInputPixels: PHOTO_MAX_PIXELS };
      if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        // libvips may expose only the first APNG frame; inspect real PNG chunk types.
        for (let offset = 8; offset + 12 <= bytes.length;) {
          const length = bytes.readUInt32BE(offset);
          if (length > bytes.length - offset - 12) throw new PhotoProcessingError('INVALID');
          if (bytes.toString('ascii', offset + 4, offset + 8) === 'acTL') throw new PhotoProcessingError('ANIMATED');
          offset += length + 12;
        }
      }
      const metadata = await sharp(bytes, options).metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) {
        // HEIC/HEIF remains pending a verified decoder; AVIF is not an approved input.
        throw new PhotoProcessingError('FORMAT');
      }
      if ((metadata.pages ?? 1) > 1) throw new PhotoProcessingError('ANIMATED');
      if (!metadata.width || !metadata.height || metadata.width * metadata.height > PHOTO_MAX_PIXELS) {
        throw new PhotoProcessingError('PIXELS');
      }
      const output = await sharp(bytes, options).rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 }).toBuffer();
      return { bytes: output, format: 'webp' };
    } catch (error) {
      if (error instanceof PhotoProcessingError) throw error;
      // Do not expose decoder messages or input metadata to HTTP consumers.
      throw new PhotoProcessingError('INVALID');
    } finally {
      active--;
    }
  }
}
