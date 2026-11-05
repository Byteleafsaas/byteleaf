# byteleaf website: developer handoff

> **Five parts.** This file covers the public website. The admin area (sign-in, bookings, messages, projects, settings, **quotes & invoices + PDF**) is in **`HANDOFF-ADMIN.md`**. Showcase project 1, the **knowledge chatbot**, is in **`HANDOFF-CHATBOT.md`**. Showcase project 2, the **WhatsApp booking assistant**, is in **`HANDOFF-WHATSAPP.md`**. Showcase project 3, **Launch website with admin** (a sample business site, its owner admin and the showcase page), is in **`HANDOFF-LAUNCH.md`**. Read this file first; its rules apply to all five.

**Build target:** Next.js (App Router) + TypeScript + **vanilla CSS**
**Fidelity:** 100% match to the approved design at desktop, tablet and mobile
**Design owner:** Gerald (byteleaf, Johannesburg)

---

## 0. Non-negotiables

1. **Pixel parity.** Every page must match the screenshots in `screenshots/` at **1440px, 768px and 390px** wide. Spacing, font sizes, weights, letter-spacing, colours, radii, borders, shadows and animations must all match. Where this document and the reference build disagree, the **reference build wins** (`reference/*.html`, see §2).
2. **Vanilla CSS only.** Use plain `.css` files: `app/globals.css` plus CSS Modules (`*.module.css`). Do **not** use Tailwind, Sass/SCSS, styled-components, Emotion, CSS-in-JS or any UI kit (MUI, Chakra, shadcn…).
3. **No animation or UI libraries.** All motion is CSS keyframes and transitions (§9). No Framer Motion, GSAP or AOS.
4. **Responsive, with nothing cut off.** There must be no horizontal scroll and no clipped text or elements at any width from **320px to 1920px**. The design was audited at 1440, 768 and 390 with zero overflow. Keep it that way.
5. **Accessible as designed.** Use real `<button>`, `<a href>`, `<label>`+`<input>`, `aria-*` and `prefers-reduced-motion` exactly as described in §11.
6. **Copy is final**, except for text in `[square brackets]`. Those are placeholders the owner will fill in (§12). Keep them visible as-is. Do not invent replacements.

---

## 1. Package contents

```
byteleaf/
├── HANDOFF.md                 ← this file
├── HANDOFF-ADMIN.md           ← part 2: admin, quotes & invoices, PDF
├── HANDOFF-CHATBOT.md         ← part 3: showcase project 1, knowledge chatbot
├── HANDOFF-WHATSAPP.md        ← part 4: showcase project 2, WhatsApp booking assistant
├── whatsapp/messages.json     ← every WhatsApp message as data (part 4)
├── HANDOFF-LAUNCH.md          ← part 5: showcase project 3, launch website with admin
├── launch/                    ← sample-site tokens and all copy (part 5)
├── reference/                 ← SOURCE OF TRUTH: runnable static build of the design
│   ├── home.html  services.html  process.html  projects.html  about.html  contact.html  book.html
│   ├── admin-*.html             admin screens (see HANDOFF-ADMIN.md)
│   ├── chatbot-*.html           chatbot screens (see HANDOFF-CHATBOT.md)
│   ├── wa-*.html                WhatsApp booking screens (see HANDOFF-WHATSAPP.md)
│   ├── lw-*.html                launch website screens (see HANDOFF-LAUNCH.md)
│   └── billing-document-pdf.html  A4 quote/invoice template
├── screenshots/               ← full-page captures (nothing cut off)
│   ├── <page>-desktop.png     1440px wide, 1x
│   ├── <page>-tablet.png      768px wide, 2x
│   ├── <page>-mobile.png      390px wide, 2x
│   ├── state-*.png            interaction states (see §10)
│   ├── _audit.json            page heights + overflow audit per breakpoint (public)
│   ├── admin-*.png, state-admin-*.png, pdf-*.png   admin & PDF captures
│   ├── _audit-admin.json      overflow audit (admin)
│   ├── chatbot-*.png, state-{widget,demo,sources,add-source,review,test,staff,unanswered,settings}-*.png   chatbot captures
│   ├── _audit-chatbot.json    overflow audit (chatbot)
│   ├── wa-*.png, state-wa-*.png   WhatsApp booking captures
│   ├── _audit-whatsapp.json   overflow audit (WhatsApp booking)
│   ├── lw-*.png, state-lw-*.png   launch website captures
│   └── _audit-launch.json     overflow audit (launch website)
├── assets/
│   ├── globals.starter.css    design tokens, buttons, header, cards, keyframes (ready to use)
│   ├── logo-mark.svg          32×32 app-icon logo (blue tile + leaf)
│   ├── icon.svg               same as logo-mark, for app/icon.svg (favicon)
│   └── leaf-shape.svg         decorative leaf used in the blue CTA bands
└── design/                    ← original design-tool source files (.dc.html + canvas.json)
```

---

## 2. How to use the reference build

- Open any `reference/*.html` directly in Chrome. Links between pages work, and so do all the interactions (filters, forms, booking).
- **Every element's exact values are inline `style="…"` attributes.** Inspect an element in DevTools to read its padding, gap, font-size, colour, etc. Shared hover, animation and media-query rules live in the `<style>` block in each file's `<head>`.
- The markup inside `<template id="dc-template">` is the design's real structure. Mirror its element hierarchy (section → container → grid → card) so flex and grid behaviour matches.
- `{{ … }}`, `<sc-for>` and `<sc-if>` are design-tool templating. In React these become `.map()` loops and conditionals. The data arrays (services, steps, FAQs, projects, meeting types…) are in the `<script>` at the bottom of each file, inside `renderVals()`. Copy that content verbatim into typed data files (e.g. `lib/content.ts`).
- The reference pages ship a tiny demo runtime. **Do not copy it.** Build proper React components.

> **Screenshot font note:** the screenshot machine couldn't download Google Fonts, so the PNGs use **Inter** in place of Geist and **DejaVu Sans Mono** in place of Geist Mono. Layout, sizes and colours are exact. The real build must use **Geist / Geist Mono** (§3), so glyph widths and line breaks will differ slightly from the PNGs. Treat the reference HTML viewed in a browser with network access as final.

---

## 3. Project setup

```bash
npx create-next-app@latest byteleaf --ts --app --eslint --no-tailwind --src-dir=false --import-alias "@/*"
```

**Fonts.** Use `next/font/google` (self-hosted at build time):

```ts
// app/layout.tsx
import { Geist, Geist_Mono } from 'next/font/google';
const geist = Geist({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], weight: ['400','500'], variable: '--font-geist-mono', display: 'swap' });
// <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
```

**Global CSS.** Copy `assets/globals.starter.css` → `app/globals.css`. It already contains every colour token, the button/header/card classes, all keyframes and the reduced-motion rule.

**Favicon.** Copy `assets/icon.svg` → `app/icon.svg`.

**Suggested structure:**

```
app/
  layout.tsx            fonts, <Header/>, <Footer/> (Book uses <Footer variant="compact"/>)
  page.tsx              Home
  services/page.tsx
  process/page.tsx
  projects/page.tsx     ("use client" child for the filter)
  about/page.tsx
  contact/page.tsx      ("use client" child for the form)
  book/page.tsx         ("use client" child for the booking widget)
components/
  Header.tsx  Footer.tsx  Logo.tsx  Button.tsx  SectionHeading.tsx  CtaBand.tsx
  ServiceCard.tsx  EngagementCard.tsx  ProcessSteps.tsx  ProjectCard.tsx  Icon.tsx
  home/HeroVisual.tsx  home/TechMarquee.tsx
lib/content.ts          all copy/data arrays from the design
```

Keep pages as **Server Components**. Only the filter, contact form, booking widget and (optionally) the header menu need `"use client"`.

---

## 4. Routes

| Design file | Route | Header link active |
|---|---|---|
| Main / home.html | `/` | none |
| Services | `/services` | Services |
| Process | `/process` | Process |
| Projects | `/projects` | Projects |
| About | `/about` | About |
| Contact | `/contact` | Contact |
| Book a call | `/book` | (header CTA has `aria-current="page"`) |

In-page anchors on Services: `#design #frontend #backend #ai #models`.

Set metadata per page. Title pattern: `byteleaf — Services`. Write a description from the page's hero sentence.

---

## 5. Design tokens

All tokens are defined in `assets/globals.starter.css`. Use the variables; don't re-type hex values.

### Colour usage rules
- **Brand blue `#1877F2`:** logo, large headline highlights ("growing.", "one team."), icons, decorative fills, CTA band background, timeline lines.
- **Action blue `#166FE5`:** button fills, links, and any blue text under 24px. (#1877F2 with white text fails WCAG AA, which is why the two blues are split.)
- **Navy `#07101F`:** "How we work with you" section, AI panel, Process "care loop", footer.
- Body copy is `#4B5872` on white and `#B7C3D9` on navy.

### Typography (Geist / Geist Mono)

| Role | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| Hero H1 (Home) | `clamp(46px, 6.2vw, 86px)` | 600 | 0.98 | -0.045em |
| Page H1 (inner pages) | `clamp(44px, 5.6vw, 76px)` (Book: `clamp(42px, 5.2vw, 70px)`) | 600 | 1 | -0.045em |
| Section H2 | `clamp(34px, 4vw, 54px)` | 600 | 1.04 | -0.035em |
| Sub-section H2 | `clamp(32px, 3.6vw, 46px)` | 600 | 1.06 | -0.035em |
| Card H3 | 22–24px | 600 | normal | -0.02em |
| Lead paragraph | 20px (hero) / 17–18px | 400 | 1.55–1.65 | 0 |
| Body | 15–16px | 400 | 1.6 | 0 |
| Eyebrow (mono) | 13px, uppercase, e.g. `01 — WHAT WE DO` | 400 | normal | 0.08em |
| Small mono labels / tags | 12px | 400–500 | normal | 0 |

Headings use `text-wrap: balance`. Paragraphs use `text-wrap: pretty` where the reference sets it.

### Layout
- Container: `max-width: 1240px; margin: 0 auto;`, with `24px` side padding on the section.
- Section rhythm (desktop): `120px` top and bottom. Inner page heroes: `96px` (Services, Process, Projects), `88px` (Contact), `80px` (Book).
- Grids collapse using `repeat(auto-fit, minmax(min(<N>px, 100%), 1fr))`. Keep the exact `<N>` from the reference: 270px for service and engagement cards, 340–360px for project cards, 480–500px for two-column hero/feature rows, 180px for process steps, 200px for footer columns.

### Radii, borders, shadows
Pills 999px; cards 20px; large panels 24px; CTA band and featured project 28px; inputs and icon tiles 12–14px; tags 6px. Borders are 1px `--line`. Shadows are listed in the tokens file.

---

## 6. Global components

### Header (all pages)
- Sticky, `top: 0`, `z-index: 30`, background `rgba(255,255,255,.85)` with `backdrop-filter: blur(14px)`, 1px bottom border `--line-nav`.
- Row layout: Logo (32px mark + "byte**leaf**" wordmark, 22px/700, -0.04em, with "leaf" in brand blue) · nav links (`.navlink`, **in this order: Services · Process · Projects · About · Contact**) · "Book a call" primary button (44px tall, 15px text, arrow icon).
- **≤760px:** hide the links and CTA (`.dnav` / `.dcta`) and show the 44×44 hamburger (`<details class="mnav">` + `<summary class="menu-btn" aria-label="Menu">`). Its panel drops down full-width under the header with 52px tall links and a full-width "Book a call". The icon swaps to an ✕ when open. See `state-mobile-menu-open.png`.
  - In React, a `useState` toggle is fine. Close the menu on route change and on Escape, and keep `aria-expanded` on the button.

### Footer
- **Full** (every page except Book): navy, padding 72/24/40. A 4-column auto-fit grid: brand + tagline · COMPANY · GET IN TOUCH (shows the `[hello@yourdomain.co.za]` placeholder) · STUDIO (Johannesburg, South Africa). Bottom bar: `© 2026 byteleaf` and `Made in Jozi` in 12px mono `#8A98B3`. Make the year dynamic.
- The COMPANY column lists Services · Process · Projects · About.
- **Compact** (Book page): one wrapping row with logo · 5 links (Services, Process, Projects, About, Contact) · `© 2026 byteleaf · Johannesburg`.

### Buttons
`.btn-primary`, `.btn-ghost`, `.btn-light` (white on the blue band) and an outline-light variant (`color:#fff; border:1px solid rgba(255,255,255,.6)`). Height 48px (52px on the Contact and Book forms). Trailing arrow icons nudge 4px right on hover.

### CTA band (bottom of Home, Services, Process, Projects)
Brand-blue rounded panel (28px radius, padding `clamp(40px, 6vw, 80px)`). A decorative white leaf (`leaf-shape.svg`, 420px, 14% opacity) sits at bottom-right, offset (-60px, -120px). Headline on the left, buttons on the right; wraps on small screens.

### Icons
All icons are inline stroke SVGs, `viewBox 0 0 24 24`, `stroke-linecap/linejoin: round`. Copy the path data from the reference. Decorative SVGs get `aria-hidden="true"`.

---

## 7. Pages (top to bottom)

Use the reference HTML for exact values. This section lists structure and anything easy to get wrong.

### 7.1 Home `/`
1. **Hero:** grid-paper background (48px grid of `#EEF2F8` lines) with a radial white fade. Two columns: copy on the left (status pill with a pulsing blue dot, H1 "Your software, / kept **growing.**", lead, two buttons, a mono checklist of four services), and the **hero visual** on the right (520px min-height):
   - Browser window card (78% width, top-left): skeleton sidebar, 3 stat tiles, 6 bars that grow in, and shimmering skeleton lines.
   - Dark terminal card (62%, bottom-left) with three lines that **type in sequence** (delays 0.9s / 2.4s / 3.6s) and a blinking caret.
   - AI chat card (44%, right, top 46%).
   - Two dashed blue connector curves animate (`flow`).
   - Each card floats on its own `floaty` loop (7s / 6s / 8s, staggered).
   - **≤640px:** visual min-height 430px; window 100% wide; terminal left 0, width 88%, mono 11px; AI card 60% wide, anchored `bottom: 140px`. The pill drops ", South Africa".
2. **Tech marquee:** "THE STACK WE WORK IN EVERY DAY", then pill chips scrolling left forever (38s linear). The list is rendered twice and the track translates -50%. The edges are faded with `mask-image`.
3. **01 What we do:** 4 service cards (icon tile, H3, copy, mono tags). On hover the card lifts and the icon tile turns blue and tilts.
4. **02 How we work with you** (navy): blue glow top-right, dotted pattern, 4 dark cards (CARE / BUILD / FIX / TEAM).
5. **03 Our process:** 6 numbered steps in an auto-fit grid. A 2px line runs behind the number circles and draws in left→right. **The line is hidden at ≤1199px**, because the grid wraps there.
6. **04 Selected work:** 3 project cards with patterned placeholder images.
7. **05 Why byteleaf:** 4 points with 40×2px blue rules.
8. **CTA band** → Footer.

### 7.2 Services `/services`
1. Hero with anchor chips (Design, Frontend, Backend, AI integrations, Ways to work).
2. Four alternating feature rows, each with an illustrative panel:
   - Design: type specimen, swatches and buttons.
   - Frontend: dark code editor with a blinking caret.
   - Backend: API endpoint list with pulsing status dots. Method colours are GET `#166FE5`, POST `#0B7A55`, PATCH `#9A5B00`.
   - AI: navy panel showing data → pulsing chip → app outputs, with a flowing dashed line.

   **≤1071px:** when the rows stack, the Frontend and AI panels move **below** their text (`order: 2`).
3. **Ways to work with us:** 4 cards with a price block (`[From R— / month]`, etc.), checklists and a "Talk to us" ghost button pinned to the bottom of each card.
4. **FAQ:** 5 native `<details>` items. The plus icon rotates 45° when open and the open item gets a `#FBFCFE` background. See `state-services-faq-open-desktop.png`.
5. CTA band → Footer.

### 7.3 Process `/process`
1. Hero.
2. **Vertical timeline:** 64px numbered circles, with a 2px line that draws top→bottom (`growY`, 3s). Each step card has a title, a "who/when" pill, copy and a "YOU GET" row of chips. Card hover: `translateX(6px)` and the number circle fills blue.
   - **≤640px:** circles 48px, gap 14px, line at left 23px, card padding 22/20.
3. **Care loop** (navy): copy with 4 A–D beats on the left. On the right, a ring diagram: a dashed ring rotates (30s), a dot orbits (8s) and pulses, 4 labels sit at N/E/S/W, and the blue centre disc holds the leaf mark.
4. **Staying in touch:** 4 stat cards. `[X] hrs` is a placeholder.
5. CTA band → Footer.

### 7.4 Projects `/projects`
1. Hero.
2. **Featured case-study card** (two columns): placeholder image plus CHALLENGE / WHAT WE DID / RESULT. All text is placeholder.
3. **Filter chips** (All, Design, Frontend, Backend, AI), each with a count. The selected chip is ink-filled. Cards animate in with `pop`.
4. Project grid (6 placeholder cards, three rotating image patterns). The image zooms 1.05× on hover.
5. CTA band → Footer.

### 7.5 Contact `/contact`
- Two-panel row (wraps): the **navy info panel** has a stylised map with a pulsing "Johannesburg" pin, 4 contact rows (email, phone/WhatsApp, studio, hours) and a full-width "Prefer to talk? Book a call" button. The **form card** is beside it.
- Form fields:
  - Toggle chips "What can we help with?" (multi-select, default "Maintenance").
  - Name*, Company, Work email*, Phone (optional).
  - "How would you like to work?" select.
  - "When do you want to start?" select.
  - Message textarea.
  - POPIA note and a "Send message" button.
- After a successful submit the form is replaced by a success state: a blue disc pops in and the check draws itself. See `state-contact-sent-desktop.png`.

### 7.6 Book a call `/book`
- Grid-paper background. Left column: **meeting type** radio cards (Discovery call 30 min Free · Technical deep-dive 60 min · In-person meeting 60 min Johannesburg), then a navy **"Your booking" summary**. Right card: **calendar**, **time slots**, **your details** form and **Confirm booking**.
- After booking, the page shows the confirmation state (`state-book-confirmed-desktop.png`).

### 7.7 About `/about`
1. **Hero** (grid-paper background, two columns):
   - **Left:** the "ABOUT BYTELEAF" eyebrow, H1 "The team that keeps your software **growing.**", a lead paragraph, and two buttons: "Meet us on a call" (→ `/book`) and "What we do" (→ `/services`).
   - **Right:** a 220px brand-blue tile holding a large leaf mark.
     - The leaf gently sways ±4° (6s).
     - The tile floats, and must be `position: relative` so it sits above the ring.
     - Behind it, a dashed ring rotates (40s). Size the ring with `width: min(420px, 100%); aspect-ratio: 1`.
     - Three floating chips: "design → frontend", "backend + AI ✓" (ink) and "Johannesburg · SAST" with a pulsing dot.
   - **≤640px:** the visual is 340px tall and the tile shrinks to 168px.
2. **01 Our story:** heading on the left, three paragraphs on the right. The third is a dashed placeholder box for the owner's founding story.
3. **02 The name** (navy rounded panel with a glow):
   - An animated equation of three 140px cards: `01` + leaf = the byteleaf mark. The cards are 96px at ≤640px.
   - Below it, three captions: BYTE / LEAF / THE MARK.
4. **03 How we think:** 4 principle cards with numbered tiles. On hover the tile turns blue and the card lifts.
5. **04 Who you'll work with:**
   - A 4:5 founder-photo placeholder with a brand-blue offset block behind it.
   - Name `Gerald [Surname]`, role line, intro, and a dashed bio placeholder.
   - Pill links: LinkedIn, GitHub and "Book time with Gerald". The real profile URLs are still to come.
6. **05 Where we work:** an intro column plus "In person" and "Remote" cards (grid `align-items: start`).
7. **CTA band** "Let's get to know each other." → Footer.

---

## 8. Interaction logic

| Feature | Behaviour |
|---|---|
| Projects filter | State `filter` (default "All"). A chip shows the number of projects whose `cats` contain its label. Chips are `<button aria-pressed>`. |
| Contact chips | Multi-select array, default `['Maintenance']`. Selected chip = blue fill, white text. `aria-pressed`. |
| Contact submit | `preventDefault`, run native validation (name and email required), then show the success state. "Send another message" resets. **Backend: wire to a Route Handler / Server Action (`POST /api/contact`). Leave a TODO.** |
| Booking: initial month | The month of the **next weekday after today**. On the 30th of a month, for example, it opens the next month. |
| Booking: calendar | Monday-first. Weekends and any date ≤ today are disabled (grey `#A9B4C6`, no hover). Available days have a light-blue fill. Selected day = blue fill with a shadow. Prev-month is disabled at the earliest month. |
| Booking: time | Slots are `09:00 10:00 11:30 13:00 14:30 16:00` (placeholder availability; **must later come from a real calendar source**). They appear (slide in) only once a day is chosen. Before that, show the dashed placeholder "Pick a weekday to see available times." |
| Booking: confirm | Disabled until both a day and a time are chosen. The helper text switches between "Choose a date and time to continue." and "Looks good — just add your details." On submit, show the confirmation screen ("You're booked in.") with meeting · date · time SAST, plus "Back to home" and "Book another". **Backend: TODO (`POST /api/book`, calendar integration).** |
| All times | Africa/Johannesburg (SAST, UTC+2). Compute "today" in that time zone. |

---

## 9. Motion

All keyframes are in `globals.starter.css` and use the same names as the design.

| Name | Where | Spec |
|---|---|---|
| `rise` | Hero items on every page | 0.9s, `cubic-bezier(.2,.8,.2,1)`, staggered `.d1…d5` (0.1/0.2/0.32/0.46/0.6s) |
| `floaty` | Hero cards, Services design panel | 6–8s ease-in-out infinite, ±12px (±8px on Services) |
| `typing` + `blink` | Terminal lines, code caret | `steps(30)` over 1.4s; the caret blinks at 1s steps(1) |
| `marquee` | Tech strip | 38s linear infinite, translateX(-50%) |
| `pulse` | Status dots, AI chip, endpoint dots | 1.8s ease-out infinite ring |
| `flow` | Dashed SVG connectors | `stroke-dasharray: 4 6`, 2–2.4s linear |
| `grow` / `growY` | Process line (Home: x, Process: y), chart bars | 2.2s / 3s, `cubic-bezier(.6,0,.2,1)` |
| `shimmer` | Skeleton bars in browser card | 2.4s linear |
| `spin`, orbit | Care-loop ring 30s, orbit dot 8s | linear infinite |
| `ping` | Contact map pin | 2s |
| `pop` + `draw` | Success / confirmation check | 0.6s, then the check stroke draws |
| `slide` | Time slots, confirmation card | 0.45s |
| Hover lifts | `.card`, `.dcard`, buttons, chips, day cells | values in the tokens file |

`prefers-reduced-motion: reduce` must disable **all** animations and transitions. That rule is already in the CSS.

Optional enhancement (only if it doesn't change any static layout): add scroll-triggered `rise` reveals with `IntersectionObserver` for sections below the fold. Content must be fully visible when JS is off.

---

## 10. Responsive rules (summary)

| Breakpoint | Change |
|---|---|
| fluid | Headings use `clamp()`. Every grid uses `auto-fit/minmax(min(N,100%),1fr)`, so columns drop naturally. |
| ≤1199px | Home process connector line hidden. |
| ≤1071px | Services feature rows stack; the Frontend and AI panels go below their text. |
| ≤760px | Header switches to the hamburger menu. |
| ≤640px | Section padding: 120px → 64px; inner-page hero top → 56px; Services feature rows 72px → 44px. Home hero visual and Process timeline compacted (§7). |

Screenshots to compare against: `*-desktop.png` (1440), `*-tablet.png` (768), `*-mobile.png` (390).

States:
- `state-mobile-menu-open.png`
- `state-projects-filter-ai-desktop.png`
- `state-contact-chips-desktop.png`
- `state-contact-sent-desktop.png`
- `state-services-faq-open-desktop.png`
- `state-book-selected-desktop.png`
- `state-book-confirmed-desktop.png`

---

## 11. Accessibility checklist
- One `<h1>` per page and a logical heading order. Each list of cards is `<article>` with an `<h3>` (or `<h2>` on the Projects grid and Process steps, as in the reference).
- The nav is `<nav aria-label="Main">`. The current page gets `aria-current="page"`.
- Toggles (filters, chips, slots, days, meeting types) are `<button type="button" aria-pressed>`. Calendar days have `aria-label` like "Tue 3 November".
- Every input has a `<label for>`. Required fields use `required`. The focus ring on fields is `0 0 0 4px rgba(24,119,242,.15)` plus a blue border. Keep a visible `:focus-visible` outline on buttons and links (add one if the browser default is suppressed).
- Touch targets are ≥44px. Text contrast is ≥4.5:1; the token split between #1877F2 and #166FE5 exists for this.
- Decorative SVGs, patterns and the hero visual are `aria-hidden="true"`.

---

## 12. Placeholders the owner will supply
Keep these visible exactly as written until they are replaced:

- `[hello@yourdomain.co.za]` (footer and contact; the `mailto:` link too)
- `[+27 00 000 0000]` (`tel:` link)
- Hours `[08:00–17:00]`
- `[X] business hours` reply time
- `[X] hrs` response time
- Prices `[From R— / month]`, `[Quoted per project]`, `[R— / hour]`, `[Let's talk]`, and `[X] hours of changes a month`
- All project names, screenshots, industry, stack and outcome text on Home and Projects
- Booking time slots (placeholder availability)
- About page: founding story, founder surname, title, bio, photo, and the LinkedIn/GitHub URLs

Recommended: put all of these in `lib/content.ts` so the owner can edit them in one place.

---

## 13. Acceptance criteria
- [ ] All 7 routes render and match the screenshots at 1440, 768 and 390. Spot-check 320, 1024 and 1920: no overflow and nothing cut off.
- [ ] `document.documentElement.scrollWidth === innerWidth` on every page at every width.
- [ ] Header menu, Projects filter, Contact form and success state, Booking flow and FAQ all behave as in §8 and the reference.
- [ ] Animations match §9, and all of them stop under reduced motion.
- [ ] Only vanilla CSS; no CSS framework or animation library in `package.json`.
- [ ] Fonts load via `next/font` (no layout shift). The favicon is the leaf mark.
- [ ] Lighthouse (mobile): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- [ ] `npm run build` passes with no type or lint errors.
