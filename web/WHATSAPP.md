# WhatsApp booking assistant: engine and set-up

This is the booking engine behind showcase project 2. The screens (admin calendar, demo page) are waiting on the design team. Everything below already works and is tested.

## What exists

| Part | Where |
|---|---|
| Message shapes and WhatsApp's limits | `lib/whatsapp/types.ts` |
| Opening hours and free times | `lib/whatsapp/slots.ts` |
| The conversation (a state machine) | `lib/whatsapp/flow.ts`, every word in `lib/whatsapp/copy.ts` |
| Understanding typed text ("sat", "8am") | `lib/whatsapp/parse.ts` |
| Meta webhook and send helpers | `lib/whatsapp/cloud.ts` |
| Booking, moving and cancelling with no double-booking | `lib/server/whatsapp/calendar.ts` |
| One message in, replies out, everything saved | `lib/server/whatsapp/inbound.ts` |
| Reminders | `lib/whatsapp/reminders.ts`, `lib/server/whatsapp/reminders.ts` |
| Webhook and reminder endpoints | `app/api/whatsapp/webhook`, `app/api/whatsapp/reminders` |
| Website simulator (no WhatsApp needed) | `simulateWhatsAppAction` in `lib/server/actions/whatsapp.ts` |

Final wording from the design team goes in `lib/whatsapp/copy.ts` and nowhere else.

## No double-booking

Every 15 minutes a staff member is busy has a row in `WaSlotLock`, and the collection has a unique index on staff and time. Booking inserts the rows first. If two customers confirm the same slot at the same instant, the second insert fails and that customer is told the time was just taken. `npm run wa-simulate` proves it: ten simultaneous customers, exactly one booking.

## Try it without WhatsApp

```
npm run seed-whatsapp     # loads the demo salon, Lerato's Braids & Beauty
npm run wa-simulate       # runs real conversations against the database and checks the results
```

## Connecting a real WhatsApp number

1. In Meta's developer portal, create an app with the WhatsApp product and a business phone number.
2. Set these on the server:

   | Variable | What it is |
   |---|---|
   | `WHATSAPP_TOKEN` | A permanent access token for sending |
   | `WHATSAPP_APP_SECRET` | The app secret. Webhooks are rejected without a matching signature |
   | `WHATSAPP_VERIFY_TOKEN` | Any string you choose, used once when Meta checks the webhook |
   | `WHATSAPP_REMINDER_TEMPLATE` | Name of the approved reminder template (see below) |
   | `CRON_SECRET` | Secret for the reminder scheduler |

3. In Meta, set the webhook URL to `https://<your domain>/api/whatsapp/webhook` with the verify token, and subscribe to `messages`.
4. Save the number's **phone number id** on the business (`WaBusiness.phoneNumberId`). Incoming messages are matched to a business by it.
5. Production refuses the webhook (503) until `WHATSAPP_APP_SECRET` is set.

## Reminders

A scheduler calls `POST /api/whatsapp/reminders` every few minutes with `Authorization: Bearer <CRON_SECRET>`. For each booking it sends the 24-hour and 2-hour reminders once. Inside WhatsApp's 24-hour window it sends a normal message with buttons. Outside it, it needs an approved template named in `WHATSAPP_REMINDER_TEMPLATE`, with four body values (first name, service, day, time) and three quick-reply buttons whose payloads are `remind:ok`, `remind:move:<id>` and `remind:cancel:<id>`.

## Not tested against Meta

The webhook parsing, signature check and message payloads are tested against the shapes in Meta's documentation, and the webhook route was exercised with signed sample payloads. Nothing has been sent through a real WhatsApp number yet, because that needs Meta credentials and an approved template.
