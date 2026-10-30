import 'server-only';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

// Object storage. Production: your Garage (S3-compatible) via S3_* env vars. Dev without S3_ENDPOINT: ./storage on disk.
// Only this file knows which one is in use.

export type StoredObject = { body: Buffer; contentType: string };

const useS3 = !!env.S3_ENDPOINT;
let client: S3Client | null = null;
const s3 = () =>
  (client ??= new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: true, // Garage addresses buckets by path
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
  }));

const DISK_ROOT = path.join(process.cwd(), 'storage');
const diskPath = (key: string) => {
  const p = path.join(DISK_ROOT, key);
  if (!p.startsWith(DISK_ROOT + path.sep)) throw new Error('Invalid storage key');
  return p;
};
const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const typeOf = (key: string) => TYPES[key.split('.').pop() ?? ''] ?? 'application/octet-stream';

export async function putObject(key: string, body: Buffer, contentType: string) {
  if (useS3) {
    await s3().send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
    return;
  }
  const p = diskPath(key);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, body);
}

export async function getObject(key: string): Promise<StoredObject | null> {
  try {
    if (useS3) {
      const r = await s3().send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
      const bytes = await r.Body!.transformToByteArray();
      return { body: Buffer.from(bytes), contentType: r.ContentType ?? typeOf(key) };
    }
    return { body: await readFile(diskPath(key)), contentType: typeOf(key) };
  } catch (e) {
    const code = (e as { name?: string; code?: string }).name ?? (e as { code?: string }).code;
    if (code === 'NoSuchKey' || code === 'ENOENT' || code === 'NotFound') return null;
    throw e;
  }
}

export async function deleteObject(key: string) {
  try {
    if (useS3) await s3().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    else await rm(diskPath(key), { force: true });
  } catch (e) {
    console.error('[storage] could not delete', key, e);
  }
}

export const storageDriver = useS3 ? 's3' : 'disk';
