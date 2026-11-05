// Connects a business to its real WhatsApp number, or checks what is still missing.
//   npm run wa-connect -- --slug lerato --phone-number-id 123456789012345
//   npm run wa-connect -- --slug lerato            (just checks, changes nothing)
//   npm run wa-connect -- --slug lerato --clear    (goes back to the website-only demo)
// The phone number id comes from Meta's developer portal (WhatsApp > API setup). It is not the phone number itself.
import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';
import { env } from '@/lib/server/env';
import { WaBusiness, WaService, WaStaff } from '@/lib/server/models';

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const slug = arg('slug') ?? 'lerato';
  const id = arg('phone-number-id')?.trim();
  await connectDB();
  const b = await WaBusiness.findOne({ slug });
  if (!b) throw new Error(`No business called "${slug}". For the demo salon run npm run seed-whatsapp first.`);

  if (process.argv.includes('--clear')) {
    b.phoneNumberId = undefined;
    b.numberProblemAt = null;
    await b.save();
    console.log(`${slug} is back to the website-only demo.`);
  } else if (id) {
    if (!/^\d{8,20}$/.test(id)) throw new Error('That does not look like a phone number id: it is 8 to 20 digits, from Meta developer portal > WhatsApp > API setup.');
    const other = await WaBusiness.findOne({ phoneNumberId: id, slug: { $ne: slug } });
    if (other) throw new Error(`That number is already connected to "${other.slug}". One number can only serve one business.`);
    b.phoneNumberId = id;
    b.numberProblemAt = null;
    await b.save();
    console.log(`${slug} is now connected to phone number id ${id}.`);
  }

  const [services, staff] = await Promise.all([WaService.countDocuments({ business: slug, active: true, onWhatsApp: true }), WaStaff.countDocuments({ business: slug, active: true })]);
  const check = (ok: boolean, what: string, fix: string) => console.log(`${ok ? 'ok     ' : 'MISSING'}  ${what}${ok ? '' : `  → ${fix}`}`);
  console.log(`\nSet-up check for ${slug}`);
  check(Boolean(b.phoneNumberId), 'phone number id saved on the business', 'npm run wa-connect -- --slug ' + slug + ' --phone-number-id <id>');
  check(Boolean(env.WHATSAPP_TOKEN), 'WHATSAPP_TOKEN (a permanent token for sending)', 'set it on the server');
  check(Boolean(env.WHATSAPP_APP_SECRET), 'WHATSAPP_APP_SECRET (the webhook is refused without it)', 'set it on the server');
  check(Boolean(env.WHATSAPP_VERIFY_TOKEN), 'WHATSAPP_VERIFY_TOKEN (Meta checks it once)', 'choose any string and set it on the server');
  check(Boolean(env.WHATSAPP_REMINDER_TEMPLATE), 'WHATSAPP_REMINDER_TEMPLATE (an approved reminder template)', 'see WHATSAPP.md, "Message templates"');
  check(Boolean(env.CRON_SECRET), 'CRON_SECRET (the reminder scheduler)', 'choose a long random string and set it on the server');
  check(services > 0, `services switched on for WhatsApp (${services})`, 'add them in the booking admin > Services');
  check(Object.keys((b.hours as object) ?? {}).length > 0, 'opening hours', 'set them in the booking admin > Staff & hours');
  check(staff > 0, `staff (${staff})`, 'add at least one person');
  console.log(`\nWebhook for Meta: https://<your domain>/api/whatsapp/webhook  (subscribe to "messages")`);
  console.log(`Reminders: POST https://<your domain>/api/whatsapp/reminders every 5 minutes with  Authorization: Bearer <CRON_SECRET>`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
