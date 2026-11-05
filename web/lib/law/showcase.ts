// What the drawn mini pages on the law-firm showcase page show (HANDOFF-LAW §5). Simplified drawings, not the real pages.
const AREAS = [
  { t: 'Family law and divorce', d: 'Divorce, maintenance, parenting plans.' },
  { t: 'Wills and estates', d: 'A will, or an estate after a death.' },
  { t: 'Property and conveyancing', d: 'Buying, selling and transfers.' },
  { t: 'Employment and labour', d: 'Dismissals, retrenchment, the CCMA.' },
  { t: 'Commercial contracts', d: 'Contracts for small businesses.' },
  { t: 'Debt and disputes', d: 'Collecting, or answering a claim.' },
];
const people = [
  { n: 'Naledi Ndaba', ini: 'NN', r: 'Founding partner', bg: '#E9C9B9' },
  { n: 'David Ravell', ini: 'DR', r: 'Partner', bg: '#D8D2C2' },
  { n: 'Ayanda Khumalo', ini: 'AK', r: 'Associate', bg: '#CFD8CC' },
  { n: 'Priya Govender', ini: 'PG', r: 'Associate', bg: '#E6D7B8' },
  { n: 'Sipho Mahlangu', ini: 'SM', r: 'Candidate attorney', bg: '#D5CFDE' },
];
const steps = [
  { n: '1', t: 'First consultation', d: 'We listen and explain your options in plain words.' },
  { n: '2', t: 'Settlement agreement', d: 'Who keeps what, and how the children will be cared for.' },
  { n: '3', t: 'Summons issued and served', d: 'Delivered by the sheriff (the court official who delivers legal papers).' },
  { n: '4', t: 'Decree of divorce', d: 'The court order that ends the marriage.' },
];

export const SC = {
  order: ['home', 'areas', 'area', 'team', 'fees', 'insights', 'contact'] as const,
  pages: {
    home: { l: 'Home', path: '/', eyebrow: 'Independent attorneys in Rosebank', title: 'Plain advice, from people who pick up the phone.', lead: 'Five attorneys helping families, homeowners, employees and small businesses. You speak to an attorney from the first call.', size: '34px', psize: '26px', nav: '', b: 'cards' },
    areas: { l: 'Practice areas', path: '/practice-areas', eyebrow: 'Practice areas', title: 'Six areas, one way of working.', lead: 'What we help with, how it usually goes, what to bring and what it typically costs.', size: '30px', psize: '24px', nav: 'Practice areas', b: 'cards' },
    area: { l: 'Family law', path: '/practice-areas/family-law', eyebrow: 'Practice areas / Family law', title: 'Family law and divorce', lead: 'Divorce, maintenance and arrangements for your children. Agree where you can, go to court only when you must.', size: '30px', psize: '24px', nav: 'Practice areas', b: 'steps' },
    team: { l: 'Attorneys', path: '/attorneys', eyebrow: 'Our attorneys', title: 'Five people. You’ll know who is handling your matter.', lead: 'One attorney responsible from start to finish, with a direct number.', size: '28px', psize: '22px', nav: 'Attorneys', b: 'people' },
    fees: { l: 'Fees', path: '/fees', eyebrow: 'Fees and how it works', title: 'You’ll know what it costs before we start.', lead: 'How we charge, what a first meeting involves, and what happens after it.', size: '30px', psize: '24px', nav: 'Fees', b: 'fees' },
    insights: { l: 'Insights', path: '/insights/dying-without-a-will', eyebrow: 'Insights / Wills and estates', title: 'What happens when someone dies without a will', lead: 'Who inherits, who sorts out the estate, and what the family needs to do first.', size: '28px', psize: '22px', nav: 'Insights', b: 'prose' },
    contact: { l: 'Contact', path: '/contact', eyebrow: 'Contact and consultation', title: 'Tell us briefly what’s happening.', lead: 'An attorney reads every request and replies within [reply time] on working days.', size: '28px', psize: '24px', nav: 'Contact', b: 'form' },
  },
  callouts: [
    { n: '1', t: 'The first step is always in reach', d: '“Request a consultation” sits in the header on wide screens and in a bar at the bottom on phones, on every page.', page: 'home' as const },
    { n: '2', t: 'Fees, explained before anyone asks', d: 'How the firm charges, what a first meeting costs and what happens next. This page does most of the trust work.', page: 'fees' as const },
    { n: '3', t: 'Built for long reading', d: 'Guides in a 65-character column, at 19px, with plain-language terms, tables and a clear “not legal advice” note.', page: 'insights' as const },
  ],
  cards: AREAS,
  people,
  steps,
  charge: [{ k: 'To start', t: 'First consultation', p: 'R [amount]' }, { k: 'Most matters', t: 'Hourly', p: 'R [range]' }, { k: 'Predictable work', t: 'Fixed fees', p: 'From R [amount]' }, { k: 'Some claims', t: 'Contingency', p: 'In writing' }],
  rates: [
    { a: 'WHO OR WHAT', b: 'HOW IT’S CHARGED', c: 'RATE', st: 'background: #ECE5DA; border-top: 0; font-weight: 600' },
    { a: 'Partner', b: 'Hourly', c: 'R [range]', st: '' },
    { a: 'Simple will', b: 'Fixed fee', c: 'R [amount]', st: '' },
    { a: 'CCMA, one hearing', b: 'Fixed fee', c: 'R [amount]', st: '' },
  ],
  pList: {
    home: AREAS.slice(0, 3),
    areas: AREAS.slice(0, 3),
    area: steps.slice(0, 3).map((s) => ({ t: s.n + '. ' + s.t, d: s.d })),
    team: people.slice(0, 3).map((x) => ({ t: x.n, d: x.r })),
    fees: [{ t: 'First consultation', d: '30 minutes · R [amount]' }, { t: 'Hourly, by seniority', d: 'R [range] an hour' }, { t: 'Fixed fees', d: 'Wills, transfers, CCMA · from R [amount]' }],
    insights: [{ t: 'General information, not legal advice.', d: 'For your situation, request a consultation.' }, { t: 'Who inherits', d: 'A spouse, but no children: the spouse inherits everything.' }],
    contact: [{ t: 'Request a consultation', d: 'Name, phone, what it’s about, a short description, and consent.' }],
  },
  captions: {
    home: 'Home: one clear statement, the six areas as doors, and how it starts.',
    areas: 'Practice areas: each area opens a page with the same shape.',
    area: 'One practice area in full: what we help with, how it goes, what to bring, costs.',
    team: 'Attorneys: people with roles, languages and admission year, or marked placeholders.',
    fees: 'Fees: consultation, hourly, fixed and contingency fees, with amounts in [brackets] until the firm confirms them.',
    insights: 'A guide: plain language, dated, with the author and a not-legal-advice note.',
    contact: 'Contact: the urgent note comes first, then the form, phone, WhatsApp and a drawn map.',
  },
  included: [
    'Seven pages written with you: home, practice areas, one page per area, your team, fees, guides and contact',
    'An identity of your own: a mark, colours and type chosen for reading',
    'The trust work built in: fee explanations, “not legal advice” notes, privacy wording and an urgent-matters note',
    'A consultation request form with a privacy note and consent, sent to your inbox',
    'Fast on a phone, readable without zooming, and checked for keyboard use and contrast',
    'Your web address, secure hosting and renewals looked after',
  ],
  how: [
    { n: '01', t: 'We write it with you', d: 'One conversation about your practice, your clients and how you charge. We draft every page in plain language for you to check.' },
    { n: '02', t: 'You see a working first version', d: 'A real site on a private link, on your phone and computer, with your fees, people and wording. Change anything.' },
    { n: '03', t: 'We launch and look after it', d: 'Your web address, hosting and renewals. Add an admin, booking or more languages later without starting again.' },
  ],
};
