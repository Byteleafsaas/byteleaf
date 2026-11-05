'use client';

import { createContext, useContext, type ReactNode } from 'react';

// Who the booking admin is for: the business card, brand and WhatsApp number status in its sidebar. Filled in by the admin layout.
export type BookingInfoValue = { name: string; sub: string; mark: string; brand: string; numberOk: boolean; numberText: string };
const Ctx = createContext<BookingInfoValue>({ name: '', sub: '', mark: 'B', brand: 'byteleaf', numberOk: true, numberText: '' });

export function BookingInfoProvider({ info, children }: { info: BookingInfoValue; children: ReactNode }) {
  return <Ctx.Provider value={info}>{children}</Ctx.Provider>;
}

export const useBookingInfo = () => useContext(Ctx);
