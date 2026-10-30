# byteleaf admin, quotes & invoices: developer handoff

This is part 2 of the handoff. **Read `HANDOFF.md` first.** Its rules apply here unchanged: Next.js App Router, TypeScript, **vanilla CSS only**, 100% visual parity, no animation or UI libraries, nothing cut off at any width, and the same tokens from `assets/globals.starter.css`.

The admin area is where the owner (Gerald) manages the website. It covers:
- signing in
- bookings (confirm, reschedule, decline)
- contact-form messages
- portfolio projects
- site settings
- **quotes and invoices**, with PDF output

---

## 0. What's in the package for the admin

| Path | What it is |
|---|---|
| `reference/admin-*.html` | Runnable static builds of every admin screen. **These are the source of truth for markup and values.** |
| `reference/billing-document-pdf.html` | The A4 quote/invoice PDF template. Add `?kind=quote`, `?vatRegistered=true` or `?paid=true` to see the variants. |
| `reference/admin-login.html?state=error` | The sign-in error state. |
| `screenshots/admin-*-{desktop,tablet,mobile}.png` | Full-page captures at 1440, 768 and 390px. |
| `screenshots/state-admin-*.png` | Interaction states (listed in §6). |
| `screenshots/pdf-*.png` | Invoice, tax invoice, paid invoice, quote and tax quote. |
| `screenshots/_audit-admin.json` | Overflow audit: 0 problems at every width. |
| `design/Admin*.dc.html`, `design/BillingDocument.dc.html` | Original design sources. |

Same caveat as part 1: the screenshot machine substituted **Inter / DejaVu Sans Mono** for Geist / Geist Mono. Build with Geist.

The reference pages rebuild their DOM on every keystroke, so typing in them loses focus. That is a limitation of the demo runtime only. Your React build must keep focus normally.

---

## 1. Routes

| Design | Route | Access |
|---|---|---|
| Sign in | `/admin/login` | public |
| Forgot password | `/admin/forgot-password` | public |
| Set new password | `/admin/reset-password?token=…` | public, valid token |
| Dashboard | `/admin` | admin |
| Bookings | `/admin/bookings` (`?tab=pending\|upcoming\|past\|cancelled\|all`, `?id=`) | admin |
| Messages | `/admin/messages` (`?tab=inbox\|unread\|archived`, `?id=`) | admin |
| Quotes & invoices | `/admin/billing` (`?type=all\|quote\|invoice`, `?status=`) | admin |
| New / edit document | `/admin/billing/new?type=quote\|invoice`, `/admin/billing/[id]` | admin |
| Document print view | `/admin/billing/[id]/print` (HTML used to make the PDF) | admin / internal |
| Document PDF | `/admin/billing/[id]/pdf` → `application/pdf` | admin |
| Projects | `/admin/projects` (`?tab=all\|live\|draft`) | admin |
| Add / edit project | `/admin/projects/new`, `/admin/projects/[id]` | admin |
| Settings | `/admin/settings` (`?tab=business\|prices\|availability\|invoicing\|account`) | admin |

Put the admin in a route group, `app/admin/(auth)/…` and `app/admin/(app)/…`, with its own layout (sidebar shell). It must not use the public header or footer.

Add `robots: { index: false }` to every admin page and `Disallow: /admin` to `robots.txt`.

---

## 2. Architecture (suggested; the owner confirms)

These are recommendations, not design decisions. Check with the owner before locking them in.

- **Data:** PostgreSQL through Prisma (or Drizzle). It runs comfortably next to the app in Docker on a single small server.
- **Mutations:** Server Actions for forms and buttons. Use Route Handlers only for the PDF endpoint, the public form `POST`s, and webhooks.
- **Public site wiring:**
  - `/contact` creates a `Message`.
  - `/book` creates a `Booking` (status Pending) and reads availability from `Settings`.
  - The Services prices, contact details, hours and reply times read from `Settings`. This is what replaces the `[bracketed]` placeholders.
  - Projects read from `Project` where `live = true`, with the featured one first.
- **Email:** any SMTP / transactional provider through a single `sendEmail()` helper. The emails are listed in §9.
- **Uploads** (project images): local disk volume or S3-compatible storage. Accept image types only, max 5 MB, and generate responsive sizes with `next/image`.
- **PDF:** render `/admin/billing/[id]/print` in headless Chromium (Playwright or Puppeteer) with `page.pdf({ format: 'A4', printBackground: true })`. That guarantees the PDF matches the design pixel for pixel (§8).
- **Time zone:** treat all dates and times as **Africa/Johannesburg (SAST, UTC+2)**. Store UTC, display SAST.

---

## 3. Authentication & security

- **No public sign-up.** Admin users are created with a seed script or CLI (`npm run create-admin`). The data model allows more than one admin.
- **Passwords:** hash with argon2id (or bcrypt, cost ≥ 12). The rules on the reset screen are enforced on the server too: at least 12 characters, upper and lower case, a number and a symbol.
- **Sessions:** server-side sessions in an `httpOnly`, `Secure`, `SameSite=Lax` cookie.
  - "Keep me signed in" ticked: 30-day sliding expiry.
  - Unticked: a browser-session cookie.
- **Middleware:** every `/admin/*` route except the three auth pages redirects to `/admin/login?next=…` when there's no valid session.
- **Login errors:** always show the generic message from the design ("That email and password don't match…"). Never reveal whether the email exists.
- **Rate limiting:** limit sign-in and forgot-password per IP and per email. Suggested: 5 attempts per 15 minutes.
- **Reset tokens:** random 32 bytes, stored **hashed**, single-use. Expiry is `[X] minutes` in the design; 30 is suggested. After a successful reset, revoke **all** sessions; the success copy says so. The "Forgot password" response is identical whether or not the email exists.
- **Two-step verification:** the switch is under Settings › Account. Implement it as TOTP (authenticator app). **The code-entry screen is not designed.** Build it on the same split auth layout as Sign in: a heading, a 6-digit `inputmode="numeric" autocomplete="one-time-code"` field, and Verify and "Use a backup code" actions.
- **"Sign out other devices":** delete all of the user's sessions except the current one.
- **CSRF:** Server Actions handle this. For any custom `POST` route, check the `Origin` header.
- **Personal data:** bookings, messages and invoices are personal information under POPIA. Admin-only access, no client data in URLs other than IDs, and log admin actions in the event tables (§7).

---

## 4. Admin shell (all logged-in screens)

Copy the exact values from any `reference/admin-*.html` file.

**Sidebar**
- 256px wide, navy `#07101F`, padding 22px/16px.
- Logo plus an "ADMIN" pill.
- Nav items, **in this order**: Dashboard · Bookings · Messages · Quotes & invoices · Projects · Settings.
- Items are 44px tall with a 12px radius. The active item is filled `#166FE5` with `aria-current="page"`. Hover is `#101E3A`.
- **Badges:** Bookings shows the number of Pending bookings; Messages shows the number of unread, un-archived messages. Hide a badge at 0. Each badge includes a screen-reader " new" suffix.
- Footer: "View website" (opens `/`), then a user card with initials avatar, name, role and a sign-out icon button (`aria-label="Sign out"`).

**Top bar**
- White with a 1px bottom border, padding 18px/32px.
- Breadcrumb in mono 12px (e.g. "Admin / Bookings"), H1 at 26px/600.
- Page actions on the right. Search inputs have a hidden `<label>`.

**Content area**
- Padding 24–28px/32px, max-width 1280–1320px.
- Panels: white, 1px `#E3E9F2` border, 18px radius.

**≤900px**
- The sidebar becomes a full-width top bar. The nav turns into a horizontally scrolling row (`overflow-x: auto`, `position: relative`), and the footer block is hidden.
- Side padding drops to 16px.
- Two-pane screens (Bookings, Messages, Billing editor) stack: the list or form first, then the detail or preview.

**Shared components**
- **Pill tabs:** a white rail with a 6px inset. The selected tab is an ink fill (`#0B1220`) with white text. Each tab shows a count chip. Use `role="tablist"` / `role="tab"` / `aria-selected`.
- **Status badges:** mono 11px pills. The colours are used everywhere:

| Status | Background | Text |
|---|---|---|
| Pending | `#FFF4E0` | `#8A5200` |
| Confirmed / Accepted / Paid | `#E6F6EF` | `#0B6B4B` |
| Rescheduled / Sent | `#EEF4FE` | `#0B4FB3` |
| Completed / Draft / Invoiced | `#EEF2F8` | `#33405A` |
| Cancelled / Overdue | `#FEF3F2` | `#912018` |
| Declined | `#FFF4E0` | `#8A5200` |

- **Switches:** `<button role="switch" aria-checked>`, 44×26, knob 20px. Track is `#166FE5` when on and `#C9D3E3` when off.
- **Toasts:** bottom-right, ink `#0B1220`, 14px radius, `role="status"`. They auto-dismiss after 5s. Destructive actions (archive, delete) offer **Undo** in the toast; actually delete only after the toast expires, or soft-delete.
- **Empty states:** centred title plus one line, and a CTA where shown (e.g. Projects → "Add your first project").
- **Motion:** panels `rise` 0.6s staggered, detail panes `slide` 0.35s, toasts `toast` 0.35s, new line items `rowin` 0.3s. Everything respects reduced motion.

---

## 5. Screens & behaviour

### 5.1 Auth (split layout)
- **Left:** a navy brand panel with dot grid, blue glow and an animated illustration. It is ≥480px wide and collapses to just the logo bar at ≤900px.
- **Right:** the form column, max 420px.
- **Sign in:** email, password with a show/hide toggle (`aria-pressed`, label swaps), "Keep me signed in" (checked by default), and a "Forgot password?" link. The error banner shakes once and uses `role="alert"`.
- **Forgot password:** submitting swaps to the "Check your inbox" state. "Use a different email" resets the form. The "Open reset link (demo)" button exists **only in the prototype**; remove it in production.
- **Reset:**
  - The strength meter has 4 bars; the score is the number of rules met. Colours by score: 1 `#B42318`, 2 `#9A5B00`, 3 `#1877F2`, 4 `#0B7A55`.
  - The checklist ticks live.
  - A mismatch message appears under the confirm field.
  - The button stays disabled until all 4 rules pass and both fields match.

### 5.2 Dashboard
- A greeting by SAST hour: before 12 "Good morning", before 17 "Good afternoon", otherwise "Good evening". Today's long date in en-ZA format.
- **KPI cards:** Awaiting confirmation · Unread messages · Calls in next 7 days (Pending + Confirmed + Rescheduled) · Live projects. Each card links to its screen.
- **Needs your attention:** the Pending bookings, each with Reschedule (link) and Confirm (instant confirm, then a toast). When none are left, show the "All caught up" state.
- **Next 7 days:** a timeline of upcoming calls with status-coloured dots.
- **Latest messages:** the 3 newest, with an unread dot and bold name.
- **Quick actions** grid.
- Consider adding an "Outstanding invoices" KPI later. It is not in the design, so don't add it without asking.

### 5.3 Bookings
- **List:** client (initials avatar from first and last name), company · meeting type, date + time · duration, status. The selected row has a blue inset ring.
- **Detail pane:**
  - Name, company and status.
  - Email and phone chips (`mailto:` / `tel:`).
  - Meeting, Where, Date and Time.
  - The client's note (from the Book form).
  - History, from `BookingEvent`.
- **Actions by status:**

| Status | Actions |
|---|---|
| Pending | **Confirm booking** · Reschedule · **Decline** |
| Confirmed / Rescheduled | Reschedule · **Cancel booking** |
| Completed / Cancelled | none |

- **Confirm:** set status Confirmed, add an event, and email the client a confirmation with an `.ics` invite and the video link. The video link is not designed; for now put a "[meeting link]" placeholder in the email.
- **Reschedule mode:**
  - Day picker: the next 10 **available** days from Settings (skip non-working days, blocked dates and full days).
  - Time slots: the configured start times minus taken slots.
  - A prefilled message.
  - "Send new time" stays disabled until both a day and a time are picked. Sending sets status Rescheduled, updates the date and time, adds an event, and emails the client.
- **Decline / cancel mode:**
  - A red warning box and an optional reason.
  - The confirm button is solid red.
  - The client is emailed.
- Past bookings become **Completed** automatically once their end time passes (cron or on read).
- **Search** filters by name or company.

### 5.4 Messages
- Tabs: Inbox (not archived) · Unread · Archived.
- Opening a message marks it as read.
- The reading pane shows Email, Phone, Working model and Wants to start, the "Help with" chips (the Contact form needs[]), and the message with line breaks preserved (`white-space: pre-line`).
- Actions:
  - **Reply by email:** `mailto:` with subject "Re: your message to byteleaf".
  - **Call [first name].**
  - **View bookings.**
  - **Mark as read/unread.**
  - **Archive / Move to inbox**, with Undo.
- A new message emails the address set in Settings › Business › "Send new bookings & messages to".

### 5.5 Projects
- Rows: thumbnail (cover image; until one is uploaded, use the pattern placeholders), name + FEATURED pill, type · client, category chips, the "On website" switch, last updated, star, edit and delete.
- **Featured** is exactly one project; starring another moves it. The featured project appears first on the public `/projects` page, in the large case-study card.
- **Delete** has Undo (soft-delete).
- At ≤760px the categories and updated columns hide.

### 5.6 Add / edit project
- **Basics:**
  - Name (required).
  - Client name, with the hint "get permission first".
  - Type and Industry.
  - Categories: multi-select chips (Design / Frontend / Backend / AI). These drive the public filter.
  - Tech stack: a tag input. Enter or comma adds a tag; × removes one; duplicates are ignored.
- **Story:** one-line summary (max 140, live counter that turns amber above 120), Challenge, What we did, Result. These feed the featured case-study card and a future project detail page (not yet designed).
- **Images:** a cover dropzone (JPG/PNG/WebP, 1600×1000 recommended) and a gallery.
- **Search & sharing:** the slug is generated from the name, lowercase and hyphenated, and must be unique.
- **Publishing panel:**
  - "Show on website" switch.
  - "Featured" switch, which replaces the current featured project.
  - A live card preview that mirrors the public project card.
- **Buttons:** "Save draft" sets it hidden and saves. "Publish project" (label "Save project" when hidden) saves.

### 5.7 Settings
Left-hand section nav: Business details · Prices · Availability · **Invoicing** · Account & security. One **Save changes** button in the top bar saves all tabs; validate before saving.

| Tab | Fields → where they're used |
|---|---|
| Business details | Public email, phone/WhatsApp, studio location, office hours, reply time, urgent response time → footer, Contact page, Process "Staying in touch" cards. "Send new bookings & messages to" → admin alerts. |
| Prices | Price text + billing unit for CARE / BUILD / FIX / TEAM, plus "hours of changes included" → the Services "Ways to work with us" cards. Blank shows "Let's talk". |
| Availability | Working days, start times (add with a time input, remove with ×), meeting types (on/off + length), minimum notice, break between meetings, max meetings per day, blocked date ranges → `/book` and the admin reschedule picker. |
| Invoicing | Registered name, registration no., billing address, VAT registered + VAT number, bank details, next quote and invoice numbers, default terms, quote validity, default deposit, default invoice notes → quotes, invoices and PDFs. |
| Account & security | Name, sign-in email, Change password (→ reset flow), two-step verification, sign out other devices. |

### 5.8 Quotes & invoices list (`/admin/billing`)
- **KPIs, all calculated from invoices and quotes:**
  - **Outstanding:** sum of invoices with status Sent or Overdue.
  - **Overdue:** invoices that are Sent with a due date before today, shown in red.
  - **Paid this month:** invoices paid in the current calendar month, by payment date.
  - **Quotes awaiting reply:** quotes with status Sent.
  - Pluralise the captions correctly (the design already does).
- **Filters:** type tabs (All / Quotes / Invoices with counts), a status `<select>`, and search by number, client or title.
- **Rows:** a type icon (blue receipt for invoices, amber document for quotes), number (links to the PDF), client + title, Issued / Due (or "Valid to" for quotes; the due date turns red when overdue), amount (mono, right-aligned), status, actions.
- **Actions by status:**

| Document | Status | Actions |
|---|---|---|
| Invoice | Sent | **Mark paid** · PDF |
| Invoice | Overdue | **Mark paid** · Remind · PDF |
| Invoice | Paid | PDF |
| Any | Draft | Continue (opens the editor) · PDF |
| Quote | Sent | PDF (plus "Mark accepted" / "Mark declined" in the editor's menu; not designed, keep it simple) |
| Quote | Accepted | **Convert to invoice** · PDF |
| Quote | Declined / Invoiced | PDF |

- **Mark paid:** set Paid, record a `Payment` (date = today, amount = total), and email a receipt. A changed row flashes green for 1.6s.
- **Convert to invoice:** create a **Draft** invoice that copies the client, reference, line items, discount and VAT, and links `quoteId`. The quote becomes **Invoiced**. The toast names the new number.
- At ≤760px the column headings and dates hide.

### 5.9 Create / edit a quote or invoice (`/admin/billing/new`, `/[id]`)
**Header:** the H1 "New quote / New invoice" with the next number, a **Quote | Invoice** segmented switch, Save draft, PDF and **Send to client**.

**Client & details**
- "Bill to" `<select>` of existing clients, with **"+ New client…"**. The new-client form is not designed; use a modal or inline fields for company, contact, email, address and VAT no. (optional).
- Project / reference.
- Issue date (default today).
- Due date. Invoices: 14 (default) / 7 / 30 days / On receipt. Quotes: "Valid for" 30 (default) / 14 / 60 days. Defaults come from Settings.
- A summary strip shows the contact, email and address.

**Line items**
- Each row: description, qty (step 0.5), rate (ZAR), calculated amount, delete.
- "+ Add line" adds an empty row.
- **Quick add** chips (Care plan, Development hourly, Bug fix, Design sprint) insert a row whose rate comes from Settings › Prices when that value is numeric, otherwise 0.
- At ≤640px each row reflows to 2 columns with the description on its own row.

**Totals & terms**
- Discount %.
- Deposit % (quotes only, default 50 from Settings).
- **"Charge VAT (15%)" switch**, defaulting to `Settings.vatRegistered`. It is off until the owner registers for VAT.
- Notes & terms, with defaults per type from Settings.

**Live preview:** a scaled A4 card that mirrors the PDF template. It updates on every change.

**Send to client**
- Validates: at least one line, client email present, total > 0.
- Allocates the number if one isn't allocated yet, sets status Sent, generates the PDF, and emails it.
- The document becomes **read-only** once sent. To change a sent invoice, void it and issue a new one; never edit it silently.

---

## 6. Interaction-state screenshots

| File | Shows |
|---|---|
| `state-admin-login-error` | Wrong-password banner |
| `state-admin-forgot-sent` | "Check your inbox" |
| `state-admin-reset-weak` / `-strong` / `-done` | Strength meter states and success |
| `state-admin-dashboard-confirmed` | Pending item confirmed + toast |
| `state-admin-bookings-reschedule` / `-rescheduled` | Reschedule picker, then the result |
| `state-admin-bookings-decline` | Decline confirmation |
| `state-admin-bookings-upcoming-detail` | Upcoming tab with a Rescheduled booking's history |
| `state-admin-messages-read` / `-archived-toast` | Read message, archive with Undo |
| `state-admin-projects-deleted-undo` | Delete with Undo |
| `state-admin-project-edit-filled` | Live card preview, tags, categories |
| `state-admin-settings-{business-details,prices,invoicing,account-security}` | Each settings tab (Availability is the default view) |
| `state-admin-billing-converted` | Accepted quote converted to a draft invoice |
| `state-admin-billing-quotes` | Quotes filter |
| `state-admin-billing-edit-invoice-vat` | Invoice mode, VAT on, 10% discount, extra line |
| `pdf-invoice`, `pdf-invoice-vat`, `pdf-invoice-paid`, `pdf-quote`, `pdf-quote-vat` | PDF variants |

---

## 7. Data model (suggested)

```ts
type ID = string;                 // cuid/uuid
type Money = number;              // integer cents (ZAR). Never floats.

AdminUser   { id, name, email (unique), passwordHash, totpSecret?, createdAt }
Session     { id, userId, expiresAt, persistent: boolean, userAgent, ip, createdAt }
ResetToken  { id, userId, tokenHash, expiresAt, usedAt? }

Booking     { id, name, email, phone?, company?, meetingType: 'discovery'|'deep-dive'|'in-person',
              startsAt (UTC), durationMin, location, note?, status: 'pending'|'confirmed'|'rescheduled'|'completed'|'cancelled',
              createdAt }
BookingEvent{ id, bookingId, type: 'created'|'confirmed'|'rescheduled'|'declined'|'cancelled'|'completed',
              fromStartsAt?, toStartsAt?, message?, actor: 'client'|'admin', createdAt }

Message     { id, name, company?, email, phone?, needs: string[], workingModel, startWhen, body,
              read: boolean, archived: boolean, createdAt }

Project     { id, slug (unique), name, client?, type?, industry?, categories: ('Design'|'Frontend'|'Backend'|'AI')[],
              stack: string[], summary (≤140), challenge?, whatWeDid?, result?, coverImageId?, live: boolean,
              featured: boolean /* max one true */, sortOrder, updatedAt, deletedAt? }
ProjectImage{ id, projectId, url, width, height, alt, sortOrder }

Client      { id, company, contactName, email, phone?, address?, vatNumber?, createdAt }
Document    { id, kind: 'quote'|'invoice', number? (unique per kind), status, clientId, reference,
              issueDate, dueDate? /* invoice */, validUntil? /* quote */, discountPct, depositPct?,
              vatApplied: boolean, vatRate (default 15.00), notes, quoteId? /* invoice from quote */,
              subtotal: Money, discount: Money, vat: Money, total: Money,  // stored at send time
              sentAt?, createdAt, updatedAt }
  // quote status:   'draft'|'sent'|'accepted'|'declined'|'expired'|'invoiced'
  // invoice status: 'draft'|'sent'|'paid'|'void'   ('overdue' is computed: sent && dueDate < today)
LineItem    { id, documentId, sortOrder, description, quantity (decimal 2dp), rate: Money, amount: Money }
Payment     { id, documentId, amount: Money, paidOn (date), method?: 'eft'|'card'|'cash', note? }
DocumentEvent{ id, documentId, type: 'created'|'sent'|'reminder'|'accepted'|'declined'|'converted'|'paid'|'voided', createdAt }

Settings    { // single row
  business: { publicEmail, phone, location, hours, replyWithin, urgentResponse, notifyEmail },
  prices:   { care, build, fix, team: { text, unit } ; includedHours? },
  availability: { workingDays: number[] /*1=Mon*/, startTimes: string[] /*'HH:mm'*/, meetingTypes: {key, enabled, minutes}[],
                  minNotice, bufferMin, maxPerDay, blocked: {from, to}[] },
  invoicing: { legalName, regNo, address, vatRegistered, vatNumber?, bank: {name, accountName, accountNo, branchCode},
               nextQuoteNo, nextInvoiceNo, defaultTermsDays, quoteValidDays, defaultDepositPct, defaultInvoiceNotes } }
```

**Seed data:** use the sample names, companies, amounts and numbers from the designs (all fictional) in `prisma/seed.ts` so the screens look like the screenshots in development. **Never ship the seed to production.**

---

## 8. Billing rules

### 8.1 Calculations (do them on the server; the client preview only mirrors them)
```
amount_i    = round(quantity_i × rate_i)                 // per line, to the cent
subtotal    = Σ amount_i
discount    = round(subtotal × discountPct / 100)
net         = subtotal − discount
vat         = vatApplied ? round(net × vatRate / 100) : 0  // vatRate = 15
total       = net + vat
deposit     = round(total × depositPct / 100)           // quotes only, shown, not charged
round       = half-up to the nearest cent
```
Display: `R 48 000.00`. That is the `R` prefix, a space, a space as thousands separator and a dot for decimals, set in Geist Mono. Use a single `formatZAR()` helper; don't rely on `Intl` locale output, which differs between servers.

### 8.2 Numbering
- Formats: quotes `Q-YYYY-NNN`, invoices `INV-YYYY-NNN`. The next numbers are editable in Settings › Invoicing.
- Allocate a number **atomically**, in a DB transaction that increments `Settings.nextInvoiceNo`, the first time a document is saved. Never reuse a number.
- Numbered invoices cannot be deleted, only **voided**. That keeps the sequence unbroken.

### 8.3 Status flow
```
Quote:   draft ──send──▶ sent ──▶ accepted ──convert──▶ invoiced
                            ├──▶ declined
                            └──(validUntil passes)──▶ expired
Invoice: draft ──send──▶ sent ──mark paid──▶ paid
                            └──(dueDate < today)──▶ shown as "Overdue" (still status sent)
         sent ──void──▶ void
```
"Remind" emails the client with the PDF attached and logs a `reminder` event. Optionally run an automatic reminder on the due date and 7 days after; ask the owner first.

### 8.4 VAT / tax invoice (South Africa)
- VAT is **off by default**. Only a VAT-registered business may charge VAT.
- When `Settings.invoicing.vatRegistered` is on, the PDF for an invoice says **"TAX INVOICE"** and shows the supplier VAT number, as in the design.
- For SARS tax-invoice requirements, the designed fields already include: supplier name, address and VAT number; a sequential serial number; issue date; recipient name and address; line descriptions and quantities; the VAT amount; and the total.
- Add the client's VAT number when one is stored. **Have the owner's accountant confirm the final layout before going live.**

---

## 9. PDF generation

- **Template:** `reference/billing-document-pdf.html`.
  - A4, 794×1123 CSS px.
  - 10px blue top bar, 56px side margins.
  - Body 13px, captions ≥12px, mono for numbers.
  - Footer block (payment details + notes/terms) pinned to the bottom with `margin-top: auto`.
- **Implementation:** the `/admin/billing/[id]/print` page renders the template from the document data using the same CSS. `/pdf` opens it in headless Chromium:
  ```ts
  await page.goto(printUrl, { waitUntil: 'networkidle' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  ```
  Filename: `byteleaf-INV-2026-033.pdf`. Cache the generated PDF per document version.
- **Variants** (all in the screenshots):
  - INVOICE
  - TAX INVOICE (+ VAT line + VAT no.)
  - A PAID stamp: green outline, rotated -4°, shown when status is paid
  - QUOTE: "Valid until", "Quote total", a deposit row, "TERMS", and a signature + date line
- **Long documents:** when the lines don't fit on one page, let the line list flow onto page 2. Keep the totals block and the footer together (`break-inside: avoid`), and put "Page X of Y" in Chromium's `footerTemplate` instead of the inline footer.

---

## 10. Emails (not designed: keep them plain and on-brand)

Use one simple layout for all of them: white, the logo, 16px Geist/system text, one `#166FE5` button, and the footer "byteleaf · Johannesburg".

| Trigger | To | Content |
|---|---|---|
| Booking created | Owner | Who, when, type, note → "Open in admin" |
| Booking received | Client | "We've got your request for …; we'll confirm shortly" |
| Booking confirmed | Client | Date/time SAST, location or `[meeting link]`, `.ics` attached |
| Booking rescheduled | Client | New date/time + admin's message, `.ics` |
| Booking declined/cancelled | Client | Admin's reason + link to `/book` |
| New contact message | Owner | Summary → "Open in admin" |
| Password reset | Admin | Single-use link, expiry time |
| Quote / invoice sent | Client | Short note + PDF attached + total and due/valid date |
| Payment reminder | Client | Overdue amount + PDF |
| Payment received | Client | Receipt: amount, date, number |

---

## 11. Accessibility checklist (admin)
- Every input has a `<label>`. Search fields and line-item inputs use visually hidden labels (`.sr`), as in the reference.
- Toggles are `<button aria-pressed>`, switches are `role="switch" aria-checked`, and tabs use `role="tab" aria-selected`.
- Icon-only buttons have an `aria-label` (sign out, delete, star, download, remove tag).
- Toasts use `role="status"` and errors use `role="alert"`.
- Focus moves to the detail pane heading when a booking or message opens. When a mode (reschedule, decline) closes, focus returns to the button that opened it.
- Contrast: all status pill text colours pass 4.5:1 on their fills.

---

## 12. Acceptance criteria
- [ ] All 11 admin screens match `screenshots/admin-*` at 1440 / 768 / 390. There is no horizontal overflow at 320–1920px (the PDF template is a fixed A4 page and is exempt).
- [ ] All interaction states in §6 behave as shown.
- [ ] `/admin/*` is inaccessible without a session. Sign-in and password-reset follow §3.
- [ ] Bookings and Messages are created from the public `/book` and `/contact` forms. Admin actions update the status, log events and send the emails in §10.
- [ ] Settings changes appear on the public site immediately (revalidate the affected routes).
- [ ] Billing totals follow §8.1 exactly. Unit-test `calcTotals()` with discount, VAT and rounding edge cases (e.g. qty 0.5 × R 333.33).
- [ ] Numbers are sequential and unique under concurrent saves. Sent documents are read-only. Invoices can be voided, not deleted.
- [ ] Generated PDFs match `screenshots/pdf-*.png` (allowing for the font substitution), with fonts embedded and text selectable.
- [ ] Vanilla CSS only, and `npm run build` passes.
