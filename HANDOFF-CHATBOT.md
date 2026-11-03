# Showcase project 1 of 4 — Business knowledge chatbot: developer handoff

This is part 3 of the handoff. **Read `HANDOFF.md` first.** Its rules apply here unchanged: Next.js App Router, TypeScript, **vanilla CSS only**, no UI kits, no animation libraries, 100% visual parity, nothing cut off at any width. The admin screens reuse the shell and components from `HANDOFF-ADMIN.md`.

The demo business, **Khumalo Home Solar** (Gauteng), is fictional, and all of its data is made up. Keep it that way. Text in `[square brackets]` is a placeholder the owner fills in later. Ship it exactly as written, brackets included.

---

## 0. What's in the package

| Path | What it is |
|---|---|
| `reference/chatbot-*.html` | Runnable static builds of every chatbot screen. **These are the source of truth for markup, copy and values.** |
| `screenshots/chatbot-*-{desktop,tablet,mobile}.png` | Full-page captures at 1440, 768 and 390px. The widget and the demo page are also captured at 320 (`-small`). |
| `screenshots/chatbot-widget-states.png`, `chatbot-themes.png`, `chatbot-phone.png` | Spec boards: every widget state, the 3 themes with AA checks, and the phone frames. |
| `screenshots/state-*.png` | Interaction states (listed in §7). |
| `screenshots/_audit-chatbot.json` | Overflow audit: 0 problems at every width. |
| `design/Cb*.dc.html` | Original design sources. |

Two caveats carry over from the earlier parts:
- The screenshot machine used Inter / DejaVu Sans Mono in place of Geist / Geist Mono. **Build with Geist.**
- The reference pages rebuild their DOM on every keystroke, so typing in them loses focus. This only affects the reference pages; your build must keep focus normally.

Query-string switches on the reference pages:
- `chatbot-widget.html`: `?theme=byteleaf|warm|dark`, `?startOpen=false`, `?nudge=false`
- `chatbot-sources.html`: `?empty=true`
- `chatbot-add-source.html`: `?demoResult=success|unreachable|nothing%20found`
- `chatbot-staff.html`: `?signedIn=false`

---

## 1. Surfaces and routes

| Design | Route | Who |
|---|---|---|
| Demo page (byteleaf site) | `/projects/knowledge-chatbot` | public |
| Widget on a sample client site | `/projects/knowledge-chatbot/widget` (full-screen demo) | public |
| Staff assistant | `/projects/knowledge-chatbot/staff` (demo); for real clients it lives on the client's own domain or subdomain | staff sign-in |
| Knowledge sources | `/admin/assistant/sources` (`?status=`, `?type=`, `?q=`) | owner |
| Add a source | `/admin/assistant/sources/new?via=website\|upload\|type` | owner |
| Review & publish | `/admin/assistant/review` (`?filter=all\|todo\|flagged\|done`, `?item=`) | owner |
| Test assistant | `/admin/assistant/test` | owner |
| Unanswered questions | `/admin/assistant/unanswered` (`?tab=open\|done\|ignored`) | owner |
| Assistant settings | `/admin/assistant/settings` | owner |
| Conversations | `/admin/assistant/conversations` (`?filter=all\|down\|unknown\|handover`, `?channel=all\|web\|staff`, `?range=`, `?q=`, `?id=`) | owner |

The admin pages share the **knowledge-assistant sidebar**. It is the byteleaf admin sidebar with:
- a workspace switcher card (Khumalo Home Solar, "Demo client · switch")
- badges on Review (items waiting) and Unanswered (open count)
- a "byteleaf admin" back link

The staff assistant has **its own layout**: an ink top bar, history, chat and source viewer. It does not use the admin sidebar.

---

## 2. Answers to the brief's open questions

1. **Launcher on phones.** Keep the round launcher bottom-right at 16px, plus the safe-area inset. When open, the panel goes full screen (`inset: 0`, `100dvh`) and the floating close button is hidden; the panel header has its own close. Lock body scroll while it's open.
2. **How sources appear.** Quiet chips under the answer (`Services and packages`). Tapping a chip expands the exact passage used, inline. Several sources show several chips. No sources means no chips, and the answer is phrased as "I don't know" with **Ask the team**.
3. **How "AI cleaned" is shown.**
   - Everything the AI rewrote gets a purple **AI CLEANED** badge and a purple border, always side by side with the **Original** in mono.
   - Anything the AI wasn't sure about is highlighted (`mark.unsure`, amber with a dotted underline) and explained in an **AI UNSURE** note.
   - Nothing goes live until the owner approves, edits or rejects it.
   - Text the owner types themselves (Unanswered → Add answer) skips AI cleaning and is marked as theirs.
4. **Staff mode.** It is the same engine shown in a different frame, not a separate product:
   - ink theme with square avatars
   - a sign-in gate (magic link to a work email)
   - staff-only sources marked with a lock
   - a source viewer that highlights the passage used

   Customers never see staff-only sources, and refused topics still apply to them.
5. **Demo page layout.**
   - Chat on the left, "What this assistant knows" on the right, then "How it works" in 3 steps and a CTA band.
   - A Customer/Staff toggle sits above the chat.
   - A separate full-page prototype shows the floating widget on a sample client site.

---

## 3. Widget theming

The widget root sets 8 custom properties. **These are the only values a client changes**, together with name, logo/avatar and greeting. The reference code uses short names; use the canonical names in production:

| Canonical | Reference | Use |
|---|---|---|
| `--cb-accent` | `--a` | launcher, header, user bubbles, send, primary buttons |
| `--cb-on-accent` | `--ai` | text and icons on accent |
| `--cb-accent-soft` | `--as` | chip hover, focus ring halo |
| `--cb-surface` | `--surf` | panel background |
| `--cb-text` | `--tx` | body text |
| `--cb-muted` | `--mu` | secondary text, icons |
| `--cb-border` | `--bd` | borders, dividers |
| `--cb-bubble` | `--bot` | assistant bubble |

| Theme | accent | on-accent | accent-soft | surface | text | muted | border | bubble |
|---|---|---|---|---|---|---|---|---|
| byteleaf | #166FE5 | #FFFFFF | #EEF4FE | #FFFFFF | #0B1220 | #4B5872 | #E3E9F2 | #F2F5F9 |
| Warm ("Sunbird Bakery") | #B4471A | #FFFFFF | #FBEDE6 | #FFFCF8 | #2A1A12 | #6B5446 | #EADCD2 | #F6EEE7 |
| Dark ("Ironclad Gym") | #3DDC97 | #06231A | #12352A | #12161C | #F2F4F7 | #A3ADBD | #262D38 | #1B212A |

All three pass WCAG AA; the themes board computes this live. When the owner picks a colour in **Settings**:
- Settings computes contrast against white.
- If white text on the colour is below 4.5:1, the widget switches on-accent to `#0B1220` and uses dark text for links.
- If neither white nor dark text passes, it shows an error and saving is blocked.
- An invalid hex keeps the last valid colour in the preview.

Embed: one `<script>` tag that mounts into a shadow root, so client CSS can't leak in. Put the theme in a `data-theme` JSON attribute or fetch it from the API.

---

## 4. Components

**New:**
- `ChatLauncher`: closed / nudge with a badge / open (close icon), 60px round
- `ChatPanel`: 400 × min(660px, 100vh − 124px), radius 20; full screen ≤600px
- `ChatHeader`: avatar, name, "AI" pill, subtitle, Talk-to-a-person button, close
- `MessageBubble`: user / assistant / typing dots / streaming caret
- `SourceChips`: collapsed / expanded passage
- `Feedback`: up / down → reason chips (Wrong answer, Not clear, Not what I asked, Something else) → "Thanks"
- `UnknownAnswer`: includes "Ask the team"
- `OffTopicAnswer`: includes topic chips
- `ErrorBubble` (network, retry) and `RateLimitNotice` (input disabled, countdown)
- `HandoverForm`: separate sheet with name and phone/email, consent checkbox, privacy link, sent state
- `SuggestionChips`
- `KnowledgePanel` (demo page): with USED and STAFF pills, and the "It won't answer" list
- `ModeToggle` (Customer/Staff), `ThemePreview`, `ContrastBadge`
- `SourceRow`: type icon, status pill, item count, updated date, actions, problem rows (conflict, failed, nothing found)
- `AddSourceRoutes`: website / upload / type, with staged progress (fetch → read → AI clean → ready)
- `ReviewList`, `ReviewItem` (Original vs Cleaned), `ConflictPicker`, `UnsureNote`, `PublishModal`
- `TestChat`, `WhyPanel` (confidence meter, sources read with LIVE / UNPUBLISHED / STAFF ONLY / NOT LIVE pills, fix link), `DraftSwitch`
- `StaffGate`, `StaffHistory`, `SourceViewer` (highlighted passage)
- `UnansweredRow` (variants "Also asked as", inline answer form, "Ask it again" panel)
- `SettingsForm` sections plus `LivePreview`
- `ConversationList` (search, filter chips, outcome pills), `Transcript` (source chips, redaction tokens, inline flags with fix links), `DeleteConfirm` alertdialog, stat tiles

**Reused from the admin handoff:** sidebar shell, buttons (`btn-primary/ghost/danger/ok`, sizes), fields, pills, tabs, switch, modal and scrim, toast, empty states, progress bar.

---

## 5. Behaviour

**Answering**
- Typing dots show for at least 600ms, then the answer streams in.
- When the model answers from a source, attach source ids. Chips show their names.
- If there is no source above the confidence threshold, return the "I don't know" pattern instead of guessing.
- Off-topic questions and refused topics get a polite steer, with no sources looked up.
- On a conflict between live sources, the assistant **refuses to quote either value** until the owner resolves it.

**Privacy**
- The chat never asks for personal details.
- If a message contains a phone number or email, reply with the handover form instead.
- Show "AI assistant · Privacy" under the input, always.

**Accessibility**
- The log is `aria-live="polite"`.
- On open, focus goes to the input. **Escape** closes and returns focus to the launcher.
- Feedback buttons are `aria-pressed`.
- The handover is a labelled dialog.
- `prefers-reduced-motion`: no streaming (the full answer appears at once), no animations.

**Rate limit**
- After 20 messages in 10 minutes, disable the input and show a countdown.

**Review & publish**
- Approve moves to the next pending item.
- Edit swaps in a textarea and changes the button to "Save and approve"; the item is then marked "edited by you".
- Leaving an unsaved edit asks: Discard edit / Approve and continue.
- On a conflict, Approve stays disabled until a price is picked.
- Publishing makes only approved items live. Pending items stay hidden.

**Test**
- The Draft switch answers from live + approved-but-unpublished items.
- Test chats are not logged or counted.

**Unanswered**
- Similar questions are grouped by embedding similarity.
- Publishing an answer moves the row to Answered, and "Ask it again" runs the live assistant.

**Conversations**
- The list shows the first question, time, visitor label (anonymous "Visitor 9B71", or the staff member's name), message count and outcome pills.
- Before a message is saved, phone numbers, emails and ID numbers are replaced with tokens such as `[phone removed]`, shown as small dark chips. Do the redaction on the server, before storage.
- Inline flags under answers link to the fix:
  - Didn't know → Unanswered
  - Not helpful → Review
  - Handed over → Messages
  - Refused → Settings
- Delete asks for confirmation (Escape closes the dialog), removes the conversation immediately and shows a toast.
- Retention follows the "Keep chats for" setting; the footer shows each conversation's deletion date.
- No results shows "No conversations match" with a Clear filters button.

**Settings**
- Leaving with unsaved changes asks for confirmation (same dialog as Add source).

---

## 6. Motion (vanilla CSS)

| What | Duration / easing |
|---|---|
| Panel open | `cbIn` .28s `cubic-bezier(.2,.8,.2,1)`: translateY(12px) scale(.96) → none |
| New message | `msgIn` .25s ease-out: translateY(6px) → none |
| Typing dots | 1.2s loop, 0.15s stagger, 3px lift |
| Streaming | +3 characters every 24ms after 900ms of typing; caret blinks 1s steps(1) |
| Nudge bubble | `cbIn` .4s, same easing, .6s delay after page load |
| Launcher hover | scale 1.07, .25s `cubic-bezier(.2,.8,.2,1)` |
| Admin panels | `slide` .35s / `rise` .6s, same easing; modal `pop` .3s; progress bar stripes 1s linear |
| Switch knob, meters | .2s / .4s |

Every animation is removed under `prefers-reduced-motion: reduce`.

---

## 7. State captures (`screenshots/state-*.png`)

| Area | Captures |
|---|---|
| Widget | `widget-launcher-nudge`, `widget-theme-warm`, `widget-theme-dark`, `widget-answer`, `widget-feedback-reason`, `widget-handover` (the other states are on `chatbot-widget-states.png`) |
| Demo page | `demo-staff-mode` |
| Sources | `sources-empty`, `add-source-unreachable`, `add-source-nothing-found` |
| Review | `review-conflict-picked`, `review-editing`, `review-publish-confirm`, `review-published` |
| Test | `test-with-unpublished`, `test-refused` |
| Staff | `staff-gate`, `staff-gate-error`, `staff-gate-sent` |
| Unanswered | `unanswered-ask-again`, `unanswered-ignored` |
| Settings | `settings-unsaved`, `settings-saved`, `settings-bad-colour` |
| Conversations | `conversations-didnt-know`, `conversations-staff`, `conversations-no-results`, `conversations-delete-confirm`, `conversations-deleted` |

---

## 8. Definition of done

- [ ] Pixel parity with `reference/chatbot-*.html` at 1440 / 768 / 390, and the widget usable at 320 with nothing cut off.
- [ ] All three themes pass AA; the settings contrast check behaves as described in §3.
- [ ] The widget works with keyboard only; Escape closes it; the screen reader announces new answers.
- [ ] No personal data is collected in the chat; handover only goes through the form.
- [ ] Nothing from review goes live without approval; staff-only sources never reach customers.
- [ ] Reduced motion is respected everywhere.
