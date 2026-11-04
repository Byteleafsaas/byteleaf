import 'server-only';
import { bookingPrompt, readInterpretation, type Interpreter } from '@/lib/whatsapp/understand';
import { askBookingModel, llmEnabled } from '../assistant/llm';
import type { Data } from './calendar';

/** The interpreter the conversation uses: DeepSeek reads the text, and anything unusable becomes null. */
export function makeInterpreter(d: Data, todayKey: string): Interpreter {
  return async (text) => {
    if (!llmEnabled()) return null;
    const known = { services: d.services.map((s) => ({ id: String(s.id), name: s.name })), staff: d.staff.map((s) => s.name), today: todayKey };
    const { system, user } = bookingPrompt(text.slice(0, 300), known);
    try {
      return readInterpretation(await askBookingModel(system, user), known);
    } catch (e) {
      console.error('[whatsapp] interpreter failed:', (e as Error).message);
      return null;
    }
  };
}
