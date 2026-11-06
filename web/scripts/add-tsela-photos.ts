// Puts the illustrated car pictures on the Tsela Mobile Wash sample site.
//   npx tsx --env-file=.env.local --conditions=react-server scripts/add-tsela-photos.ts <folder>
// <folder> holds home-driveway.webp, hatch-full-wash.webp, bakkie-express.webp, suv-interior.webp, sedan-polish.webp,
// mpv-wash.webp and hatch-interior.webp. Each replaces the drawn placeholder with the same id, in the saved draft and the
// live site together, so nothing shows as waiting to publish. Safe to re-run: the old file is removed.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { connectDB } from '@/lib/server/db';
import { mutate } from '@/lib/server/launch/store';
import { deleteObject, putObject } from '@/lib/server/storage';
import type { Photo } from '@/lib/launch/types';

const PICTURES: { file: string; id: string; alt: string }[] = [
  { file: 'home-driveway', id: 'p1', alt: 'Illustration of a freshly washed teal hatchback in a driveway, with the Tsela van parked behind it' },
  { file: 'hatch-full-wash', id: 'p2', alt: 'Illustration of a hatchback covered in foam while a Tsela washer sponges it down' },
  { file: 'bakkie-express', id: 'p3', alt: 'Illustration of a white bakkie being rinsed with a hose' },
  { file: 'suv-interior', id: 'p4', alt: 'Illustration of an SUV with its boot open for an interior clean, and a close-up of a seat being shampooed' },
  { file: 'sedan-polish', id: 'p5', alt: 'Illustration of a navy sedan being machine polished' },
  { file: 'mpv-wash', id: 'p6', alt: 'Illustration of a family car with foam on the roof and a bucket beside it' },
  { file: 'hatch-interior', id: 'p7', alt: 'Illustration of a hatchback with its boot open for an interior deep clean, and a close-up of a shampooed seat' },
];

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Usage: add-tsela-photos.ts <folder>');
  await connectDB();
  const stored = new Map<string, { key: string; w: number; alt: string }>();
  for (const p of PICTURES) {
    const body = readFileSync(join(dir, p.file + '.webp'));
    const meta = await sharp(body).metadata();
    if (meta.format !== 'webp' || !meta.width) throw new Error(`${p.file} is not a WebP image`);
    const key = `projects/${randomUUID()}.webp`;
    await putObject(key, body, 'image/webp');
    stored.set(p.id, { key, w: meta.width, alt: p.alt });
  }
  const oldKeys: string[] = [];
  const swap = (photos: Photo[]): Photo[] =>
    photos.map((ph) => {
      const s = stored.get(ph.id);
      if (!s) return ph;
      if (ph.kind === 'upload' && ph.key) oldKeys.push(ph.key);
      return { ...ph, kind: 'upload', key: s.key, w: s.w, alt: s.alt };
    });
  const r = await mutate((state) => ({
    state: { ...state, live: { ...state.live, photos: swap(state.live.photos) }, saved: { ...state.saved, photos: swap(state.saved.photos) } },
    result: null,
  }));
  if (!r.ok) throw new Error(r.error);
  // the draft and live copies point at the same files, so remove each old file once
  for (const k of new Set(oldKeys)) await deleteObject(k).catch(() => undefined);
  console.log(`Tsela photos set: ${stored.size} pictures (removed ${new Set(oldKeys).size} old files).`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
