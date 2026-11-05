# WhatsApp booking assistant: how it works and how to switch it on

Showcase project 2. Clients book, change and cancel in a short WhatsApp chat; the owner sees everything in the booking admin (`/admin/bookings/calendar`, `/services`, `/hours`); a public demo lives at `/projects/whatsapp-booking`.

The design is in `HANDOFF-WHATSAPP.md`. Every client message is in `whatsapp/messages.json` and `lib/whatsapp/copy.ts` (change wording there and nowhere else).

## What exists

| Part | Where |
|---|---|
| Message shapes and WhatsApp's limits | `lib/whatsapp/types.ts` |
| Opening hours and free times | `lib/whatsapp/slots.ts`, `lib/whatsapp/hours.ts` |
| The conversation (a state machine) | `lib/whatsapp/flow.ts`, wording in `lib/whatsapp/copy.ts` |
| Understanding typed text | `lib/whatsapp/parse.ts`, `lib/whatsapp/understand.ts` (DeepSeek, confirmed by a tap) |
| Meta webhook and send helpers | `lib/whatsapp/cloud.ts`, `lib/server/whatsapp/send.ts` |
| Booking, holding, moving, cancelling | `lib/server/whatsapp/calendar.ts`, `manual.ts` |
| One message in, replies out | `lib/server/whatsapp/inbound.ts` |
| Reminders | `lib/whatsapp/reminders.ts`, `lib/server/whatsapp/reminders.ts` |
| Owner admin | `components/booking-admin/*`, `app/admin/(app)/bookings/*` |
| Demo page | `app/(site)/projects/whatsapp-booking/*`, `lib/whatsapp/story.ts` |

## The guarantees

**No double-booking.** Every 15 minutes a person is busy has a row in `WaSlotLock`, and the collection has a unique index on person and time. Rows are inserted before the booking. If two clients go for the same time, the second insert fails.

**A held slot.** When a client reaches the confirmation, the slot is held for 5 minutes (`WaHold`, with the same locks carrying an expiry). Other clients are not offered it, and it can't be booked from under them. When they tap Confirm, the hold's own rows become the booking, so nobody can slip in between. If the hold ran out and the time is still free, Confirm simply books it; if not, they are told and shown the times still open. The hold is given back when they change the time or cancel.

**The owner can overlap by hand, only on purpose.** In the calendar, a busy time shows the double-booking warning, and Save stays off until "Book it anyway, I've checked with …" is ticked.

**A model answer never books.** Typed text is read by DeepSeek, repeated back as "Just to check, I understood:", and only a tap moves on.

## Try it without WhatsApp

```
npm run seed-whatsapp     # the demo salon, Lerato's Braids & Beauty, with a week of bookings
npm run wa-simulate       # real conversations against the database, with checks (races, holds, hand bookings)
```

## Message templates (submit these in Meta Business Manager)

Messages we send first, outside the 24-hour window, must be approved templates in the **Utility** category. Never put marketing in them, and never start or end a body with a variable. Each has three quick-reply buttons whose payloads the code sets: `remind:ok:<id>`, `remind:move:<id>`, `remind:cancel:<id>`. The buttons are labelled Confirm, Change time, Cancel; add the footer "Reply STOP to opt out".

| Env variable | Template name (suggested) | Body (four values) |
|---|---|---|
| `WHATSAPP_REMINDER_TEMPLATE` | `appointment_reminder` | `Hi {{1}}, this is a reminder of your {{2}} appointment at <Business name> tomorrow, {{3}}, at {{4}}.` then a blank line and `Can you still make it?` |
| `WHATSAPP_REMINDER_TEMPLATE_CLINIC` | `appointment_reminder_clinic` | `Hi {{1}}, a reminder of your appointment with {{2}} tomorrow, {{3}}, at {{4}}. Reply to confirm or change.` |

Values: `{{1}}` first name, `{{2}}` service (or the practitioner for the clinic one), `{{3}}` the day, for example "Saturday 7 Nov", `{{4}}` the time. Type the business name into the body when you submit it, because the code sends four values only. Submit the template in the language you set in `WHATSAPP_TEMPLATE_LANG` (default `en`).

**Clinics.** Tick "Keep the service name out of messages" on a service in the booking admin. Every client message then says "Appointment" (and "with Dr [name]" until a person is assigned), the reminder uses the clinic template, and the service's name is never sent to the AI. Never put a diagnosis or reason for the visit in a message.

When a reminder is due outside the window and the template variable is empty, nothing is sent and the owner sees a failed reminder on the booking.

## Switching on a real number

1. In Meta's developer portal, create an app with the WhatsApp product and a business phone number.
2. Set these on the server:

   | Variable | What it is |
   |---|---|
   | `WHATSAPP_TOKEN` | A permanent access token for sending |
   | `WHATSAPP_APP_SECRET` | The app secret. The webhook is refused without a matching signature |
   | `WHATSAPP_VERIFY_TOKEN` | Any string you choose, used once when Meta checks the webhook |
   | `WHATSAPP_REMINDER_TEMPLATE`, `WHATSAPP_REMINDER_TEMPLATE_CLINIC` | Names of the approved templates above |
   | `CRON_SECRET` | Secret for the reminder scheduler |

3. Save the number's **phone number id** on the business:
   ```
   npm run wa-connect -- --slug lerato --phone-number-id <id>
   ```
   With no id it only checks what is still missing (token, secrets, template, services, hours, staff) and prints the webhook and reminder addresses.
4. In Meta, set the webhook URL to `https://<your domain>/api/whatsapp/webhook` with the verify token, and subscribe to `messages`.
5. Production refuses the webhook (503) until `WHATSAPP_APP_SECRET` is set.
6. Have a scheduler call the reminder endpoint every 5 minutes:
   ```
   curl -X POST https://<your domain>/api/whatsapp/reminders -H "Authorization: Bearer $CRON_SECRET"
   ```

If WhatsApp refuses the token (expired or revoked), the calendar shows "Your WhatsApp number needs attention" until a send works again.

## Reminders

Each booking gets one reminder, the evening before at the business's reminder hour (18:00 SAST by default; `reminderHour` on the business). A booking made after that hour gets none, because the client has only just heard from us. No reply leaves the booking **Unconfirmed**, and the calendar shows it. A client who said "No reminders" or replied STOP is skipped. Inside the 24-hour window it sends a normal message with buttons; outside it, the template.

A failed reminder is recorded on the booking; "Try again" in the booking panel queues it for the next run.

## Not tested against Meta

The webhook parsing, signature check and message payloads are tested against the shapes in Meta's documentation, and the webhook route was exercised with signed sample payloads. Nothing has been sent through a real WhatsApp number yet, because that needs Meta credentials and approved templates. The salon's own notices (a booking moved or cancelled by the owner) go only inside the 24-hour window; there is no template for them yet, so outside it the owner is told nothing was sent.

## Still open

- **No template for owner-made changes** outside the window (a "booking made by the salon" template, design message C04).
- **Per-client limits**: nothing stops one phone number holding many future bookings; see `REVIEW-FINDINGS.md`.
- **Messages and Booking rules screens** (the greyed items in the sidebar) and the Inbox and Clients screens are a later release.
