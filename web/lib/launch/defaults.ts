// The starting content for the sample business, Tsela Mobile Wash (made up). From `launch/copy.json` in the handoff.
// Anything in [square brackets] is a placeholder the owner fills in later, and is kept exactly as written.
import type { Block, Photo, Service, Settings, SiteState, Snapshot } from './types';

export const SITE_SLUG = 'tsela';

export const defaultSettings = (): Settings => ({
  name: 'Tsela Mobile Wash',
  description: 'Mobile car wash in Pretoria. We come to you.',
  phone: '[phone number]',
  whatsapp: '',
  whatsappSame: true,
  email: '[email address]',
  areas: ['Centurion', 'Hatfield', 'Brooklyn', 'Menlyn', 'Waterkloof'],
  hours: { weekdays: '07:00–17:00', saturday: '07:00–17:00', sunday: 'Closed' },
  instagram: '',
  facebook: '',
});

export const defaultServices = (): Service[] => [
  { id: 'sv1', name: 'Express wash', price: 120, time: '45 minutes', summary: 'Outside wash, wheels and windows.', included: ['Hand wash and dry, outside', 'Wheels and tyres', 'Windows inside and out'], visible: true },
  { id: 'sv2', name: 'Full wash and vacuum', price: 250, time: '1 hour 30 minutes', summary: 'Everything in the express, plus a full vacuum and wipe-down.', included: ['Everything in the Express wash', 'Vacuum seats, carpets and boot', 'Dashboard and doors wiped'], visible: true },
  { id: 'sv3', name: 'Interior deep clean', price: 480, time: '2 hours', summary: 'Seats shampooed, stains lifted, smells gone.', included: ['Seats and carpets shampooed', 'Stain treatment', 'Vents, seams and cup holders detailed'], visible: true },
  { id: 'sv4', name: 'Polish and wax', price: 650, time: '3 hours', summary: 'A deep shine that keeps rain and dust off for weeks.', included: ['Full wash and clay treatment', 'Machine polish', 'Hand wax for protection'], visible: true },
];

const CAPTIONS = ['Hatchback · Full wash and vacuum', 'Bakkie · Express wash', 'SUV · Interior deep clean', 'Sedan · Polish and wax', 'Family car · Full wash and vacuum', 'Hatchback · Interior deep clean'];
export const defaultPhotos = (): Photo[] => [
  { id: 'p1', kind: 'sample', alt: 'A freshly washed car in a driveway', w: 2400, on: { home: true, about: false, gallery: false }, caption: 'A freshly washed car in a driveway' },
  ...CAPTIONS.map((c, i): Photo => ({ id: `p${i + 2}`, kind: 'sample', alt: c, w: 1800, on: { home: false, about: false, gallery: true }, caption: c })),
];

export const defaultPages = (): Snapshot['pages'] => ({
  home: [
    { id: 'h1', type: 'heading', label: 'Headline', value: 'A spotless car, washed in your driveway.', max: 60, help: 'The first thing people read. One promise, in plain words.' },
    { id: 'h2', type: 'text', label: 'Intro', value: 'We come to your home or office, bring our own water and power, and leave your car cleaner than the day you bought it.', max: 220, help: 'Two sentences at most.' },
    { id: 'h3', type: 'button', label: 'Main button', value: 'Book a wash', target: 'contact', max: 24, help: 'Say what happens: “Book a wash”, not “Click here”.' },
    { id: 'h4', type: 'image', label: 'Main photo', value: 'p1', help: 'Landscape photos look best. With no photo, the site shows your prices here instead.' },
    { id: 'h5', type: 'section', label: 'How it works', on: true, desc: 'Three steps: book, we arrive, pay when happy.' },
    { id: 'h6', type: 'link', label: 'Washes and prices', desc: 'Comes from Services & prices, so it’s always up to date.', to: 'services', toLabel: 'Edit prices' },
    { id: 'h7', type: 'list', label: 'Areas served', maxItems: 10, itemMax: 28, itemName: 'area', help: 'Also used on the Contact page and in the booking form.' },
    { id: 'h8', type: 'section', label: 'Customer reviews', on: true, desc: 'Shows three reviews. Each one is labelled “Sample review” until you add real ones.' },
    { id: 'h9', type: 'section', label: 'Questions', on: true, desc: 'Four common questions with short answers.' },
  ] satisfies Block[],
  services: [
    { id: 's1', type: 'heading', label: 'Page heading', value: 'Pick a wash. We bring the rest.', max: 60, help: '' },
    { id: 's2', type: 'text', label: 'Intro', value: 'Prices are per car and include travel within our areas. Bakkies and 7-seaters add R 40.', max: 220, help: '' },
    { id: 's3', type: 'link', label: 'Washes, prices and add-ons', desc: 'Edited in Services & prices.', to: 'services', toLabel: 'Edit prices' },
  ],
  about: [
    { id: 'a1', type: 'heading', label: 'Page heading', value: 'Started by one person who hated queuing at the car wash.', max: 60, help: '' },
    { id: 'a2', type: 'text', label: 'Your story', value: '[Owner name] started Tsela Mobile Wash after [a plain reason]. [Two sentences about doing it carefully and on time.]', max: 400, help: 'Write it like you’d tell a neighbour. People trust a real person.' },
    { id: 'a3', type: 'image', label: 'Your photo', value: '', help: 'A friendly photo of you helps more than any logo. Until then, your name is shown in large type.' },
  ],
  gallery: [
    { id: 'g1', type: 'heading', label: 'Page heading', value: 'Before and after', max: 60, help: '' },
    { id: 'g2', type: 'text', label: 'Intro', value: 'A few of the washes we do, drawn for this demo. Tap a picture to see it bigger.', max: 220, help: '' },
    { id: 'g3', type: 'link', label: 'Gallery photos', desc: 'Your before-and-after photos, from Photos.', to: 'photos', toLabel: 'Manage photos' },
  ],
  contact: [
    { id: 'c1', type: 'heading', label: 'Page heading', value: 'Tell us where the car is.', max: 60, help: '' },
    { id: 'c2', type: 'text', label: 'Intro', value: 'Send the form and we’ll confirm a time. Quicker on WhatsApp.', max: 220, help: '' },
    { id: 'c3', type: 'text', label: 'After someone sends the form', value: 'We’ll message you within [reply time] to confirm a time.', max: 160, help: 'Tell people what happens next and when.' },
    { id: 'c4', type: 'link', label: 'Phone, WhatsApp, hours and areas', desc: 'From Site settings, so they match everywhere.', to: 'settings', toLabel: 'Edit details' },
  ],
});

export const defaultSnapshot = (): Snapshot => ({ pages: defaultPages(), services: defaultServices(), photos: defaultPhotos(), settings: defaultSettings() });

/** A brand-new site: everything published, nothing waiting. */
export const defaultState = (now = new Date()): SiteState => ({ live: defaultSnapshot(), saved: defaultSnapshot(), liveVersion: 1, liveAt: now.toISOString(), previous: null });
