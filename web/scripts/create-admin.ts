// Create (or reset the password of) an admin user. There is no public sign-up.
//   npm run create-admin -- --email you@byteleaf.co.za --name Gerald
// The password is read from the ADMIN_PASSWORD env var, or prompted for (input is hidden).
import { createInterface } from 'node:readline';
import { connectDB } from '@/lib/server/db';
import { hashPassword, passwordProblems } from '@/lib/server/password';
import { AdminUser } from '@/lib/server/models';
import mongoose from 'mongoose';

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function promptHidden(q: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const w = (rl as unknown as { _writeToOutput: (s: string) => void });
    process.stdout.write(q);
    w._writeToOutput = () => {};
    rl.question('', (a) => {
      rl.close();
      process.stdout.write('\n');
      resolve(a);
    });
  });
}

async function main() {
  const email = arg('email')?.toLowerCase().trim();
  const name = arg('name')?.trim() || 'Admin';
  if (!email) throw new Error('Usage: npm run create-admin -- --email you@example.com [--name Gerald]');
  const password = process.env.ADMIN_PASSWORD || (await promptHidden('Password: '));
  const problems = passwordProblems(password);
  if (problems.length) throw new Error(`Password needs: ${problems.join(', ')}.`);

  await connectDB();
  const passwordHash = await hashPassword(password);
  const existing = await AdminUser.findOne({ email });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.name = name;
    await existing.save();
    console.log(`Updated admin ${email}.`);
  } else {
    await AdminUser.create({ email, name, passwordHash });
    console.log(`Created admin ${email}.`);
  }
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
