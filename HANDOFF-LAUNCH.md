# Showcase project 3 of 4: Launch website with admin — developer handoff

This is part 5 of the handoff. **Read `HANDOFF.md` first.** Its rules apply here unchanged:
- Next.js App Router, TypeScript and **vanilla CSS only**
- no UI kits, no animation libraries, **no page builders**
- 100% visual parity with the reference pages
- nothing cut off at any width from 320 to 1920

The owner admin extends the byteleaf admin shell from `HANDOFF-ADMIN.md`, the same way the chatbot and WhatsApp admins did.

The project has three pieces, all Priority 1:

| Piece | What it is | Look |
|---|---|---|
| **A · Sample website** | Five pages for a made-up business, **Tsela Mobile Wash** (mobile car wash, Pretoria) | Its **own** identity: `launch/site-tokens.css` |
| **B · Owner's admin** | Overview, Pages editor, Services & prices, Photos, Site settings, publish bar | byteleaf admin, re-skinned to the business colour |
| **C · Showcase page** | `/projects/launch-website` on byteleaf: two views and three guided stories | byteleaf site |

**D · Go-live checklist** is Priority 2. It appears in the sidebar marked **SOON** (disabled).

**Honesty rule**
- Everything about Tsela is made up.
- A "Demo site by byteleaf" strip sits at the top of every sample page.
- Every review is tagged **Sample review**.
- Text in `[square brackets]` is a placeholder the owner fills in later. Ship it exactly as written.

---

## 0. What's in the package

| Path | What it is |
|---|---|
| `reference/lw-site-{home,services,about,gallery,contact}.html` | The sample site. **These pages are the source of truth.** |
| `reference/lw-{overview,pages,services,photos,settings}.html` | Admin screens |
| `reference/lw-themes.html` | Admin re-skin tokens for 3 brands, with live contrast checks |
| `reference/lw-demo.html` | The showcase page |
| `launch/site-tokens.css` | Sample-site colours, type scale, spacing and radii, with contrast figures |
| `launch/copy.json` | Every string for the sample site and the showcase stories |
| `screenshots/lw-*-{desktop,tablet,mobile}.png` | Full-page captures at 1440, 768 and 390 |
| `screenshots/lw-*-small.png` | Captures at 320, for the sample Home and Contact pages, the Pages editor and the showcase page |
| `screenshots/state-lw-*.png` | 54 state captures (§9) |
| `screenshots/_audit-launch.json` | Overflow audit: 0 problems at every width, no script errors |
| `design/Lw*.dc.html` | Design sources (the canvas page "Showcase · Launch website") |

Two caveats carry over from the earlier parts:
- **Fonts in the captures are stand-ins.** The screenshot machine couldn't load Google Fonts, so admin captures use Inter instead of Geist, and the sample site falls back to Inter for its Bricolage Grotesque headings. **Build with the real fonts.**
- **Focus loss is a reference-page quirk.** The reference pages rebuild on every keystroke, so they lose focus while typing. Your build must not.

**Fixed elements in full-page captures**
- In full-page phone captures, the sticky header, the sticky call bar and the publish bar appear partway down the image.
- In the browser they stay pinned to the screen.

**Query-string switches**

| Page | Switches |
|---|---|
| Sample site pages | `?photos=false` (no-photo version). Contact page also: `?form=fails` (the first send fails) |
| All admin screens | `?brand=tsela\|byteleaf\|spark`, `?publish=fails` (the first publish fails) |
| `lw-overview` | `?demo=normal\|new admin\|loading` |
| `lw-pages` | `?demo=loading` |
| `lw-services` | `?list=normal\|empty\|long` |
| `lw-photos` | `?empty=true` |

---

## 1. Routes

| Design | Route |
|---|---|
| Sample site on a client's own domain | `/`, `/services`, `/about`, `/gallery`, `/contact` |
| Sample site inside the byteleaf demo | `/projects/launch-website/sample` and the same sub-paths, with `noindex` |
| Showcase page | `/projects/launch-website` |
| Admin: overview | `/admin` |
| Admin: Pages | `/admin/pages?page=home\|services\|about\|gallery\|contact` |
| Admin: Services & prices | `/admin/services` (`?id=` opens the editor) |
| Admin: Photos | `/admin/photos` (`?filter=all\|gallery\|alt`) |
| Admin: Site settings | `/admin/settings` |
| Admin: Enquiries | `/admin/enquiries`, **reused** from the byteleaf Messages screen |
| Admin: Bookings | `/admin/bookings`, **reused** from the byteleaf Bookings screen |
| Go-live checklist | P2, disabled |

- The public form posts to `POST /api/enquiries`. That creates an enquiry in the admin and sends an email to the address in Site settings.
- Replies to an enquiry go by **WhatsApp** (`wa.me` link with a prefilled message) or by **email**.

---

## 2. Decisions taken (brief §10)

1. **Sample business.**
   - A mobile car wash in Pretoria, as the brief suggested.
   - Named **Tsela Mobile Wash** ("tsela" means *road* in Sesotho and Setswana), because a type-only logo needs a word to look established.
   - The name is one field in Site settings. Change it and the logo, footer and tab title update.
2. **One sample site, three admin brands.** The admin brands are Tsela green, byteleaf blue and Bright Spark Electrical (orange).
3. **Five pages, Gallery kept.** It shows the empty-then-full story best.
4. **The owner can't change the design.** They edit words, prices, photos and details inside **fixed blocks** (§5). Layout, colours and type stay ours.
5. **Showcase price and timing** stay as `[delivery time]` and `[from price]`.
6. **Enquiries and WhatsApp.**
   - The site shows WhatsApp buttons everywhere.
   - Enquiries arrive in the admin and by email.
   - The owner replies by WhatsApp or email.

---

## 3. The sample site (A)

**Identity**
- **Logo:** the lower-case name in heavy display type, plus a full stop: "tsela."
  - The full stop is `#D99F00` on cream, and `#F5B700` on dark backgrounds.
  - Under it, small caps read "MOBILE CAR WASH" (10px, 0.22em tracking).
- **Colours:** pine, sun and cream. Yellow **buttons always use ink text.**
- **Fonts and sizes:** Bricolage Grotesque 800 for headings and Inter for body text. Exact sizes are in `site-tokens.css`.

**Photos on or off**
- Every page has a no-photo version, so the site looks finished before the owner has pictures:

| Page | With photos | Without photos |
|---|---|---|
| Home hero | Photo | Pine "Today's prices" card |
| About | Portrait | Sun card with the name in large type |
| Gallery | Before-and-after grid | "Photos are on their way" with a WhatsApp button |

- Photo frames carry a caption chip: "Sample photo" or "Placeholder". Remove these on real installs.

**Phones (max-width 860px)**
- The navigation collapses to a **Call** icon button and a **Menu** button. The menu is a full-width list with 52px rows.
- A **fixed bottom bar** shows **Call** (outline) and **WhatsApp us** (sun). It respects the safe area, and the page gets 84px of bottom padding so the bar covers nothing.
- The hero heading is 44px, or 38px at 400px and below. Side gutters are 16px at 400px and below.

**Contact form**
- **Fields:** name, phone (required), area (select), wash (select), message (optional).
- **Phone validation:** a South African number in the form `(+27|0)` plus 9 digits, with spaces or dashes allowed.
- **Errors appear inline under the field:**
  - missing number: "Please add your phone number…"
  - wrong length: "That number looks short…"
- **States:** empty → filling → **Sending…** (button disabled) → **sent** card, or **failed** (alert above the form, with every field kept).
- **The sent card** names the visitor, the number, the wash and the area, and says what happens next: "within [reply time]".
- **Focus:** on success, move focus to the sent heading. On failure, move it to the alert.
- **Store only what's needed.** Show a privacy line with `[Privacy notice link]`.

**Other notes**
- FAQ answers stay collapsed until opened: build them with `<details>`/`<summary>` (no JavaScript).
- Prices come from the admin Services data. They are never typed into pages.

---

## 4. Speed budget (sample site)

These are our targets. The brief asks for "light".

| Item | Target |
|---|---|
| Fonts | 2 families, latin subset, `font-display: swap`, preload the display weight only |
| JavaScript | Only the menu toggle, the form, and the gallery lightbox (P2). No framework JavaScript on static pages: use React Server Components / static output |
| Images | AVIF/WebP with `srcset`. Hero ≤ 120 KB at 1440, gallery tiles ≤ 60 KB. Lazy-load everything below the fold |
| Home page | ≤ 350 KB total without photos, ≤ 700 KB with |
| Speed on a 4G phone | LCP < 2.5 s, CLS < 0.05 |
| Forbidden | Sliders, autoplay, video and parallax |

---

## 5. Admin (B)

### Shared parts

**Sidebar**
- The byteleaf admin sidebar, with a **WEBSITE** card holding the business name and a site status line:
  - green: "Site is live · all changes published"
  - amber: "N changes not published"
- Navigation: Overview, Pages, Services & prices, Photos, Enquiries (with a count of new ones), Bookings, Site settings, and Go-live checklist (SOON).
- The active item has a 3px white inner edge, so it stays visible in every brand.

**Three statuses.** The design keeps them distinct everywhere:

| Status | What it means | How it's shown |
|---|---|---|
| **Unsaved** | Typed but not saved | Amber dot, "Not saved" / "Unsaved changes" |
| **Saved · not published** | Draft. Customers don't see it | Blue pill, "NOT PUBLISHED" on rows |
| **Live** | What customers see | Green pill, "Live" |

**Publish bar**
- **When it shows:** whenever at least one saved change isn't published. It sticks to the bottom of the main column.
- **What it says:** "N changes not published · saved, but your live site doesn't show them yet", with **Preview**, **Discard** and **Publish**.
- **Publish:**
  1. Opens a confirm dialog that lists each change in plain words, for example "Full wash and vacuum: price R 250 → R 270".
  2. Shows **Publishing…**.
  3. Shows a toast, "Published. Your site is up to date.", with **Undo for 10 seconds**. Undo restores the previous live version and puts the changes back in the bar.
- **Failure:** an inline alert in the bar: "Couldn't publish. Nothing changed on your live site and your edits are safe." The button becomes **Try again**.
- **Discard:** confirms first ("These edits are removed. Your live site stays exactly as it is now"), then resets drafts to the live version.
- **Change list:** keep one entry per item, with the latest label winning. Publishing is all-or-nothing in a single transaction.

### Pages editor (`lw-pages`)

- **Layout:**
  - Page tabs: Home, Services and prices, About, Gallery, Contact. A tab gets a dot when it has unsaved or unpublished changes.
  - The block editor sits on the left and the **live preview** on the right.
  - The preview has **Desktop / Phone** sizes and is drawn with the real site components.
  - At ≤ 760px, an **Edit / Preview** switch replaces the side-by-side layout.
- **The status pill and "Save draft"** sit in the header. Save is disabled while the page is clean or has an error.
- **Leaving with unsaved changes** (switching page tab or route) asks: **Stay here / Don't save / Save draft**. Also hook `beforeunload`.
- **Loading** shows a skeleton of the blocks and preview.

**Blocks are fixed per page.** Owners edit content only; they can't add free blocks or reorder sections.

| Type | Control | Limits and rules |
|---|---|---|
| HEADING | text input | ≤ 60 characters, required. Over the limit: counter and border turn red, inline error, Save disabled, and the preview outlines the heading |
| PARAGRAPH | textarea | Home intro ≤ 220, About story ≤ 400, Contact "after sending" ≤ 160. The counter turns amber at 85% |
| BUTTON | label + target select | Label ≤ 24, required. Target: Contact page, Opens WhatsApp, or Calls your number |
| IMAGE | photo chooser + "No photo, show prices" | Picks from Photos. "Add photos" links there |
| LIST | rows with remove and "+ Add" | Home areas: ≤ 10 items, each ≤ 28 characters. Shared with Site settings |
| SECTION | on/off switch with a description | How it works, Customer reviews, Questions |
| FROM ANOTHER SCREEN | info and a link | Prices come from Services & prices; contact details from Site settings |

The block lists for each page are in `reference/lw-pages.html` (`this.live`).

### Services & prices (`lw-services`)

**The list**
- Columns: order (↑ ↓), name with the included items, time, price, and an "On the site" switch.
- An unpublished row gets a **NOT PUBLISHED** pill.
- When there are more than 8 services, a search box appears ("Find a service", with "No service matches …").
- The Home page shows the first 6 visible services.

**The editor** (side panel; full screen at ≤ 600px)
- **Name:** required, ≤ 40 characters.
- **Price:** whole rands, or tick "No fixed price" to show "Ask for a price". A price is required otherwise.
- **How long it takes:** a select.
- **What's included:** up to 6 lines.
- **Show on the site** switch.
- A live preview of the site card.
- **Saving** creates a draft and shows the toast "Saved as a draft. Publish to show it on your site."
- **Delete** confirms and says enquiries and bookings keep their details.
- **Closing with unsaved edits** confirms. Escape closes the dialog first, then the panel.
- **Empty state:** "What do you offer?" with "Add your first service".

### Photos (`lw-photos`)

**Uploading**
- The drop area doubles as a "Choose photos" button. The "Upload photos" button opens the same file picker.
- Each file shows progress and ends in one of these states:

| Result | Message to show |
|---|---|
| Uploaded | ADDED. "Added to the gallery. Give it a description below." |
| Too big (> 10 MB) | NOT ADDED. "Too big (14.2 MB). Photos can be up to 10 MB…" |
| Wrong type (not JPG, PNG or WebP) | NOT ADDED. "That's a PDF. Upload photos as JPG, PNG or WebP." |
| Small (< 1200px wide) | ADDED, with a warning. It goes to the gallery only, and its card says it may look blurry as the main photo |
| Failed partway | FAILED, with **Try again**. Other files are unaffected |

- Convert HEIC to JPEG on upload, and strip location data (EXIF GPS).

**Photo cards**
- A size chip, a **description** field, "Show on" chips (Home photo, About, Gallery), ← → order buttons, and **Remove**.
- Only one photo can be the Home photo; picking a new one moves it.
- A photo with no description gets an amber card outline and hint, and can be found with the "Needs a description" filter. A missing description warns but doesn't block publishing.
- **Remove** confirms and says which pages lose the photo. For the Home photo, it says the prices card will show instead.
- **Empty state:** "No photos yet", saying the site still looks finished without them.

### Site settings (`lw-settings`)

- **Fields:**
  - business name (required, ≤ 40)
  - short description
  - phone
  - WhatsApp (or tick "same number")
  - email for enquiries
  - areas: chips with remove, plus an add field (Enter adds)
  - opening hours: weekdays, Saturday, Sunday
  - Instagram and Facebook links (optional)
- **"Appears on" chips under each field** show everywhere that value is used. That's the brief's "one field changes it everywhere".
- **Validation runs on Save:**
  - South African phone format
  - complete email address
  - an Instagram link must contain `instagram.com/`
  - a summary alert gives the count of errors
- **A live preview card** shows the logo (from the first word of the name), the call/WhatsApp bar, hours and areas.
- **Web address:** read only, "[yourdomain.co.za] · CONNECTED · SECURE". byteleaf manages it, and the owner contacts us to change it.

### Overview (`lw-overview`, based on the existing dashboard)

- A status card: live and up to date, or N changes waiting since the last publish.
- Three quick actions: Edit a page, Change a price, Add photos.
- New enquiries and today's bookings.
- **New admin:** welcome copy, starter actions ("Write your Home page", "Add your services", "Add photos"), and empty lists that say what will appear.
- **Loading:** a skeleton.

---

## 6. Re-skin (`lw-themes`)

Only these change per business: `--acc`, `--acc-h`, `--acc-t`, `--acc-soft`, `--acc-ring`, the logo mark and the name. The default brand is the business's own.

| Brand | --acc | --acc-h | --acc-t | --acc-soft | --acc-ring |
|---|---|---|---|---|---|
| Tsela Mobile Wash | #1D6B47 | #175A3B | #175A3B | #E8F3EC | rgba(29,107,71,.2) |
| byteleaf | #166FE5 | #0F5FCC | #0F5FCC | #EEF4FE | rgba(22,111,229,.2) |
| Bright Spark Electrical | #C2410C | #A3360A | #A3360A | #FDF0E8 | rgba(194,65,12,.2) |

- **All text pairs pass AA.** White on the accent: Tsela 6.47, byteleaf 4.73, Spark 5.18.
- **Accent against the dark sidebar is below 3:1** for Tsela (2.94). That's why the active item always has the white edge.
- **The sample site's colours are separate tokens** (`site-tokens.css`). The admin preview of the site always uses them, whatever the admin brand.

---

## 7. Showcase page (C, `lw-demo`)

**Page outline**
- byteleaf header (Projects active) and footer, then a breadcrumb.
- Eyebrow: "SHOWCASE PROJECT 3 OF 4 · WEBSITE AND ADMIN".
- Two-line headline and the amber demo note.
- **The stage** (below).
- What's included, with `[delivery time]` and `[from price]` and "Not included yet…".
- How we set it up (3 steps).
- CTA: "Want a site like this?"

**The view switch:** "What your customers see / What you manage".
- **Customers:** a drawn browser frame (Tsela site) and a drawn phone side by side. Below 900px only the phone shows.
- **Owner:** a drawn browser frame of the admin. Below 600px the mini sidebar is hidden.
- **No real browser chrome or logos.**

**Three stories**
- Each has a step counter, **Restart** and **Next step**.
- The button to tap has a pulsing blue ring.
- Tapping anything else shows "This story follows one path…".
- The finished state shows a green summary and a "Next: …" button.

| Story | Steps |
|---|---|
| **1 · A customer sends an enquiry** | Site home → contact form → sent → admin Enquiries (new row highlighted, detail with Reply on WhatsApp / Reply by email / Archive, "Also sent to [email address]") |
| **2 · You change a price** | Admin services list → editor (R 250 → 270) → publish bar → site Services page with the row highlighted ("Updated just now") |
| **3 · You add photos** | Admin Photos, empty → 3 added, NOT PUBLISHED, publish bar → site gallery fills in |

- **The stories are scripted.** Use a simple client-side reducer `{ view, story, step, price, photos }`; the steps are in `script()` in the reference.
- **All story copy** is in `launch/copy.json → showcase.stories`.

---

## 8. Motion (CSS only)

| What | Duration and easing |
|---|---|
| Admin panels and side editors | slide .35s `cubic-bezier(.2,.8,.2,1)`, from translateX(16px) |
| Modal | `pop` .3s; scrim fade .2s |
| Toast | .35s rise. Publish toast stays 10s (Undo), others 3.5–4s |
| Skeleton | gradient shimmer, 1.2s linear, infinite |
| Upload progress | width .3s |
| Quick-action cards | lift translateY(-2px) and a shadow, .2s |
| FAQ "+" | rotates 45° when open, .2s |
| Sample site button press | translateY(1px), .15s |
| Sending spinner | 0.8s linear rotate |
| Showcase: highlighted target | ring pulse, 1.6s ease-in-out, infinite |
| Showcase: changed price or gallery tile | yellow flash fading out over 1.6s |
| Showcase: hero entrance | `rise` .9s with .1s / .2s / .3s delays |

**Everything is removed under `prefers-reduced-motion: reduce`.**

---

## 9. State captures (`screenshots/state-lw-*.png`)

| Area | Captures |
|---|---|
| Sample site | `site-home-no-photos`, `site-about-no-photos`, `site-gallery-no-photos`, `site-form-filling`, `site-form-missing-number`, `site-form-bad-number`, `site-form-sending`, `site-form-failed`, `site-form-sent`, `site-mobile-menu`, `site-mobile-no-photos` |
| Pages editor | `pages-loading`, `pages-unsaved`, `pages-saving`, `pages-saved-not-published`, `pages-publish-confirm`, `pages-published-undo`, `pages-publish-failed`, `pages-heading-too-long`, `pages-heading-empty`, `pages-leave-unsaved`, `pages-no-photo-phone-preview`, `pages-mobile-edit`, `pages-mobile-preview`, `pages-brand-byteleaf`, `pages-brand-spark` |
| Services | `services-edit`, `services-edit-unsaved`, `services-saved-toast`, `services-new-errors`, `services-delete-confirm`, `services-close-unsaved`, `services-empty`, `services-long-list` |
| Photos | `photos-upload-results`, `photos-needs-description`, `photos-remove-confirm`, `photos-empty` |
| Settings | `settings-name-changes-logo`, `settings-errors`, `settings-saved-not-published` |
| Overview | `overview-changes-waiting`, `overview-new-admin`, `overview-loading`, `overview-byteleaf`, `overview-spark` |
| Showcase | `demo-manage-view`, `demo-enquiry-form`, `demo-enquiry-admin`, `demo-price-edit`, `demo-price-publish`, `demo-price-site`, `demo-photos-empty`, `demo-photos-gallery` |

---

## 10. Components

**New**
- **Sample site:**
  - `SiteHeader` (desktop navigation / phone Call + Menu)
  - `MobileCallBar`
  - `Hero` (photo or prices-card variant)
  - `StepList`, `ServiceCard`, `ServiceRow`, `AreaChips`
  - `ReviewCard` (with the "Sample review" tag)
  - `FaqItem` (`<details>`)
  - `PhotoFrame` (caption chip)
  - `BeforeAfterPair`
  - `EnquiryForm` (with sent and failed states)
  - `CtaBand`, `SiteFooter`, `DemoStrip`
- **Admin:**
  - `WebsiteSidebar` (status line)
  - `PublishBar` + `PublishConfirm` + `PublishToast`
  - `StatusPill` (unsaved / not published / live)
  - Pages editor: `PageTabs`, `BlockCard` with `HeadingField`, `TextField`, `ButtonField`, `ImagePicker`, `ListField`, `SectionToggle`, `LinkedBlock`, `CharCounter`
  - `LivePreview` (desktop/phone)
  - Services: `ServiceList`, `ServiceEditor`
  - Photos: `UploadDrop`, `UploadQueue`, `PhotoCard`
  - Settings: `SettingsForm`, `AppearsOn`, `DetailsPreview`, `DomainCard`
- **Showcase page:** `ViewSwitch`, `StoryTabs`, `BrowserFrame`, `PhoneFrame`, `MiniSite`, `MiniAdmin`

**Reused from the byteleaf admin**
- shell styles, `btn-*`, `field`, `search`, `pill`, `sw` (switch), `ibtn`
- order buttons from the WhatsApp Services screen
- modal + scrim, toast, skeleton, empty-state pattern
- the Enquiries and Bookings screens

---

## 11. Out of scope, and where it plugs in

| Feature | Where it would go |
|---|---|
| **Online payments** | After an enquiry is confirmed in Bookings: "Send payment link". |
| **Shop** | A new page type with its own block set. |
| **AI** | The knowledge chatbot (project 1) drops in as a widget on the site. |
| **Languages** | Per-block translations behind the same limits; leave 30% headroom. |
| **Blog** | A new page type. |

Don't design or build any of these now.

---

## 12. Definition of done

- [ ] Parity with `reference/lw-*.html` at 1440, 768 and 390, and at 320 for the sample Home and Contact pages, the Pages editor and the showcase page.
- [ ] The sample site works with photos and without, and meets the speed budget in §4.
- [ ] Every block limit, validation message and confirm dialog is as specified, and the three statuses are never confused.
- [ ] Publishing is atomic, Undo works for 10 seconds, and a failed publish changes nothing live.
- [ ] Three admin brands pass AA, and only the five accent tokens, the logo mark and the name change.
- [ ] Keyboard-only use works throughout, with a visible focus. Escape closes dialogs and then panels. Statuses are shown in words, not only colours.
- [ ] Reduced motion is respected everywhere.
