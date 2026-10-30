// Dev helper: initialises the local Garage container (layout, bucket, access key) and writes the S3_* values to .env.local.
//   npm run db:up && npm run garage:setup
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const C = 'byteleaf-garage';
const BUCKET = 'byteleaf';
const KEY = 'byteleaf-dev';
const g = (...args) => execFileSync('docker', ['exec', C, '/garage', ...args], { encoding: 'utf8' });

function tryG(...args) {
  try {
    return g(...args);
  } catch (e) {
    return String(e.stdout ?? '') + String(e.stderr ?? '');
  }
}

for (let i = 0; i < 20; i++) {
  try { g('status'); break; } catch { await new Promise((r) => setTimeout(r, 1500)); }
}

const status = g('status');
const node = /^([0-9a-f]{16})\s/m.exec(status.split('\n').find((l) => /^[0-9a-f]{16}\s/.test(l)) ?? '')?.[1];
if (!node) throw new Error('Could not read the Garage node id:\n' + status);

const layout = g('layout', 'show');
if (!/Current cluster layout version: [1-9]/.test(layout)) {
  g('layout', 'assign', '-z', 'dc1', '-c', '1G', node);
  g('layout', 'apply', '--version', '1');
}
tryG('bucket', 'create', BUCKET);

let info = tryG('key', 'info', '--show-secret', KEY);
if (!/Key ID/.test(info)) info = g('key', 'create', KEY);
const id = /Key ID:\s*(\S+)/.exec(info)?.[1];
let secret = /Secret key:\s*(\S+)/.exec(info)?.[1];
if (!secret || secret === '(redacted)') secret = /Secret key:\s*(\S+)/.exec(g('key', 'info', '--show-secret', KEY))?.[1];
if (!id || !secret) throw new Error('Could not read the access key:\n' + info);
g('bucket', 'allow', '--read', '--write', '--owner', BUCKET, '--key', KEY);

const vars = { S3_ENDPOINT: 'http://127.0.0.1:3910', S3_REGION: 'garage', S3_BUCKET: BUCKET, S3_ACCESS_KEY: id, S3_SECRET_KEY: secret };
let env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
for (const [k, v] of Object.entries(vars)) {
  const line = `${k}=${v}`;
  env = new RegExp(`^${k}=.*$`, 'm').test(env) ? env.replace(new RegExp(`^${k}=.*$`, 'm'), line) : env.replace(/\n?$/, `\n${line}\n`);
}
writeFileSync('.env.local', env);
console.log(`Garage ready. Bucket "${BUCKET}", key ${id}. S3_* written to .env.local.`);
