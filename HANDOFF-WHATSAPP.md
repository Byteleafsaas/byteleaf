# Showcase project 2 of 4: WhatsApp booking assistant (developer handoff)

This is part 4 of the handoff. **Read `HANDOFF.md` first.** Its rules apply unchanged:
- Next.js App Router, TypeScript, **vanilla CSS only**
- no UI kits, no animation libraries, **no calendar library**
- 100% visual parity with the reference pages
- nothing cut off at any width from 320 to 1920

The owner admin extends the byteleaf admin shell from `HANDOFF-ADMIN.md`, the same way the knowledge assistant did in `HANDOFF-CHATBOT.md`.

The demo business, **Lerato's Braids & Beauty** (Randburg), is fictional, and so is all of its data: clients, phone numbers and prices. Keep it that way.

Text in `[square brackets]` is a placeholder the owner fills in later. Ship it exactly as written, brackets included.

**Scope of this handoff: Priority 1.** That means the conversation, the calendar, services, staff and hours, the re-skin and the demo page.

The Priority 2 screens appear in the sidebar marked **SOON**: Inbox, Clients, Messages, Booking rules and the set-up checklist. Render those items disabled for now. Their behaviour rules are already fixed where the P1 screens depend on them (§6).

---

## 0. What's in the package

| Path | What it is |
|---|---|
| `reference/wa-*.html` | Runnable static builds of every screen. **Source of truth for markup, copy and values.** |
| `whatsapp/messages.json` | All 34 client messages as data: type, body, buttons, list rows, footers, templates with sample values, trigger and notes. Seed your message catalogue from this. |
| `screenshots/wa-{calendar,services,hours,demo}-{desktop,tablet,mobile}.png` | Full-page captures at 1440, 768 and 390px. The calendar and the demo page are also captured at 320 (`-small`). |
| `screenshots/wa-map.png`, `wa-book.png`, `wa-change.png`, `wa-themes.png` | Spec boards: the conversation map, the two-part message library, and the re-skin tokens. |
| `screenshots/state-wa-*.png` | 35 interaction states (§8). |
| `screenshots/_audit-whatsapp.json` | Overflow audit: 0 problems at every width. |
| `design/Wa*.dc.html` | Original design sources (the `canvas.json` page "Showcase · WhatsApp booking"). |

Two caveats carry over from the earlier parts:
- The screenshot machine used Inter / DejaVu Sans Mono in place of Geist / Geist Mono. **Build with Geist.**
- The reference pages rebuild their DOM on every keystroke, so typing in them loses focus. This only affects the reference pages; your build must keep focus normally.

Query-string switches on the reference pages:
- `wa-calendar.html`:
  - `?demo=normal|empty|loading`
  - `?brand=byteleaf|plum|teal`
  - `?number=connected|attention`
- `wa-services.html`: `?empty=true` and `?brand=…`
- `wa-hours.html`: `?brand=…`

---

## 1. Surfaces and routes

| Design | Route | Who |
|---|---|---|
| Demo page | `/projects/whatsapp-booking` | public |
| Calendar | `/admin/bookings/calendar` (`?view=day\|week\|list`, `?date=YYYY-MM-DD`, `?staff=`, `?id=` opens the panel) | owner, staff (own column only) |
| Services | `/admin/bookings/services` (`?id=` opens the editor) | owner |
| Staff & hours | `/admin/bookings/hours` (`?tab=salon\|<staffId>`) | owner |
| Inbox, Clients, Messages, Booking rules, Set-up | P2, rendered as disabled SOON items | — |
| WhatsApp webhook | `POST /api/whatsapp/webhook` (plus `GET` for verification) | WhatsApp Business Platform |

**Booking-workspace sidebar.** This is the byteleaf admin sidebar with:
- a "BOOKING ASSISTANT" business card
- a WhatsApp number status line: green "connected" or amber "needs attention"
- a "byteleaf admin" back link (byteleaf brand only)

The conversation itself is not a page we draw: it happens in the client's own WhatsApp app. What you build is the **message content and the state machine** (§5).

---

## 2. Answers to the brief's open questions

These are also on `wa-map.png`.

1. **Choosing a day.** Send a **list of the next open days** (B04), not "Tomorrow / Saturday / Pick another day".
   - Closed and full days are never offered.
   - Each row says how many times are open, for example "Three times open".
2. **WhatsApp bookings vs ones the owner typed in.**
   - WhatsApp bookings get a small chat-bubble icon. Hand-entered bookings get no mark.
   - The panel always says the source in words: "Booked on WhatsApp · Mon 2 Nov, 19:42" or "Added by Lerato · …".
   - No extra colours.
3. **Inbox (P2): who is talking, and is the bot paused?**
   - Every message is labelled Assistant, You (staff name) or the client.
   - While a person has the chat, a full-width strip says "You're replying · assistant paused", with **Hand back**. The demo page already shows this.
4. **A chat past the 24-hour window.** Use a neutral clock chip, not a red error:
   - while open: "REPLY WINDOW · 23 H LEFT"
   - once past it: "Window closed · you can send a template"
   - The reply box then becomes a template picker.
5. **Demo page.** A **guided story you drive by tapping** the same buttons a client would, with **Next step** for people who just watch. Add a "Try it on your phone" card with `[QR code]` and `[demo WhatsApp number]`.
6. **How much AI reasoning the client sees.** **None.**
   - It shows only what it understood, in the same summary format as the confirm message (B14), and waits for a tap.
   - "Not right" falls back to the service list. It never books from a guess.

---

## 3. WhatsApp limits we designed to

Checked against Meta's interactive-message docs in Nov 2026. Re-check them before launch.

| Type | Limit |
|---|---|
| Body (text, interactive, template) | 1024 characters. Copy rule: aim for under ~60 words. |
| Reply buttons | max 3, title max 20 |
| List | 1 button (max 20), **max 10 rows in total**, row title max 24, row description max 72, section title max 24 |
| Header / footer | 60 each |

**Translation headroom.** Every string must still fit at **+30%**, since isiZulu, Afrikaans and Sesotho often run longer. The library marks each string OK, TIGHT or OVER. Every shipped string is OK.

The **service list holds 9 services plus "Ask a person"**. The Services screen enforces this: a 10th service can't be switched on for WhatsApp.

**Bold** is WhatsApp's `*asterisk*` syntax; it's kept in `messages.json`. No other formatting is used.

**Footer convention.** Wherever there's room, put "Reply PERSON to talk to us" in the footer. This is the "always a way out" rule from the brief.

---

## 4. Message catalogue

`messages.json` is the catalogue; `wa-book.png` and `wa-change.png` show every message as the client sees it.

- **B01–B08: booking**
  - first message with consent, service shortlist, service list
  - day list, time list, name (new clients only), confirm, booked
- **B09–B17: other situations**
  - returning client, slot taken, nothing free this week, closed day, past date
  - AI request understood / not understood
  - voice note, photo or sticker; outside opening hours
- **C01–C05: templates**
  - reminder (APPROVED), clinic reminder with neutral wording (PENDING)
  - booking made by the salon (APPROVED), a REJECTED example with its fix
- **C06–C09:** change a booking
- **C10–C12:** cancel, including the late window
- **C13–C17:** ask for a person, take-over, hand-back, STOP, START

**Template rules**
- Every message we send first (reminders, "booked by the salon") is a template in the **Utility** category. Never put marketing in a booking flow.
- Templates must not start or end with a variable. C05 shows the rejection and its fix.

**Clinics**
- When a service has **Keep the service name out of messages** ticked, every client message says "your appointment with Dr [name]" instead of the service name.
- The admin preview shows the list row as "Appointment".
- Never put a diagnosis or reason for the visit in a message.

---

## 5. Conversation logic

The map is `wa-map.png`.

**State per chat:** `{ phone, clientId?, consent: 'yes'|'no'|'unknown', optedOut, botPaused, lastInboundAt, flowState }`.

`flowState` is one of: `idle | pick_service | pick_day | pick_time | ask_name | confirm | change_day | change_time | change_confirm | cancel_confirm | waiting_person`. Store the chosen service, day, staff and start with it.

**Order of checks for every inbound message**
1. **STOP**, STOPP or UNSUBSCRIBE (case-insensitive) → C16. Set `optedOut`, keep bookings.
2. **START** → C17.
3. **PERSON**, the "Ask a person" button or row, or a recognised "speak to someone" → C13.
   - Set `botPaused`, flag the chat, notify the owner.
   - While `botPaused`, the bot sends nothing.
4. **Outside opening hours** → B17, then continue normally if they tap "Book now".
5. **Non-text** (audio, image, sticker, video) → B16. The media is still stored for the inbox.
6. **Tap replies:** button or list `id` → advance the state machine. Use stable ids such as `svc:knotless`, `day:2026-11-07`, `t:0800`, not the visible titles.
7. **Free text:**
   - Optional AI parse into `{service?, date?, partOfDay?}`.
   - Confident → B14. Unsure → B15.
   - A date in the past → B13. A closed day → B12.
8. **New number** → B01 (consent) before anything is booked. **Known number** → B09.

**Booking rules**
- Starts every **30 minutes**.
- A start is offered only if service length plus clean-up time fits before closing, a break, or the next booking.
- Hold the chosen slot for **5 minutes** while B07 waits for Confirm. If the hold expires or someone else books it, send B10.
- Re-check availability **inside the transaction** that creates the booking. Nobody is ever double-booked by the bot.

**Reminders**
- C01 goes out the day before at **18:00 SAST** (P2 setting).
- Skip it if `optedOut`, or if consent is `no`.
- No reply leaves the booking **Unconfirmed**, and the calendar shows that.

**Late cancellation**
- Less than **24 hours** before the start (P2 setting) → C12. Record the fee on the client; never take payment in chat.

**24-hour window**
- Free-form messages are allowed only within 24 hours of `lastInboundAt`. Otherwise send templates only.
- The admin uses the same check to decide whether a move or cancel can notify by text or needs C04.

**Times** are always South African time (SAST, UTC+2), 24-hour `HH:MM`. Dates are written "Saturday 7 Nov" or "Sat 7 Nov". The calendar header shows "SAST · UTC+2".

---

## 6. Admin behaviour

### Calendar (`wa-calendar`)

**Views**
- **Day:** a column per staff member. On phones (≤ 760px) it shows **one staff member at a time**, with staff chips to switch.
- **Week:** Mon–Sun, staff side by side inside each day.
- **List:** the day's bookings with status pills.
- **Phones always open on Day view.**

**Grid**
- 08:00–18:00, **64px per hour**, a line every 30 min, sticky time column.
- Plain absolutely-positioned blocks. **No calendar library.**

**Blocks**
- Text first: time range (mono), client, service, and a status label in words ("Unconfirmed", "Reminder failed", "No-show"). Never rely on colour alone.
- Confirmed: `--acc-soft` fill with a 3px accent edge.
- Unconfirmed: white with a dashed `#6B7891` border.
- No-show: grey with the name struck through.
- Clean-up time after a booking is a hatched strip under the block.
- Breaks, time off and closed hours are hatched areas with a label.
- The now-line is `#D92D20` with a time chip.

**Banners**
- closed day
- fully booked ("WhatsApp clients are offered the next open day")
- staff member off
- **WhatsApp number needs attention** (amber, top of page, "Reconnect number")

**Booking panel**
- 400px on the right. At ≤ 1100px it's fixed over the calendar; at ≤ 600px it's full screen. **Lock body scroll** while it's open on phones.
- Contents: status pill and source line; service, when, with, price, reminder state (a failed reminder has **Try again**); a client card with masked phone, history and note.
- "Open chat" and "Client profile" are disabled until P2.
- Actions:
  - **Mark as confirmed:** shows "Saving…", then a toast.
  - **Move**
  - **Mark no-show:** only once the start time has passed. Shows an inline **Undo**.
  - **Cancel booking:** an alertdialog with "Tell [name] on WhatsApp", then a toast with **Undo**.

**Move / New booking**
- Choose day chips, staff chips and a grid of 30-minute start times:
  - free
  - **Busy** (dashed red)
  - unavailable (grey, disabled)
- **Picking a Busy time shows the double-booking warning.** Save stays disabled until "Book it anyway, I've checked with [staff]" is ticked.
- Move has "Send [name] a WhatsApp message about the change", on by default. It uses C04 if the window is closed.
- New booking validates the client name and start time on submit, with inline errors.

**Keyboard**
- Escape closes the dialog first, then the panel.
- Focus returns to the block that opened it.

### Services (`wa-services`)

**List**
- Rows: order (↑ ↓ buttons, the tap alternative to drag), name with the auto WhatsApp line, length, price, staff avatars, clean-up time, "On WhatsApp" switch.
- **Order here is the order in the WhatsApp list.**
- On narrow widths, length, staff and clean-up time hide; at ≤ 440px price hides too (it's already in the line under the name).

**Editor**
- Fields: name, length (hours + 15-minute steps), price, clean-up time, who can do it, the WhatsApp line, the "Show on WhatsApp" switch, and "Keep the service name out of messages".
- Counters:
  - name: 24 characters
  - WhatsApp line: 72 characters
  - amber when the +30% headroom isn't met, red when over the limit
- A live preview of the WhatsApp list row.

**Validation**
- name required and ≤ 24 characters
- price required (0 = Free)
- at least one person
- at least 15 minutes

**Dialogs**
- Unsaved changes → "Discard your changes?"
- Delete → confirm, saying how many upcoming bookings keep the service.

**Empty state:** "Add your first service" and "Start from a salon template".

### Staff & hours (`wa-hours`)

**Tabs:** Salon hours, then one tab per staff member.

**Salon hours**
- One row per weekday: open switch, opens/closes selects (30-minute steps), break chip or "+ Add a break".
- **Closing must be after opening.** Otherwise the row shows an inline error and Save is disabled.
- Public holidays: upcoming South African dates, closed unless switched open.

**Staff tab**
- "Same as salon hours" switch. While it's on, the week is read-only.
- Days the salon is closed show "Salon closed".
- Time off: from/to dates, a private note, validation, and a clash pill when it affects bookings.

**Live preview:** "Times clients will be offered" for the chosen service and day, using the same rule as §5. Booked starts are struck through; it explains why a day has none.

**Saving:** a header bar shows Unsaved / Discard / Save; then a "Saved" banner. **Saving never moves existing bookings.**

---

## 7. Re-skin (`wa-themes.png`)

Only these change per client: `--acc`, `--acc-h`, `--acc-t`, `--acc-soft`, `--acc-ring`, the logo mark and the business name. Set them on the admin root element.

| Brand | --acc | --acc-h | --acc-t | --acc-soft | --acc-ring |
|---|---|---|---|---|---|
| byteleaf | #166FE5 | #0F5FCC | #0F5FCC | #EEF4FE | rgba(22,111,229,.2) |
| Lerato's (plum) | #8B2F7E | #74256A | #7A2470 | #F7ECF5 | rgba(139,47,126,.2) |
| Mvelo Physio (teal, clinic) | #0E7A6D | #0B6458 | #0B6458 | #E7F4F2 | rgba(14,122,109,.22) |

**Rules**
- `--acc` is for fills and for text on white.
- `--acc-t` is for accent text on the page grey `#F4F7FB` and on `--acc-soft`.
- **All text pairs pass AA in all three brands.** The live table is on the board.
- The active sidebar item also gets a **3px white inset edge**, so it's still visible when the accent is too dark against the `#07101F` sidebar (plum is 2.5:1).
- Fixed in every brand: sidebar `#07101F`, ink `#0B1220`, page `#F4F7FB`, borders `#E3E9F2`/`#D5DEEB`, status colours, type, spacing and motion.
- The client's set-up must reject an accent where white text is under 4.5:1.

---

## 8. State captures (`screenshots/state-wa-*.png`)

| Area | Captures |
|---|---|
| Calendar | `panel`, `noshow-undo`, `reminder-failed`, `move-double-book`, `moved-toast`, `cancel-confirm`, `new-booking-errors`, `saving`, `week`, `list`, `fri-day-off`, `sat-fully-booked`, `sun-closed`, `demo-empty`, `demo-loading`, `number-attention`, `brand-plum`, `brand-teal`, `mobile-panel` |
| Services | `edit`, `name-too-long`, `discard-dialog`, `delete-confirm`, `new-errors`, `empty`, `mobile-edit` |
| Staff & hours | `staff`, `invalid-unsaved`, `time-off-error`, `saved` |
| Demo page | `list-sheet`, `booked`, `rescheduled`, `owner-took-over`, `handed-back` |

---

## 9. Demo page (`wa-demo`)

**Layout:** byteleaf site header (Projects active) and footer, then:
- breadcrumb
- hero: "SHOWCASE PROJECT 2 OF 4 · AUTOMATION"
- amber demo note, which states that the phone is our drawing, not WhatsApp
- the story tabs
- the stage
- "Try it on your own phone" and "Built for how bookings really go"
- "How we set it up for you"
- CTA band

**Story tabs:** 1 Book an appointment · 2 Reschedule from a reminder · 3 Ask for a person. Each has a step counter, **Restart** and **Next step**. The button reads "Next: owner's turn" when the next step is the owner's.

**Phone**
- 360 × 720 (640 tall on small phones), drawn with our own neutral style. **No WhatsApp logo, green or exact UI.**
- Chat background `#ECEFF3`; business bubbles white; client bubbles `#DCE6F4`; staff bubbles have a plum left edge.
- The expected option has a pulsing blue ring (`.go`). Tapping anything else shows "This demo follows one path. Tap the highlighted option."
- List buttons open a bottom sheet with radio rows. The input is a disabled "Tap the options above".

**Owner side**
- **Flows 1 and 2:** a mini calendar.
  - The held block appears as "Held · confirming", then "New · WhatsApp".
  - The moved block leaves a hatched "Moved to Tue 10:30" on Saturday.
  - A dark notification bar appears above it.
- **Flow 3:** an inbox.
  - A "REPLY WINDOW · 23 H LEFT" chip and a status strip.
  - Buttons: Take over → Send → Hand back to assistant, with the same pulsing ring.

**State:** keep it client-side (a simple reducer of `{flow, step, msgs, owner, sheet}`). The content of the scripted steps is in the reference page's `script()`. Typing delay is 700ms; under reduced motion it's instant.

---

## 10. Components

**New**
- `BookingSidebar`: the variant with the business card and number status
- Calendar:
  - `CalendarToolbar` (date nav, view switch, staff chips, legend)
  - `DayGrid`, `WeekGrid`, `AgendaList`
  - `BookingBlock`, `HatchZone`, `NowLine`
- `BookingPanel` (view / move / new), `SlotGrid`, `DoubleBookWarning`
- Services: `ServiceRow` with `OrderButtons`, `ServiceEditor` with `CharCounter` and `WaListRowPreview`
- Hours: `WeekHoursRow`, `BreakChip`, `TimeOffList`, `HolidayRow`, `SlotPreview`
- Demo page: `ChatPhone`, `ChatBubble`, `ReplyButtons`, `ListSheet`, `StoryTabs`, `MiniCalendar`, `MiniInbox`

**Reused from the byteleaf admin**
- shell and sidebar styles
- `btn-*`, `field`, `pill`, `sw` (switch), `ibtn`
- modal + scrim, toast, empty-state pattern, `rise` / `slide` / `pop` keyframes

---

## 11. Motion (CSS only)

| What | Duration / easing |
|---|---|
| Booking panel and service drawer | slide in .3–.35s `cubic-bezier(.2,.8,.2,1)`, translateX(16px) → 0 |
| Modal | `pop` .3s same easing, scale(.97) → 1; scrim fade .2s |
| Toast | .35s rise; auto-hides after 5s (Undo stays for those 5s) |
| Skeleton | gradient shimmer 1.2s linear, infinite |
| Booking block hover | translateY(-1px) and a shadow, .2s |
| Demo: new message | `msgIn` .25s ease-out, translateY(6px) → 0 |
| Demo: list sheet | .3s from translateY(100%) |
| Demo: highlighted option | ring pulse 1.6s ease-in-out, infinite |
| Demo: new calendar block | `pop` .5s |
| Switch knob, meters | .2s |

All of these are removed under `prefers-reduced-motion: reduce`, and the demo then skips the typing delay.

---

## 12. Privacy and compliance (POPIA)

- **Consent** (B01) is stored with a date. No reminders go out without it. STOP is honoured immediately, and START reverses it.
- **Store only:** name, WhatsApp number, booking history, reminder consent and opt-out, and private notes written by the owner.
- **Never ask for health, medical or ID details in chat.**
- Phone numbers are masked in lists ("+27 82 *** 4471"). Show the full number only on deliberate reveal (P2 client profile).
- Clinic mode keeps service names out of every message (§4).

---

## 13. Definition of done

- [ ] Pixel parity with `reference/wa-*.html` at 1440, 768 and 390; calendar day view and demo page usable at 320.
- [ ] Every string in `messages.json` is within its limit with +30% headroom; ids, not titles, drive the state machine.
- [ ] No double booking from WhatsApp, guaranteed in the database transaction; manual double-booking only after the explicit warning.
- [ ] STOP / START / PERSON work at every step; templates are used outside the 24-hour window.
- [ ] Three brands pass AA; only the 5 accent tokens, logo and name change.
- [ ] Keyboard-only use works throughout; Escape closes dialogs and panels; statuses are words, not colours.
- [ ] Reduced motion is respected everywhere.
