# Review: knowledge chatbot and WhatsApp booking assistant

Baseline before any change: `tsc --noEmit` clean, `vitest run` 17 files / 209 tests passing. Nothing was run against a database, Meta or DeepSeek, so every item below comes from reading the code, except the SSRF one, which was reproduced with Node's URL parser.

## Fixed in this PR (2 review commits + 3 follow-up commits, each with a test)

1. **SSRF bypass in `lib/assistant/net.ts`.** `new URL('http://[::ffff:127.0.0.1]/').hostname` is `[::ffff:7f00:1]`. `isPrivateIp` only recognised the dotted form, so this (and `[::ffff:169.254.169.254]`, `[::127.0.0.1]`, NAT64 and 6to4 forms) passed the check and `fetchHtml` would fetch loopback and cloud-metadata addresses. Now the embedded IPv4 address is extracted and judged.
2. **`lib/whatsapp/flow.ts`: a typed correction at "Is that right?" lost the service.** The interpreter fallback read `state.serviceId`, which the `understood` state does not have, so "no, tuesday" produced "I understood: Tuesday…" and then asked for the service again.

## Findings not fixed, ranked

### High: now fixed (follow-up commits, each with a test)

- **Interpreter spend:** 15 model calls per customer per 10 minutes and `ASSISTANT_DAILY_LIMIT` per business per day, then it falls back to the keyword parser. Note the per-IP limits elsewhere still trust `x-forwarded-for` (see Medium).
- **Stale slot locks:** `releaseOrphanLocks` (run at the start of each reminder tick) deletes future locks older than 10 minutes whose booking is missing or not `booked`.
- **Reminder double-send:** the reminder is claimed with an atomic update before sending and released if the send fails.
- **Template parameters:** code now sends the four values `WHATSAPP.md` specifies (first name, service, day, time). If you would rather include the business name, change the guide and the template together.

### Medium

- **Rate limit and "daily cap" identity rely on `x-forwarded-for`.** `lib/server/auth.ts:20`. The first entry is taken, which a client can set unless the proxy overwrites the header. Per-IP limits (chat, feedback, handover, staff link, simulator, login throttling if it uses the same helper) can be bypassed by rotating the header. The per-workspace daily chatbot cap still holds. Fix: trust only the proxy-appended last/right entry, or the platform's real-IP header.
- **`rateLimit` is not atomic.** `auth.ts:24-34`. On window expiry two concurrent requests can both take the upsert path and both reset the count to 1, or one of them can fail on a duplicate key if `key` is unique. Low impact today; matters if it ever guards something costly.
- **Staff secret falls back to a hardcoded string.** `lib/server/assistant/staff.ts:17`: `TOTP_ENCRYPTION_KEY || 'dev-only-staff-secret'`. If production forgets the variable, anyone can forge a staff cookie or sign-in link. Fix: throw in production when it is unset.
- **Staff sign-in is open for the demo workspace, and the link is not one-time.** `assistant-staff.ts:22-35` returns the sign-in link (`demoLink`) to whoever asks for any `@khumalosolar.co.za` address, and `askAssistantAction` (`assistant.ts:22,39`) lets any visitor choose `channel: 'staff'` for `khumalo`. That is the stated demo design, but it means anything ingested into `khumalo` as "staff only" is public. The email also says the link "works once"; it is a stateless signed token valid for 15 minutes and reusable. Remove `demoLink` and `DEMO_WORKSPACES` before this is used for a real client.
- **Double-tap race in the WhatsApp state machine.** `lib/server/whatsapp/inbound.ts:75-105`. State is read, the step runs, then state is written, with no per-chat serialisation. Two near-simultaneous webhooks (a double tap on Confirm) both read `confirm`; one books, the other gets "that time was just taken" after the customer already has a confirmation. No double booking (the lock holds), but confusing. Fix: version the chat state (`findOneAndUpdate` with the previous state) or skip a message whose predecessor is still processing.
- **A message is marked seen before it is handled.** `app/api/whatsapp/webhook/route.ts:45`. If `handleInbound` or the send throws (database blip), the `WaSeen` row is already written, the route still answers 200, and Meta's retry is discarded. The customer gets no reply and nothing records the loss. Fix: write `WaSeen` after success, or delete it in the catch.
- **Customers can hold unlimited future slots.** `calendar.ts` `bookSlot` has no per-client cap on upcoming bookings. One phone number (or the public simulator) can fill the calendar with real bookings. Fix: a limit such as three upcoming bookings per client, checked in `ctx.book`.
- **A booking can be moved at any time, including minutes before it starts.** `flow.ts` (`manage` → `move`) applies `cancelWindowHours` only as a warning on cancel. Moving to a free slot is unrestricted, so the cancellation policy can be avoided by moving instead. Business decision; flagging it.
- **WhatsApp conversations are stored in full and kept forever.** `inbound.ts:99-105` stores every inbound body in `WaChat.messages` (last 200) with no redaction and no TTL, unlike the chatbot's `Conversation` (redacted, retention-limited). Customers type names, phone numbers and ID numbers. POPIA exposure; apply `redact()` and a retention date.
- **Over-refusal of ordinary solar questions.** `lib/assistant/settings.ts:60,71`. The built-in refused stems match as prefixes: `invest` blocks "Is solar a good investment?" and "return on investment", `stock` blocks "do you keep batteries in stock?", `tax` blocks "taxi"/"tax rebate" questions that the knowledge base may well answer. These get the "outside what I can help with" reply and are logged as refused, not unanswered.
- **DNS-rebinding window in `fetchHtml`.** `safe-fetch.ts:12-34`. The address is checked with `dns.lookup`, then `fetch` resolves the name again. A hostile DNS server can answer public first and private second. Only an admin can submit addresses, so exposure is small; closing it means connecting to the checked IP.

### Low

- `WaSlotLock` grains are 15 minutes from the start time. If `stepMin` is not a multiple of 15, two concurrent bookings that overlap but start at different offsets produce different grain timestamps and do not collide. The default of 30 is safe; validate `stepMin % 15 === 0` on save. (`calendar.ts:63-66`, `models.ts:390`)
- The 24-hour reminder is sent late if the scheduler was down: a booking 3 hours away with no reminder yet gets the "24h" one now, then the "2h" one. (`lib/whatsapp/reminders.ts`)
- `moveSlot` inserts new locks, deletes old ones, then updates the appointment as separate steps. A crash in between over-blocks (not under-blocks) time. (`calendar.ts:127-139`)
- A booking's buffer crossing midnight is not checked against the next day's bookings, because `loadBusy` for a date stops at 24:00. (`calendar.ts` `timesFor`)
- Simulator identity: the phone is derived from the first 12 characters of a client-chosen session string (`lib/server/actions/whatsapp.ts:26`). Anyone who knows or guesses a session prefix reads and acts in that visitor's demo chat. Demo data only.
- `assistantFeedbackAction` is unauthenticated and accepts any `cid`/`mid`, so anyone who learns a conversation id can set its rating and "not helpful" flag. The `reason` field is not redacted. (`assistant.ts:61-72`)
- `privacyUrl` is only validated as a string on the server (`lib/assistant/settings.ts:28`); the `type="url"` check is client-side. A `javascript:` value would become an `href` in the public widget. Admin-only input, so low. Same for `KnowledgeItem.link.href`.
- `chat-day` daily cap returns an error to visitors when reached instead of falling back to quoting the best passage, which the no-model path can still do. (`engine.ts:100`)
- Uploads: `req.formData()` reads the whole body before the 10 MB per-file check, and there is no total cap; ingest runs fire-and-forget with no concurrency limit. Admin-only. (`app/admin/assistant/upload/route.ts`)
- `deleteSourceAction` can race a running ingest, which then inserts items for a deleted source. (`assistant-admin.ts`)
- Staff sign-in rate limit covers requests per IP only, not per email, so one mailbox can be flooded from many IPs. (`assistant-staff.ts:29`)
- `redact()` does not catch obfuscated addresses ("name at gmail dot com"), names or street addresses, and a long number such as "R 120 000 000" is reported as a phone number. Acceptable, but say so in the privacy note.
- The chat history sent to the model comes from the browser (up to 6 turns). Contact details in earlier turns are not re-checked; only the new question is. Content only affects that visitor's own session.

## Checked and found sound

- **A model answer cannot book.** `understand()` only produces a `u:yes`/`u:no` prompt; `applyHint` ends at the day list, time list or the Confirm screen. The only call to `ctx.book`/`ctx.move` is in the `confirm` step on the `ok` tap (or a typed "yes" from the customer). Model output is also re-validated twice: against the real service list and against real dates/times; staff names are never acted on.
- **Interpreter safety:** called only for typed text, never for new customers, handover, opted-out, moving, confirm, cancel or manage steps; times out at 8 s and fails closed; the customer text is passed as data with an explicit ignore-instructions rule; output limited to 5 fields and checked by Zod.
- **Auth:** every admin server action and `app/admin/assistant/upload/route.ts` start with `assertAdmin()`/`getAdmin()`; staff actions check `getStaff()` and scope history to the signed-in email. Public actions (`ask`, `feedback`, `handover`, `simulate`) are rate limited and validated with Zod. Session cookies are `httpOnly`, `sameSite=lax`, `secure` in production.
- **Webhook:** HMAC-SHA256 over the raw body with `timingSafeEqual`; production refuses with 503 if `WHATSAPP_APP_SECRET` is unset; GET verify token compared exactly; `WaSeen` has a unique index and a 48-hour TTL; the reminder route uses a constant-time bearer check and refuses when `CRON_SECRET` is unset.
- **No double booking:** `WaSlotLock` has a unique `{staffId, grain}` index, locks are inserted before the appointment, a failed insert rolls back only its own rows, move keeps the rows it already owns and cancel releases them. Ten concurrent attempts are covered by `npm run wa-simulate` (not run here: it needs MongoDB).
- **Timezone:** SAST is a fixed UTC+2 with no DST, so `sastToUtc`, `todaySast` and the day windows are correct; the interpreter is given today's date in SAST.
- **Ownership:** move, cancel and appointment lookups all filter by `clientId`, and button payload ids are validated as ObjectIds before use.
- **Chatbot redaction:** questions are redacted before saving (conversation log, unanswered log, feedback); messages with contact details are diverted to the hand-over form before reaching the model.
- **Prompt injection (chatbot):** the system prompt treats passages and the question as data, output is schema-checked, `used` indexes are bounds-checked, and the model can only choose among passages already retrieved. It cannot be stopped from paraphrasing a malicious uploaded document, so keep review/approve on for owner-supplied sources.

## Not covered

No database, Meta or DeepSeek access, so nothing was run end to end. `wa-simulate`, the live DeepSeek prompts (including "next Saturday" and Zulu/Shona phrasing) and the Meta template are still untested, as `WHATSAPP.md` already says.
