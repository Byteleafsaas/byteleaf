// Fires many concurrent number allocations and checks none repeat. Needs the dev database.
//   npx tsx --env-file=.env.local --conditions=react-server scripts/check-numbering.ts
import mongoose from 'mongoose';
import { allocateNumber } from '@/lib/server/billing';
import { connectDB } from '@/lib/server/db';

async function main() {
  await connectDB();
  const nums = await Promise.all(Array.from({ length: 25 }, () => allocateNumber('invoice')));
  const unique = new Set(nums);
  console.log(`allocated ${nums.length}, unique ${unique.size}`);
  console.log([...nums].sort().join(', '));
  if (unique.size !== nums.length) throw new Error('DUPLICATE NUMBERS ALLOCATED');
  console.log('OK: sequential and unique under concurrency');
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
