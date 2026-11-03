// Removes personal contact details from text before it is stored (HANDOFF-CHATBOT, Conversations).
// Pure and server-agnostic so it can be tested. The tokens match what the conversation log shows as dark chips.

export const TOKENS = ['[email removed]', '[phone removed]', '[ID removed]', '[number removed]'] as const;

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const SA_ID = /\b\d{13}\b/g;
// A run of digits that may be spaced or dashed like a phone number. Short runs ("R 68 500") are left alone.
const DIGIT_RUN = /\+?\(?\d[\d\s().-]{6,}\d/g;

export function redact(text: string): string {
  return text
    .replace(EMAIL, '[email removed]')
    .replace(SA_ID, '[ID removed]')
    .replace(DIGIT_RUN, (m) => {
      const digits = m.replace(/\D/g, '').length;
      if (digits < 9) return m;
      return digits > 15 ? '[number removed]' : '[phone removed]';
    });
}

export const hasContactDetails = (text: string): boolean => redact(text) !== text;
