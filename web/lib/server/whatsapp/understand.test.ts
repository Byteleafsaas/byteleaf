import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const rateLimit = vi.fn();
const askBookingModel = vi.fn();
vi.mock('../auth', () => ({ rateLimit: (...a: unknown[]) => rateLimit(...a) }));
vi.mock('../assistant/llm', () => ({ llmEnabled: () => true, askBookingModel: (...a: unknown[]) => askBookingModel(...a) }));
vi.mock('../env', () => ({ env: { ASSISTANT_DAILY_LIMIT: 100 } }));

import { makeInterpreter } from './understand';
import type { Data } from './calendar';

const d = { biz: { slug: 'lerato' }, services: [{ id: 's1', name: 'Silk press' }], staff: [] } as unknown as Data;

describe('the WhatsApp interpreter spend limits', () => {
  beforeEach(() => { rateLimit.mockReset(); askBookingModel.mockReset(); askBookingModel.mockResolvedValue({ service: 1 }); });

  it('asks the model when both limits allow it', async () => {
    rateLimit.mockResolvedValue(true);
    expect(await makeInterpreter(d, '2026-11-06', '27821234567')('silk press')).toMatchObject({ serviceId: 's1' });
    expect(rateLimit).toHaveBeenCalledWith('wa-ai:lerato:27821234567', 15, 600000);
    expect(rateLimit).toHaveBeenCalledWith('wa-ai-day:lerato', 100, 86400000);
  });

  it('does not call the model once the customer is over their limit', async () => {
    rateLimit.mockResolvedValueOnce(false);
    expect(await makeInterpreter(d, '2026-11-06', '27821234567')('silk press')).toBeNull();
    expect(askBookingModel).not.toHaveBeenCalled();
  });

  it('does not call the model once the daily ceiling is reached', async () => {
    rateLimit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await makeInterpreter(d, '2026-11-06', '27821234567')('silk press')).toBeNull();
    expect(askBookingModel).not.toHaveBeenCalled();
  });
});
