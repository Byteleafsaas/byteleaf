import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('../db', () => ({ connectDB: async () => {} }));
const distinct = vi.fn();
const deleteMany = vi.fn();
const find = vi.fn();
vi.mock('../models', () => ({
  WaSlotLock: { distinct: (...a: unknown[]) => distinct(...a), deleteMany: (...a: unknown[]) => deleteMany(...a) },
  WaAppointment: { find: (...a: unknown[]) => ({ lean: async () => find(...a) }) },
  WaBusiness: {}, WaService: {}, WaStaff: {},
}));

import { releaseOrphanLocks } from './calendar';

const NOW = new Date('2026-11-06T09:00:00Z');

describe('releaseOrphanLocks', () => {
  beforeEach(() => { distinct.mockReset(); deleteMany.mockReset(); find.mockReset(); });

  it('only looks at future locks older than ten minutes', async () => {
    distinct.mockResolvedValue([]);
    await releaseOrphanLocks(NOW);
    const q = distinct.mock.calls[0][1] as { grain: { $gte: Date }; _id: { $lt: { getTimestamp(): Date } } };
    expect(q.grain.$gte).toEqual(NOW);
    expect(q._id.$lt.getTimestamp().getTime()).toBe(Math.floor((NOW.getTime() - 600000) / 1000) * 1000);
  });

  it('deletes the locks of bookings that do not exist or are cancelled, and keeps the rest', async () => {
    distinct.mockResolvedValue(['live', 'dead']);
    find.mockResolvedValue([{ _id: 'live' }]);
    deleteMany.mockResolvedValue({ deletedCount: 3 });
    expect(await releaseOrphanLocks(NOW)).toBe(3);
    expect(deleteMany).toHaveBeenCalledWith({ apptId: { $in: ['dead'] } });
  });

  it('deletes nothing when every lock has a live booking', async () => {
    distinct.mockResolvedValue(['live']);
    find.mockResolvedValue([{ _id: 'live' }]);
    expect(await releaseOrphanLocks(NOW)).toBe(0);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
