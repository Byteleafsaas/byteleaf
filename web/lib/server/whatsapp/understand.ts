import 'server-only';
import { bookingPrompt, readInterpretation, type Interpreter } from '@/lib/whatsapp/understand';
import { rateLimit } from '../auth';
import { env } from '../env';
import { askBookingModel, llmEnabled } from '../assistant/llm';
import type { Data } from './calendar';

/** The interpreter the conversation uses: DeepSeek reads the text, and anything unusable becomes null. */
export function makeInterpreter(d: Data, todayKey: string, phone = ''): Interpreter {
  return async (text) => {
    if (!llmEnabled()) return null;
    const known = { services: d.services.map((s) => ({ id: String(s.id), name: s.name })), staff: d.staff.map((s) => s.name), today: todayKey };
    // The model costs money: a short limit per customer, and a daily ceiling per business, as the chatbot has.
    if (phone && !(await rateLimit(`wa-ai:${d.biz.slug}:${phone}`, 15, 10 * 60000))) return null;
    if (!(await rateLimit(`wa-ai-day:${d.biz.slug}`, env.ASSISTANT_DAILY_LIMIT, 24 * 3600000))) return null;
    const { system, user } = bookingPrompt(text.slice(0, 300), known);
    try {
      return readInterpretation(await askBookingModel(system, user), known);
    } catch (e) {
      console.error('[whatsapp] interpreter failed:', (e as Error).message);
      return null;
    }
  };
}
