// Adds (or updates) the starter showcase projects until real client work replaces them.
//   npm run starter-projects
// Safe to re-run: projects are matched by slug and their copy is refreshed, but `live`, `featured`
// and any images set in the admin are left alone once a project exists.
import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';
import { env } from '@/lib/server/env';
import { Project } from '@/lib/server/models';

const CONCEPT = 'Concept build';

// `live` is only used when a project is first created; flip the rest on from the admin once each demo exists.
const STARTERS = [
  {
    slug: 'business-knowledge-chatbot',
    name: 'Business knowledge chatbot',
    client: CONCEPT,
    type: 'AI chatbot',
    industry: 'Any business',
    categories: ['Design', 'Frontend', 'Backend', 'AI'],
    stack: ['Next.js', 'Node.js', 'MongoDB', 'LLM API'],
    summary: 'An assistant that answers customer or staff questions from your own services, products and policies.',
    challenge:
      "Customers ask the same questions all day: prices, opening hours, what's included, how to book. Staff lose time answering them, and the answers are scattered across a website, price lists, PDFs and chat messages.",
    whatWeDid:
      "We gather the business's information by upload, by typing it in, or by scraping the website. AI then cleans it up and organises it into a knowledge base. The assistant answers only from that knowledge base and says so when it doesn't know. It can face the public on a website or stay internal for staff, and an admin screen lets the owner review and edit what it knows.",
    result: 'Try it on the demo page, built around a made-up business. Real numbers will be added once a client is live.',
    demoUrl: '/projects/knowledge-chatbot',
    featured: true,
    live: false,
  },
  {
    slug: 'whatsapp-booking-assistant',
    name: 'WhatsApp booking assistant',
    client: CONCEPT,
    type: 'Bookings integration',
    industry: 'Salons, clinics and tutors',
    categories: ['Frontend', 'Backend', 'AI'],
    stack: ['Next.js', 'Node.js', 'MongoDB', 'WhatsApp'],
    summary: 'Clients book, change and cancel appointments on WhatsApp, and the owner sees everything in one calendar.',
    challenge: 'Bookings run on back-and-forth messages, diaries get double-booked or forgotten, and no-shows cost real money.',
    whatWeDid:
      'Clients message a WhatsApp number they already know, pick a service and a free slot, and get confirmations and reminders automatically. An admin calendar shows availability, bookings and client details, with rules for opening hours, breaks and time off. Optional AI answers common questions like prices and location.',
    result: 'Try the guided demo, built around a sample salon. Fewer no-shows and less admin time is the goal, and real figures will come from a live client.',
    demoUrl: '/projects/whatsapp-booking',
    featured: false,
    live: false,
  },
  {
    slug: 'launch-website-with-admin',
    name: 'Launch website with admin',
    client: CONCEPT,
    type: 'Website and admin',
    industry: 'New businesses',
    categories: ['Design', 'Frontend', 'Backend'],
    stack: ['Next.js', 'Node.js', 'MongoDB'],
    summary: 'A fast, professional website for a new business, with an admin to edit content and handle enquiries.',
    challenge: 'A new business needs to look credible online quickly, but has no developer and no agency budget.',
    whatWeDid:
      "Custom-designed pages built for speed and phones, a contact and booking flow, and a simple admin where the owner updates content, reads messages and manages bookings. It's built so payments, a shop or AI can be added later without starting over.",
    result: 'Try the guided demo, built around a sample car-wash business. Real results will be added with the first client.',
    demoUrl: '/projects/launch-website',
    featured: false,
    live: false,
  },
  {
    slug: 'business-admin-system',
    name: 'Business admin system',
    client: 'byteleaf',
    type: 'Internal admin',
    industry: 'Services',
    categories: ['Frontend', 'Backend'],
    stack: ['Next.js', 'Node.js', 'MongoDB', 'Docker'],
    summary: 'The admin we run byteleaf on: bookings, messages, quotes, invoices and projects, behind two-step login.',
    challenge: 'Running a small business out of inboxes and spreadsheets, with bookings in one place, quotes in another and invoices in a third.',
    whatWeDid:
      'We built our own. It covers availability and booking, a messages inbox, clients, quotes and invoices with PDFs and payment tracking, a project showcase, and two-factor login.',
    result: 'It runs in production today, and the same foundations can be tailored to your business.',
    featured: false,
    live: true,
  },
  {
    slug: 'law-firm-website',
    name: 'Law firm website',
    client: CONCEPT,
    type: 'Website',
    industry: 'Legal',
    categories: ['Design', 'Frontend'],
    stack: ['Next.js', 'TypeScript', 'CSS'],
    summary: 'A calm, credible website for a small law firm, with fees, privacy and urgent-matter wording built in.',
    challenge: 'People come to a law firm worried and short of time. They need to know quickly whether the firm handles their matter, what it costs and how to start, and they need to trust it before the first call.',
    whatWeDid:
      'A seven-page site with its own identity, a consultation request form that behaves like the real thing, plain-language practice area pages and guides, and the trust work built in: a fees page, not-legal-advice notes, privacy wording and an urgent-matters note where people need it.',
    result: 'Browse the sample firm, built around a made-up practice. It is frontend only for now, and an admin, enquiry inbox and booking can be added later.',
    demoUrl: '/projects/law-firm',
    featured: false,
    live: false,
  },
];

async function main() {
  await connectDB();
  const count = await Project.countDocuments();
  let order = count;
  for (const { live, featured, ...copy } of STARTERS) {
    const existing = await Project.findOne({ slug: copy.slug });
    if (existing) {
      existing.set(copy);
      await existing.save();
      console.log(`updated   ${copy.slug}`);
    } else {
      await Project.create({ ...copy, live, featured, pattern: order % 3, sortOrder: order++ });
      console.log(`created   ${copy.slug} (${live ? 'live' : 'draft'})`);
    }
  }
  console.log(`Done on ${env.MONGODB_URI.replace(/\/\/[^@]*@/, '//***@')}`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
