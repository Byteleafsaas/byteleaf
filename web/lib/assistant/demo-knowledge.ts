// Made-up knowledge for the fictional demo business Khumalo Home Solar. Every price and policy here is invented.
// Square-bracket text is a placeholder, shown as written (HANDOFF-CHATBOT).

export type DemoItem = {
  sourceName: string;
  sourceType: 'web' | 'file' | 'typed';
  title: string;
  text: string;
  link?: { label: string; href: string };
  /** Internal items: only staff mode ever shows them. */
  staffOnly?: boolean;
  /** 'live' items answer customers. 'pending' and 'approved' show up in Review & publish. */
  status?: 'live' | 'pending' | 'approved';
  /** What the owner's original looked like before AI tidied it, for the side-by-side in Review. */
  original?: string;
  asks?: string;
  where?: string;
  unsure?: string;
  unsurePhrase?: string;
  /** Title of the item this one disagrees with. */
  conflictWith?: string;
};

export const DEMO_KNOWLEDGE: DemoItem[] = [
  { sourceName: 'Services and packages', sourceType: 'web', title: 'What we install', text: 'We supply and install solar panels, hybrid inverters and lithium batteries, and retrofit batteries to existing systems.' },
  { sourceName: 'Services and packages', sourceType: 'web', title: 'What prices include', text: 'All prices include installation and a certificate of compliance.' },
  { sourceName: 'Services and packages', sourceType: 'web', title: 'Free site assessment', text: 'We offer a free site assessment anywhere we install. A technician checks your roof, your electrical board and how much power you use, then sends a written quote within 48 hours.' },
  { sourceName: 'Price list 2026.pdf', sourceType: 'file', title: 'Essential package price', text: 'Essential package: 3 kW of panels and a 5 kWh battery. R 68 500 installed.' },
  { sourceName: 'Price list 2026.pdf', sourceType: 'file', title: 'Family package price', text: 'Family package: 5 kW of panels and a 10 kWh battery. R 112 000 installed.' },
  { sourceName: 'Warranty terms.pdf', sourceType: 'file', title: 'Warranty periods', text: 'Panels carry a 25-year linear performance warranty. Inverters carry a 10-year warranty. Batteries carry a 10-year warranty. Our installation workmanship is covered for 5 years.' },
  { sourceName: 'Installation process', sourceType: 'file', title: 'How installation works', text: 'Installation happens in four steps. First we visit for a free site assessment to check your roof, your electrical board and how much power you use. Within 48 hours you get a written quote. Once you accept, we book the install. Most homes take one to two days, and you will be without power for about four hours on the final day while we connect everything. Then we commission the system and walk you through it.' },
  { sourceName: 'Finance FAQ', sourceType: 'typed', title: 'Paying monthly', text: 'You can spread the cost over 12 to 60 months through [finance partner]. Approval takes about two working days.', link: { label: 'Finance options', href: '#finance' } },
  { sourceName: 'About Khumalo Home Solar', sourceType: 'typed', title: 'Where we work', text: 'Khumalo Home Solar is based in Johannesburg and installs across Gauteng. Our service area covers Johannesburg, Pretoria and the East Rand. For areas outside Gauteng, ask the team.' },

  // Waiting for the owner in Review & publish.
  {
    sourceName: 'Price list 2026.pdf', sourceType: 'file', status: 'pending', title: 'Backup-only battery', where: 'page 2 · scanned',
    text: 'A backup-only battery (5.5 kWh lithium, no panels) costs R 39 900 installed.', original: 'BACKUP ONLY  5,5kWh lithium\nR39 9OO installed',
    asks: 'Can I just get a battery for load-shedding?', unsurePhrase: 'R 39 900',
    unsure: 'The scan reads “R39 9OO” with letters instead of zeros. I read it as R 39 900, but please check against the original price list.',
  },
  {
    sourceName: 'Finance FAQ', sourceType: 'typed', status: 'pending', title: 'Finance approval time', where: 'typed',
    text: 'Finance approval usually takes about two working days, and can take longer with some banks.', original: 'approval usually takes about 2 working days, sometimes longer with some banks',
    asks: 'How long does finance approval take?', unsurePhrase: 'about two working days',
    unsure: 'The original says “sometimes longer with some banks” without saying how much longer. Add a range if you want customers to hear one.',
  },
  {
    sourceName: 'Finance FAQ', sourceType: 'typed', status: 'pending', title: 'Winter special', where: 'typed',
    text: 'There is a winter special of 10% off all installations, ending 31 August.', original: 'WINTER SPECIAL 10% off all installs, ends 31 Aug',
    asks: 'Do you have any specials?', unsure: 'This looks out of date: the end date has passed. Rejecting it is probably right.',
  },
  {
    sourceName: 'Services and packages', sourceType: 'web', status: 'pending', title: 'Roof types we install on', where: 'web page',
    text: 'We install on tiled, IBR sheeting and concrete roofs. A flat roof needs a mounting frame, which is quoted separately.', original: 'Tile / IBR / concrete roofs OK. flat roofs need frames (quoted seperately)',
    asks: 'Can you install on a flat roof?',
  },
  {
    sourceName: 'Services and packages', sourceType: 'web', status: 'approved', title: 'Certificate of compliance', where: 'web page',
    text: 'Every installation comes with a certificate of compliance that you can give to your insurer.', original: 'Every install includes a CoC for your insurance.',
    asks: 'Do I get a certificate for my insurer?',
  },
  {
    sourceName: 'Services and packages', sourceType: 'web', status: 'approved', title: 'Quote validity', where: 'web page',
    text: 'A written quote is valid for 30 days.', original: 'Quotes valid 30 days.',
    asks: 'How long is a quote valid?',
  },
];

export type DemoSource = { name: string; type: 'web' | 'file' | 'typed'; detail: string; fileKind?: string; pages?: number; staffOnly?: boolean; updatedDaysAgo: number };

// Internal documents for staff mode. Customers never get answers from these.
const STAFF: DemoItem[] = [
  { sourceName: 'Install procedure v3.docx', sourceType: 'file', staffOnly: true, title: 'Battery commissioning checks', where: 'page 3 of 4',
    text: 'Before you commission a battery system, run the last four checks on the install checklist. Torque all DC terminals to spec and photograph them. Confirm the isolator is labelled and reachable. Set the battery SOC floor to 20% in the inverter app. Walk the customer through the app and get them to sign the handover form. If any check fails, do not energise. Call the site lead.' },
  { sourceName: 'Claims process', sourceType: 'typed', staffOnly: true, title: 'Logging a warranty claim',
    text: 'To log a warranty claim, record the serial number, the installation date and photos of the fault, then email them to the claims inbox. Panels, inverters and batteries are claimed from the manufacturer. Workmanship claims go to the site lead.' },
  { sourceName: 'Sales playbook', sourceType: 'typed', staffOnly: true, title: 'Discount limits',
    text: 'Sales staff can offer up to 5% off an installed package without approval. Anything above 5% needs the owner to approve it in writing before it goes in the quote. Never discount the battery on its own.' },
];
DEMO_KNOWLEDGE.push(...STAFF);

/** The sources behind the demo knowledge, as the owner sees them in the admin. */
export const DEMO_SOURCES: DemoSource[] = [
  { name: 'Services and packages', type: 'web', detail: 'https://khumalosolar.example/services', updatedDaysAgo: 1 },
  { name: 'Price list 2026.pdf', type: 'file', detail: 'Price list 2026.pdf', fileKind: 'PDF', pages: 2, updatedDaysAgo: 3 },
  { name: 'Warranty terms.pdf', type: 'file', detail: 'Warranty terms.pdf', fileKind: 'PDF', pages: 6, updatedDaysAgo: 6 },
  { name: 'Installation process', type: 'file', detail: 'Installation process.docx', fileKind: 'Word document', pages: 3, updatedDaysAgo: 8 },
  { name: 'Finance FAQ', type: 'typed', detail: 'Gerald', updatedDaysAgo: 4 },
  { name: 'About Khumalo Home Solar', type: 'typed', detail: 'Gerald', updatedDaysAgo: 14 },
  { name: 'Install procedure v3.docx', type: 'file', detail: 'Install procedure v3.docx', fileKind: 'Word document', pages: 9, staffOnly: true, updatedDaysAgo: 18 },
  { name: 'Claims process', type: 'typed', detail: 'Gerald', staffOnly: true, updatedDaysAgo: 16 },
  { name: 'Sales playbook', type: 'typed', detail: 'Gerald', staffOnly: true, updatedDaysAgo: 11 },
  { name: 'Old brochure 2023.pdf', type: 'file', detail: 'Old brochure 2023.pdf', fileKind: 'PDF', pages: 4, updatedDaysAgo: 20 },
  { name: 'Blog', type: 'web', detail: 'https://khumalosolar.example/blog', pages: 3, updatedDaysAgo: 22 },
];

/** Demo sources that did not work out, so the admin shows how problems look. */
export const DEMO_PROBLEMS: Record<string, { state: 'failed' | 'nothing'; problem: string }> = {
  'Old brochure 2023.pdf': { state: 'failed', problem: 'Couldn’t read this file. It is a scanned image with no text in it. Upload a text PDF, or open it and paste the text instead.' },
  Blog: { state: 'nothing', problem: 'These pages are news posts with no prices, services or policies. Try your services page instead, or add the information as text.' },
};

/** Items that used to be in the demo and must be removed when the demo data is loaded again. */
export const RETIRED_TITLES = ['Family package from the website'];
