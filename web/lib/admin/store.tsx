'use client';

// Client-side admin store. It is hydrated from the database by the server layout; views update it optimistically
// and persist through Server Actions, then call refresh() so the server's truth replaces any optimistic state.

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { AvailabilityMap } from '../availability';
import type { BillingDocument, Client } from './billing-types';
import type { Booking, Message, Project, Settings } from './types';

type Toast = { id: number; text: string; undo?: () => void };

export type AdminInitial = { bookings: Booking[]; messages: Message[]; projects: Project[]; settings: Settings; documents: BillingDocument[]; clients: Client[]; availability: AvailabilityMap };

type Store = {
  bookings: Booking[];
  setBookings: Dispatch<SetStateAction<Booking[]>>;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  documents: BillingDocument[];
  setDocuments: Dispatch<SetStateAction<BillingDocument[]>>;
  clients: Client[];
  setClients: Dispatch<SetStateAction<Client[]>>;
  availability: AvailabilityMap;
  user: { name: string; email: string };
  /** Re-fetch server data (after a mutation) so the store matches the database. */
  refresh: () => void;
  toast: Toast | null;
  notify: (text: string, undo?: () => void) => void;
  dismissToast: () => void;
};

const Ctx = createContext<Store | null>(null);

export function AdminStoreProvider({ initial, user, children }: { initial: AdminInitial; user: { name: string; email: string }; children: ReactNode }) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initial.bookings);
  const [messages, setMessages] = useState(initial.messages);
  const [projects, setProjects] = useState(initial.projects);
  const [settings, setSettings] = useState(initial.settings);
  const [documents, setDocuments] = useState(initial.documents);
  const [clients, setClients] = useState(initial.clients);
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  // A server refresh delivers a new `initial`: adopt it.
  useEffect(() => {
    setBookings(initial.bookings);
    setMessages(initial.messages);
    setProjects(initial.projects);
    setSettings(initial.settings);
    setDocuments(initial.documents);
    setClients(initial.clients);
  }, [initial]);

  const refresh = useCallback(() => router.refresh(), [router]);

  const dismissToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const notify = useCallback((text: string, undo?: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: ++seq.current, text, undo });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const value = useMemo<Store>(
    () => ({ bookings, setBookings, messages, setMessages, projects, setProjects, settings, setSettings, documents, setDocuments, clients, setClients, availability: initial.availability, user, refresh, toast, notify, dismissToast }),
    [bookings, messages, projects, settings, documents, clients, initial.availability, user, refresh, toast, notify, dismissToast],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdmin must be used inside <AdminStoreProvider>');
  return v;
}
