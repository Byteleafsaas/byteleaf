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

## Typed requests (DeepSeek)

When the customer types something the keyword parser can't place, such as "braids on Saturday morning", the flow asks an injected interpreter (`ctx.interpret`, built in `lib/server/whatsapp/understand.ts`). It sends the text, the numbered services, staff names and today's date (SAST) to DeepSeek through `lib/server/assistant/llm.ts` (`DEEPSEEK_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`) and gets back JSON: service, day, morning/afternoon/evening, exact time, staff. `lib/whatsapp/understand.ts` checks every field against what really exists (unknown services, past or distant dates, bad times are dropped).

The assistant then says what it understood ("I understood: Knotless braids, Saturday 7 November, morning. Is that right?") with two buttons. Only after a tap does it carry on to the usual time list (filtered to the part of the day) or final confirm. **Nothing is ever booked from model output**: booking still needs the Confirm tap and goes through the same `WaSlotLock` path.

- Keywords first: the model is only asked when the current step's keyword parsing failed, in the menu, service, day or time steps. Not for brand-new customers (they get the consent greeting first), people being handed to a person, or moving an existing booking.
- If there is no `DEEPSEEK_API_KEY`, the call fails or times out (8 s), or the answer is invalid, the interpreter returns nothing and the old behaviour (the keyword parser's reply) stands.
- A named staff member is understood but cannot be honoured yet, because booking picks whoever is free. The assistant says so in the same message.
- All wording is in `lib/whatsapp/copy.ts`.

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

## Not tested against the real DeepSeek API

The interpreter is tested with a fake one and the validation with made-up model answers. The prompt has not been tried against the live model, so check wording such as "next Saturday" and Zulu or Shona phrases with a real key before relying on it.

## Not tested against Meta

The webhook parsing, signature check and message payloads are tested against the shapes in Meta's documentation, and the webhook route was exercised with signed sample payloads. Nothing has been sent through a real WhatsApp number yet, because that needs Meta credentials and an approved template.
