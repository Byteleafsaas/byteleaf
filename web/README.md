# byteleaf

Next.js (App Router, TypeScript) + vanilla CSS, with a Node.js / MongoDB backend built into the same app
(Mongoose, Server Actions and Route Handlers).

## Run it locally

```bash
npm install
cp .env.example .env.local        # then edit if needed
npm run db:up                     # MongoDB (127.0.0.1:27117) and a dev Garage (127.0.0.1:3910) in Docker
npm run garage:setup              # one-off: creates the dev bucket + key and writes S3_* to .env.local
npm run create-admin -- --email you@byteleaf.dev --name Gerald   # prompts for a password (hidden)
npm run seed                      # OPTIONAL, dev only: fictional sample data from the designs
npm run dev                       # http://localhost:3000  ·  admin at /admin
```

The password must have 12+ characters, upper and lower case, a number and a symbol.

## Environment (`.env.local`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Database. Dev default `mongodb://127.0.0.1:27117/byteleaf`; use Atlas in production. |
| `APP_URL` | Public base URL, used in emails and reset links. |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | Outgoing email. **With `SMTP_HOST` empty, emails are printed to the server console** (dev). |
| `S3_ENDPOINT` `S3_REGION` `S3_BUCKET` `S3_ACCESS_KEY` `S3_SECRET_KEY` | Your Garage (any S3-compatible server, path-style). Leave `S3_ENDPOINT` empty to store images in `./storage` instead (dev fallback). |
| `TOTP_ENCRYPTION_KEY` | 64 hex chars (32 bytes). Encrypts two-step secrets at rest. **Required in production**; losing it locks 2FA users out. |
| `CHROME_PATH` | Chrome/Chromium used to render PDFs. Auto-detected on Windows/macOS/Linux if installed. |

## What the backend does

- **Auth:** argon2id passwords, server-side sessions in an `httpOnly` cookie (30-day sliding when "keep me signed in"),
  `middleware.ts` gate on `/admin/*`, 5 attempts / 15 min rate limit per IP and per email, generic login error,
  single-use hashed reset tokens (30 min) that revoke every session. There is no public sign-up.
- **Public forms:** `/contact` creates a Message; `/book` creates a Pending Booking after re-checking the slot on the
  server. Both have a honeypot and per-IP rate limits, and email the owner (Settings › Business › notify address).
- **Settings drive the public site:** footer, Contact page, Services prices, Process response time, booking
  availability (working days, start times, blocked dates, notice, breaks, max per day). Saving revalidates immediately.
- **Admin actions:** confirm / reschedule / decline bookings (emails + `.ics`), messages, projects (soft delete + undo,
  exactly one featured), settings, quotes and invoices.
- **Billing:** integer-cent money, `calcTotals()` (unit-tested), sequential numbers allocated in one atomic Mongo update,
  unique `(kind, number)` index, sent documents read-only, invoices voided not deleted, PDF via headless Chromium at
  `/admin/billing/[id]/pdf` (renders `/admin/billing/[id]/print`).

## Image storage (Garage)

Project images are uploaded to `POST /admin/upload` (admin only), validated by their real bytes (JPG/PNG/WebP, max 5 MB),
rotated per EXIF, stripped of metadata (incl. GPS), scaled to at most 2400 px, and stored under `projects/<uuid>.<ext>`.
The bucket stays **private**: pages read images through `/media/<key>` (long-lived cache), rendered with `next/image`
for responsive sizes. Removing an image in the project form deletes it from the bucket on save.

For production create a bucket and key in your Garage (`garage bucket create byteleaf`, `garage key create byteleaf-app`,
`garage bucket allow --read --write --owner byteleaf --key byteleaf-app`) and set the `S3_*` variables.

## Two-step verification

Settings › Account: scan a QR code with any authenticator app, confirm with a code, and save 8 single-use backup codes
(shown once, stored hashed). Once on, a correct password only starts a 5-minute pending sign-in; a TOTP or backup code
is needed to get a session. Codes can't be replayed, attempts are rate limited, turning it off needs password + code.

## Scripts

`npm test` (unit tests) · `npm run lint` · `npm run build` · `npm run seed -- --reset` (wipes and reseeds, dev only) ·
`npx tsx --env-file=.env.local --conditions=react-server scripts/check-numbering.ts` (concurrency check for numbering)

## Not built yet

- Cleanup of images uploaded but never saved, and of soft-deleted projects older than 30 days (no cron yet).
- Automatic overdue reminders.
