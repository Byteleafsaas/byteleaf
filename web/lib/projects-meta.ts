// The five showcase projects, named once. Each name says what was built and for whom, so a card, a page title and a
// breadcrumb all refer to the same thing. The slug (and so the project's address) never changes.
export type ShowcaseMeta = {
  n: number;
  slug: string;
  name: string;
  /** Short label used after the number in each page's eyebrow. */
  kind: string;
  /** The made-up business the demo is built around. */
  sample: string;
  demoUrl: string;
};

export const SHOWCASE: Record<'chatbot' | 'whatsapp' | 'launch' | 'admin' | 'law', ShowcaseMeta> = {
  chatbot: { n: 1, slug: 'business-knowledge-chatbot', name: 'Khumalo Home Solar knowledge chatbot', kind: 'AI chatbot', sample: 'Khumalo Home Solar', demoUrl: '/projects/knowledge-chatbot' },
  whatsapp: { n: 2, slug: 'whatsapp-booking-assistant', name: 'Lerato’s Braids & Beauty booking assistant', kind: 'WhatsApp bookings', sample: 'Lerato’s Braids & Beauty', demoUrl: '/projects/whatsapp-booking' },
  launch: { n: 3, slug: 'launch-website-with-admin', name: 'Tsela Mobile Wash website and admin', kind: 'Website and admin', sample: 'Tsela Mobile Wash', demoUrl: '/projects/launch-website' },
  admin: { n: 4, slug: 'business-admin-system', name: 'byteleaf business admin system', kind: 'Business admin', sample: 'byteleaf', demoUrl: '' },
  law: { n: 5, slug: 'law-firm-website', name: 'Ravell Ndaba Attorneys website', kind: 'Website', sample: 'Ravell Ndaba Attorneys', demoUrl: '/projects/law-firm' },
};

/** The eyebrow above a showcase page's heading: its type in capitals, like the other project pages ("AI CHATBOT"). */
export const eyebrowFor = (m: ShowcaseMeta) => m.kind.toUpperCase();

// Two stand-alone products that run on their own addresses. They are separate from the five showcase demos.
export const STANDALONE = {
  yenza: { slug: 'yenza-icv', name: 'Yenza’iCV CV builder', demoUrl: 'https://yenzaicv.online' },
  enrollsync: { slug: 'enrollsync', name: 'EnrollSync school management platform', demoUrl: 'https://enrollsync.cloudverse.co.za' },
} as const;
