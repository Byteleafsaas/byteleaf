// Admin data shapes. Money is integer cents (ZAR). Dates are 'YYYY-MM-DD' in SAST; times 'HH:mm' SAST.
// These mirror the suggested data model in HANDOFF-ADMIN §7 so the backend can swap in later.

export type BookingStatus = 'pending' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled';
export type MeetingTypeKey = 'discovery' | 'deep-dive' | 'in-person';

export type BookingEvent = { text: string; when: string };

export type Booking = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  meetingType: MeetingTypeKey;
  typeLabel: string;
  where: string;
  durationMin: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: BookingStatus;
  note: string;
  history: BookingEvent[];
};

export type Message = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  when: string; // relative label for display
  received: string;
  needs: string[];
  model: string;
  start: string;
  message: string;
  read: boolean;
  archived: boolean;
};

/** A stored image (key in object storage). Served from /media/<key>. */
export type ImageRef = { key: string; width: number; height: number; alt?: string };

export type ProjectCategory = 'Design' | 'Frontend' | 'Backend' | 'AI';

export type Project = {
  id: string;
  slug: string;
  name: string;
  client: string;
  type: string;
  industry: string;
  categories: ProjectCategory[];
  stack: string[];
  summary: string; // max 140
  challenge: string;
  whatWeDid: string;
  result: string;
  live: boolean;
  featured: boolean; // at most one true
  demoUrl: string; // optional: a page to try or see the project
  updated: string; // display label
  pattern: 0 | 1 | 2; // placeholder cover pattern until an image is uploaded
  cover: ImageRef | null;
  gallery: ImageRef[];
};

export type PriceEntry = { text: string; unit: string };
export type MeetingSetting = { key: MeetingTypeKey; name: string; where: string; enabled: boolean; minutes: number };

// Single-row site settings (HANDOFF-ADMIN §7). Public pages read from this once the backend is wired.
export type Settings = {
  business: { publicEmail: string; phone: string; location: string; hours: string; replyWithin: string; urgentResponse: string; notifyEmail: string };
  prices: { care: PriceEntry; build: PriceEntry; fix: PriceEntry; team: PriceEntry; includedHours: string };
  availability: {
    workingDays: number[]; // 1 = Mon … 7 = Sun
    startTimes: string[]; // HH:mm
    meetingTypes: MeetingSetting[];
    minNotice: string;
    bufferMin: string;
    maxPerDay: number;
    blocked: { from: string; to: string }[]; // YYYY-MM-DD
  };
  invoicing: {
    legalName: string; regNo: string; address: string; vatRegistered: boolean; vatNumber: string;
    bank: { name: string; accountName: string; accountNo: string; branchCode: string };
    nextQuoteNo: string; nextInvoiceNo: string; defaultTermsDays: string; quoteValidDays: string; defaultDepositPct: string; defaultInvoiceNotes: string;
  };
  account: { name: string; email: string; twoStep: boolean };
};
