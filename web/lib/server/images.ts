import 'server-only';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 2400;
const FORMATS = { jpeg: { ext: 'jpg', type: 'image/jpeg' }, png: { ext: 'png', type: 'image/png' }, webp: { ext: 'webp', type: 'image/webp' } } as const;

export type ProcessedImage = { key: string; body: Buffer; contentType: string; width: number; height: number };

export class ImageError extends Error {}

/**
 * Validates and normalises an uploaded image. The format is read from the file's own bytes (never trusted from the
 * browser's MIME type), EXIF rotation is applied then metadata (including GPS) is stripped, and anything larger
 * than 2400px on its long side is scaled down. `next/image` then serves responsive sizes from the stored original.
 */
export async function processImage(input: Buffer, folder = 'projects'): Promise<ProcessedImage> {
  if (input.length > MAX_IMAGE_BYTES) throw new ImageError('Images must be 5 MB or smaller.');
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new ImageError('That file is not a valid image.');
  }
  const fmt = meta.format && meta.format in FORMATS ? FORMATS[meta.format as keyof typeof FORMATS] : null;
  if (!fmt) throw new ImageError('Use a JPG, PNG or WebP image.');

  let pipeline = sharp(input).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true });
  pipeline = fmt.ext === 'jpg' ? pipeline.jpeg({ quality: 85, mozjpeg: true }) : fmt.ext === 'png' ? pipeline.png({ compressionLevel: 9 }) : pipeline.webp({ quality: 85 });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { key: `${folder}/${randomUUID()}.${fmt.ext}`, body: data, contentType: fmt.type, width: info.width, height: info.height };
}

/** Keys we ever hand out look like projects/<uuid>.<ext>. Anything else is rejected before touching storage. */
export const IMAGE_KEY = /^projects\/[a-f0-9-]{36}\.(jpg|png|webp)$/;
