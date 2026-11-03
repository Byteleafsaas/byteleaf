'use client';

import { createContext, useContext, type ReactNode } from 'react';

// Numbers for the badges in the knowledge assistant sidebar. They come from the server layout of /admin/assistant.
type Counts = { review: number; unanswered: number };
const Ctx = createContext<Counts>({ review: 0, unanswered: 0 });

export function AssistantCountsProvider({ counts, children }: { counts: Counts; children: ReactNode }) {
  return <Ctx.Provider value={counts}>{children}</Ctx.Provider>;
}

export const useAssistantCounts = () => useContext(Ctx);
