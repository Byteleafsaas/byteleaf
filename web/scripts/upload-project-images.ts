// Uploads the showcase project images and sets each project's cover and gallery.
//   npx tsx --env-file=.env.local --conditions=react-server scripts/upload-project-images.ts <folder>
// The folder holds p1-chatbot-cover.webp … p5-law-gallery-4.webp and ALT-TEXT.md (file name and alt text per image).
// Files go through the same checks and storage as admin uploads. Re-running replaces a project's images and removes the old files.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { connectDB } from '@/lib/server/db';
import { processImage } from '@/lib/server/images';
import { Project } from '@/lib/server/models';
import { SHOWCASE, STANDALONE } from '@/lib/projects-meta';
import { deleteObject, putObject } from '@/lib/server/storage';

const BY_PREFIX: Record<string, string> = { p1: SHOWCASE.chatbot.slug, p2: SHOWCASE.whatsapp.slug, p3: SHOWCASE.launch.slug, p4: SHOWCASE.admin.slug, p5: SHOWCASE.law.slug, p6: STANDALONE.yenza.slug, p7: STANDALONE.enrollsync.slug };

type Img = { key: string; width: number; height: number; alt: string };

function altTexts(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of readFileSync(join(dir, 'ALT-TEXT.md'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*$/);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

async function store(dir: string, file: string, alt: string): Promise<Img> {
  const body = readFileSync(join(dir, file));
  const meta = await sharp(body).metadata();
  // These are our own finished WebP files. Storing them as they are keeps them crisp; the admin's upload path re-encodes at quality 85.
  if (meta.format === 'webp' && meta.width && meta.height && body.length <= 5 * 1048576) {
    const key = `projects/${randomUUID()}.webp`;
    await putObject(key, body, 'image/webp');
    return { key, width: meta.width, height: meta.height, alt };
  }
  const img = await processImage(body);
  await putObject(img.key, img.body, img.contentType);
  return { key: img.key, width: img.width, height: img.height, alt };
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Usage: upload-project-images.ts <folder>');
  const alts = altTexts(dir);
  const files = readdirSync(dir).filter((f) => /^p[1-9]-.*\.webp$/.test(f)).sort();
  await connectDB();
  // Optional: name the projects to update, for example  p6 p7  (default: all of them).
  const only = process.argv.slice(3);
  for (const prefix of Object.keys(BY_PREFIX).filter((p) => !only.length || only.includes(p))) {
    const slug = BY_PREFIX[prefix];
    const mine = files.filter((f) => f.startsWith(prefix + '-'));
    const coverFile = mine.find((f) => f.includes('-cover'));
    const galleryFiles = mine.filter((f) => f.includes('-gallery-'));
    if (!coverFile) throw new Error(`No cover for ${slug}`);
    for (const f of mine) if (!alts.get(f)) throw new Error(`No alt text for ${f}`);
    const project = await Project.findOne({ slug });
    if (!project) throw new Error(`Project ${slug} not found. Run starter-projects first.`);

    const oldKeys = [project.cover?.key, ...(project.gallery as { key?: string | null }[]).map((g) => g.key)].filter((k): k is string => typeof k === "string" && k.length > 0);
    const cover = await store(dir, coverFile, alts.get(coverFile)!);
    const gallery: Img[] = [];
    for (const f of galleryFiles) gallery.push(await store(dir, f, alts.get(f)!));
    project.set({ cover, gallery });
    await project.save();
    for (const k of oldKeys) await deleteObject(k).catch(() => undefined);
    console.log(`${slug}: cover + ${gallery.length} gallery images (removed ${oldKeys.length} old)`);
  }
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
