// Adds (or updates) the starter showcase projects until real client work replaces them.
//   npm run starter-projects
// Safe to re-run: projects are matched by slug and their copy is refreshed, but `live`, `featured`
// and any images set in the admin are left alone once a project exists.
// Names, sample businesses and demo links come from lib/projects-meta.ts so the cards, page titles and breadcrumbs agree.
import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';
import { env } from '@/lib/server/env';
import { Project } from '@/lib/server/models';
import { SHOWCASE as M } from '@/lib/projects-meta';

const CONCEPT = 'Concept build (made-up business)';

// `live` is only used when a project is first created; flip the rest on from the admin once each demo exists.
const STARTERS = [
  {
    slug: M.chatbot.slug,
    name: M.chatbot.name,
    client: CONCEPT,
    type: 'AI chatbot',
    industry: 'Home solar',
    categories: ['Design', 'Frontend', 'Backend', 'AI'],
    stack: ['Next.js', 'Node.js', 'MongoDB', 'LLM API'],
    summary: 'A chatbot for Khumalo Home Solar, a made-up installer. It answers only from the business’s own prices, policies and FAQs.',
    challenge:
      'Khumalo Home Solar gets the same questions all day: what a system costs, what is included, how long an install takes. Staff lose time answering them, and the answers are scattered across a website, price lists and PDFs.',
    whatWeDid:
      'We load the business’s information by upload, by typing it in, or by reading its website. AI tidies it into short items the owner approves, edits or rejects. The chatbot then answers only from those items, shows the source of every answer, and says so when it does not know. Staff-only items stay private, and questions it could not answer come back to the owner. It runs as a public chat or as a widget on the business’s own site.',
    result: 'Ask Khumalo Home Solar’s chatbot on the demo page, or see it as a widget on a sample website. Figures such as time saved will come from a live client.',
    demoUrl: M.chatbot.demoUrl,
    featured: true,
    live: false,
  },
  {
    slug: M.whatsapp.slug,
    name: M.whatsapp.name,
    client: CONCEPT,
    type: 'WhatsApp bookings',
    industry: 'Salons, clinics and tutors',
    categories: ['Frontend', 'Backend', 'AI'],
    stack: ['Next.js', 'Node.js', 'MongoDB', 'WhatsApp'],
    summary: 'Clients of Lerato’s Braids & Beauty, a made-up salon, book, change and cancel on WhatsApp. The owner sees it all in one calendar.',
    challenge:
      'Lerato’s Braids & Beauty takes bookings by back-and-forth messages. Diaries get double-booked or forgotten, and no-shows cost real money.',
    whatWeDid:
      'Clients message the WhatsApp number they already know, pick a service and a free time, and get a confirmation. A time is held for a few minutes while they confirm, so two people never get the same slot, and a reminder goes out the evening before. The owner has a calendar and an inbox for messages that need a person, with rules for opening hours, breaks, time off and how many bookings one client can hold. Clients are asked for consent first, and STOP always works.',
    result: 'Tap through the guided demo, or message the test number to book a made-up appointment. Fewer no-shows and less admin time is the goal, and real figures will come from a live client.',
    demoUrl: M.whatsapp.demoUrl,
    featured: false,
    live: false,
  },
  {
    slug: M.launch.slug,
    name: M.launch.name,
    client: CONCEPT,
    type: 'Website and admin',
    industry: 'New businesses',
    categories: ['Design', 'Frontend', 'Backend'],
    stack: ['Next.js', 'Node.js', 'MongoDB'],
    summary: 'A fast five-page site for Tsela Mobile Wash, a made-up car-wash business, plus the admin its owner uses to keep it current.',
    challenge:
      'Tsela Mobile Wash is a new business with no developer and no agency budget, but it needs to look credible online quickly and stay up to date without help.',
    whatWeDid:
      'A five-page site built for phones and weak data: home, services and prices, about, gallery and contact, with an enquiry form that lands in the admin and the owner’s email. The owner’s admin edits page words in fixed blocks with a live preview, services and prices, photos and business details, and reads enquiries. Changes are saved as drafts, published together, and can be undone for ten seconds. Payments, a shop or AI can be added later without starting over.',
    result: 'Browse the Tsela Mobile Wash site, and play three short stories to see the admin in use: an enquiry arrives, a price changes, photos are added. Real results will come with the first client.',
    demoUrl: M.launch.demoUrl,
    featured: false,
    live: false,
  },
  {
    slug: M.admin.slug,
    name: M.admin.name,
    client: 'byteleaf',
    type: 'Business admin',
    industry: 'Services',
    categories: ['Frontend', 'Backend'],
    stack: ['Next.js', 'Node.js', 'MongoDB', 'Docker'],
    summary: 'The admin byteleaf runs on: bookings, messages, clients, quotes, invoices and projects, behind two-step login. Real, not a concept.',
    challenge:
      'Running a small studio out of inboxes and spreadsheets meant bookings in one place, quotes in another and invoices in a third.',
    whatWeDid:
      'We built our own. It covers availability and bookings, a messages inbox, clients, quotes and invoices with PDFs and payment tracking, the project showcase you are looking at, and two-factor login. The WhatsApp booking and website admins above reuse its screens and patterns.',
    result: 'It runs byteleaf day to day in production, and the same foundations can be tailored to your business. There is no public demo, because it holds real client data.',
    featured: false,
    live: true,
  },
  {
    slug: M.law.slug,
    name: M.law.name,
    client: CONCEPT,
    type: 'Website',
    industry: 'Legal',
    categories: ['Design', 'Frontend'],
    stack: ['Next.js', 'TypeScript', 'CSS'],
    summary: 'A calm seven-page site for Ravell Ndaba Attorneys, a made-up Johannesburg firm, with fees, privacy and urgent-matter wording built in.',
    challenge:
      'People come to a law firm worried and short of time. They need to know quickly whether the firm handles their matter, what it costs and how to start, and they need to trust it before the first call.',
    whatWeDid:
      'A seven-page site with its own identity: home, practice areas, a full family law page, attorneys, fees, guides and contact. It has a consultation request form that behaves like the real thing, plain-language wording, a fees page, not-legal-advice notes, privacy wording and an urgent-matters note where people need it.',
    result: 'Browse the Ravell Ndaba Attorneys sample site. It is frontend only for now, and nothing you type is sent. An admin, enquiry inbox and booking can be added later.',
    demoUrl: M.law.demoUrl,
    featured: false,
    live: false,
  },
];

for (const p of STARTERS) {
  if (p.summary.length > 140) throw new Error(`Summary for ${p.slug} is ${p.summary.length} characters; the limit is 140.`);
}

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
