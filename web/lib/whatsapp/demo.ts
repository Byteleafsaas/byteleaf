// The number shown on the public demo page. For now it is Meta's free test number, which can only message people the
// owner has added as testers; replace both lines when a real WhatsApp Business number is connected.
export const DEMO_NUMBER = '+1 555 178 9316';
const DIGITS = DEMO_NUMBER.replace(/\D/g, '');

/** A link that opens a chat with the demo number in WhatsApp, with "Hi" ready to send. Also what the QR code holds. */
export const DEMO_LINK = `https://wa.me/${DIGITS}?text=${encodeURIComponent('Hi')}`;
