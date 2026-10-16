import { afterEach, expect, test, vi } from 'vitest';
import sharp from 'sharp';
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SharpItemPhotoProcessor, PHOTO_MAX_BYTES } from '../src/infrastructure/sharp-item-photo-processor.js';
import { LocalItemPhotoStorage } from '../src/infrastructure/local-item-photo-storage.js';

const diskFailure = vi.hoisted(() => ({ enabled: false }));
vi.mock('node:fs/promises', async importOriginal => {
  const fs = await importOriginal<typeof import('node:fs/promises')>();
  return { ...fs, open: async (...args: Parameters<typeof fs.open>) => {
    const handle = await fs.open(...args);
    if (diskFailure.enabled) handle.writeFile = async () => { throw new Error('simulated ENOSPC'); };
    return handle;
  } };
});
const roots: string[] = [];
afterEach(async () => { diskFailure.enabled = false; await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function root() { const value = await mkdtemp(join(tmpdir(), 'nestly-photo-')); roots.push(value); return value; }
const processor = new SharpItemPhotoProcessor();
function image(width = 80, height = 40) { return sharp({ create: { width, height, channels: 3, background: '#aabbcc' } }); }

test.each(['jpeg', 'png', 'webp'] as const)('decodes real %s and keeps small dimensions', async format => {
  const result = await processor.normalize(await image().toFormat(format).toBuffer());
  const info = await sharp(result.bytes).metadata();
  expect(result.format).toBe('webp');
  expect(info.format).toBe('webp');
  expect([info.width, info.height]).toEqual([80, 40]);
  expect(info.exif).toBeUndefined();
  expect(info.icc).toBeUndefined();
});
test('resizes long side to 1600', async () => {
  const result = await processor.normalize(await image(3200, 200).png().toBuffer());
  const info = await sharp(result.bytes).metadata();
  expect([info.width, info.height]).toEqual([1600, 100]);
});
test('corrects EXIF orientation and strips metadata', async () => {
  const bytes = await image().withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const info = await sharp((await processor.normalize(bytes)).bytes).metadata();
  expect([info.width, info.height]).toEqual([40, 80]);
  expect(info.orientation).toBeUndefined();
  expect(info.exif).toBeUndefined();
});
test('rejects corruption, unsupported real format and oversized bytes', async () => {
  await expect(processor.normalize(Buffer.from('not an image'))).rejects.toMatchObject({ code: 'INVALID' });
  await expect(processor.normalize(await image().tiff().toBuffer())).rejects.toMatchObject({ code: 'FORMAT' });
  await expect(processor.normalize(new Uint8Array(PHOTO_MAX_BYTES + 1))).rejects.toMatchObject({ code: 'SIZE' });
  const jpeg = await image().jpeg().toBuffer();
  await expect(processor.normalize(jpeg.subarray(0, jpeg.length / 2))).rejects.toMatchObject({ code: 'INVALID' });
});
test('rejects excessive pixels without decoding full image', async () => {
  const bytes = await image(5000, 5000).png().toBuffer();
  await expect(processor.normalize(bytes)).rejects.toMatchObject({ code: 'INVALID', message: 'Photo processing failed: INVALID' });
});
test('rejects animated WebP', async () => {
  const pixels = Buffer.concat([Buffer.alloc(12, 0), Buffer.alloc(12, 255)]); const bytes = await sharp(pixels, { raw: { width: 2, height: 4, channels: 3, pageHeight: 2 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  expect((await sharp(bytes).metadata()).pages).toBe(2);
  await expect(processor.normalize(bytes)).rejects.toMatchObject({ code: 'ANIMATED' });
});
test('bounds concurrent processing and releases slots after errors', async () => {
  const bytes = await image(1600, 1600).png().toBuffer();
  const first = processor.normalize(bytes);
  const second = processor.normalize(bytes);
  await expect(processor.normalize(bytes)).rejects.toMatchObject({ code: 'BUSY' });
  await Promise.all([first, second]);
  await expect(processor.normalize(bytes)).resolves.toMatchObject({ format: 'webp' });
});
test('stores one file per save using unique internal names', async () => {
  const directory = await root();
  const storage = new LocalItemPhotoStorage(directory, async () => false);
  const photo = await processor.normalize(await image().png().toBuffer());
  const a = await storage.save(photo); const b = await new LocalItemPhotoStorage(directory, async () => false).save(photo);
  expect(a).toMatch(/^items\/[0-9a-f-]{36}\.webp$/);
  expect(a).not.toBe(b);
  expect(await readFile(join(directory, a))).toEqual(Buffer.from(photo.bytes));
  expect(await readdir(join(directory, 'items'))).toHaveLength(2);
  await storage.removeIfUnreferenced(a);
  await storage.removeIfUnreferenced(a);
  expect(await readdir(join(directory, 'items'))).toHaveLength(1);
});
test('preserves files when referenced or checks fail', async () => {
  const directory = await root();
  const check = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
  const storage = new LocalItemPhotoStorage(directory, check);
  const ref = await storage.save(await processor.normalize(await image().png().toBuffer()));
  await expect(storage.removeIfUnreferenced(ref)).rejects.toThrow();
  expect(await readFile(join(directory, ref))).toBeDefined();
  check.mockRejectedValue(new Error('database unavailable'));
  await expect(storage.removeIfUnreferenced(ref)).rejects.toThrow('database unavailable');
  expect(await readFile(join(directory, ref))).toBeDefined();
});
test('rejects traversal and relative roots', async () => {
  expect(() => new LocalItemPhotoStorage('relative', async () => false)).toThrow();
  const storage = new LocalItemPhotoStorage(await root(), async () => false);
  for (const ref of ['../other.webp', 'items/../../x', 'items\\x.webp', 'C:/x.webp', 'items/unknown.webp']) {
    await expect(storage.removeIfUnreferenced(ref)).rejects.toThrow('Invalid photo reference');
  }
});
test('rejects roots inside repositories and surfaces disk errors', async () => {
  const directory = await root();
  await mkdir(join(directory, '.git'));
  await expect(new LocalItemPhotoStorage(join(directory, 'photos'), async () => false).save({ bytes: new Uint8Array(), format: 'webp' })).rejects.toThrow('repository');
  const blocked = join(await root(), 'file');
  await writeFile(blocked, 'occupied');
  await expect(new LocalItemPhotoStorage(blocked, async () => false).save({ bytes: new Uint8Array(), format: 'webp' })).rejects.toThrow();
});


test('rejects APNG even if the decoder would return only its first frame', async () => {
  const png = await image().png().toBuffer();
  // Animation control chunk declaration; rejected before pixel decoding.
  const chunk = Buffer.alloc(20);
  chunk.writeUInt32BE(8, 0); chunk.write('acTL', 4); chunk.writeUInt32BE(2, 8);
  const animated = Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]);
  await expect(processor.normalize(animated)).rejects.toMatchObject({ code: 'ANIMATED' });
});
test('cleans an incomplete file after write failure', async () => {
  const directory = await root();
  const storage = new LocalItemPhotoStorage(directory, async () => false);
  const photo = await processor.normalize(await image().png().toBuffer());
  diskFailure.enabled = true;
  await expect(storage.save(photo)).rejects.toThrow('simulated ENOSPC');
  expect(await readdir(join(directory, 'items'))).toEqual([]);
});

test('accepts exactly 24 million pixels and rejects even one extra row', async () => {
  const accepted = await image(6000, 4000).png().toBuffer();
  await expect(processor.normalize(accepted)).resolves.toMatchObject({ format: 'webp' });
  const rejected = await image(6000, 4001).png().toBuffer();
  await expect(processor.normalize(rejected)).rejects.toMatchObject({ code: 'INVALID' });
});
test('releases concurrency slots after decoder errors', async () => {
  await Promise.all([
    expect(processor.normalize(Buffer.from('bad'))).rejects.toMatchObject({ code: 'INVALID' }),
    expect(processor.normalize(Buffer.from('bad'))).rejects.toMatchObject({ code: 'INVALID' }),
  ]);
  const bytes = await image().png().toBuffer();
  await Promise.all([processor.normalize(bytes), processor.normalize(bytes)]);
});
test('only the operation that generated a file may compensate it', async () => {
  const directory = await root();
  const owner = new LocalItemPhotoStorage(directory, async () => false);
  const check = vi.fn(async () => false);
  const other = new LocalItemPhotoStorage(directory, check);
  const photo = await processor.normalize(await image().png().toBuffer());
  const ref = await owner.save(photo);
  await expect(other.removeIfUnreferenced(ref)).rejects.toThrow('not generated by this operation');
  expect(check).not.toHaveBeenCalled();
  expect(await readFile(join(directory, ref))).toBeDefined();
  await expect(owner.save(photo)).rejects.toThrow('already used');
  await owner.removeIfUnreferenced(ref);
});
test('keeps incomplete writes when the reference check fails or returns uncertainty', async () => {
  for (const check of [
    async () => { throw Error('database unavailable'); },
    async () => true,
    async () => undefined as unknown as boolean,
  ]) {
    const directory = await root();
    const storage = new LocalItemPhotoStorage(directory, check);
    const photo = await processor.normalize(await image().png().toBuffer());
    diskFailure.enabled = true;
    await expect(storage.save(photo)).rejects.toThrow('simulated ENOSPC');
    diskFailure.enabled = false;
    expect(await readdir(join(directory, 'items'))).toHaveLength(1);
  }
});
test('rejects a syntactically valid reference without operation ownership', async () => {
  const check = vi.fn(async () => false);
  const storage = new LocalItemPhotoStorage(await root(), check);
  await expect(storage.removeIfUnreferenced('items/12345678-1234-4123-8123-123456789abc.webp')).rejects.toThrow('not generated by this operation');
  expect(check).not.toHaveBeenCalled();
});

test('rejects linked roots and items directories without touching their target', async () => {
  const target = await root();
  const parent = await root();
  const linkedRoot = join(parent, 'linked');
  await symlink(target, linkedRoot, 'junction');
  await expect(new LocalItemPhotoStorage(linkedRoot, async () => false).save({ bytes: new Uint8Array(), format: 'webp' })).rejects.toThrow('Linked photo root');
  expect(await readdir(target)).toEqual([]);
  const directory = await root();
  await symlink(target, join(directory, 'items'), 'junction');
  await expect(new LocalItemPhotoStorage(directory, async () => false).save({ bytes: new Uint8Array(), format: 'webp' })).rejects.toThrow('Linked photo directory');
  expect(await readdir(target)).toEqual([]);
});
