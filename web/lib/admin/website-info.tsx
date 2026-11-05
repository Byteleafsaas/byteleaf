'use client';

import { createContext, useContext, type ReactNode } from 'react';

// What the website admin's sidebar shows: the business name, how many saved changes are waiting to be published, and how
// many enquiries are new. Filled in by the admin layout.
export type WebsiteInfoValue = { name: string; pending: number; enquiries: number };
const Ctx = createContext<WebsiteInfoValue>({ name: '', pending: 0, enquiries: 0 });

export function WebsiteInfoProvider({ info, children }: { info: WebsiteInfoValue; children: ReactNode }) {
  return <Ctx.Provider value={info}>{children}</Ctx.Provider>;
}

export const useWebsiteInfo = () => useContext(Ctx);
