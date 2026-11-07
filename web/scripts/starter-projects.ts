// Adds (or updates) the starter showcase projects until real client work replaces them.
//   npm run starter-projects
// Safe to re-run: projects are matched by slug and their copy is refreshed, but `live`, `featured`
// and any images set in the admin are left alone once a project exists.
// Pass --copy-only to refresh the portfolio text on existing projects without creating records.
// Names, sample businesses and demo links come from lib/projects-meta.ts so the cards, page titles and breadcrumbs agree.
import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';
import { env } from '@/lib/server/env';
import { Project } from '@/lib/server/models';
import { SHOWCASE as M, STANDALONE as S } from '@/lib/projects-meta';

const DEMO = 'Interactive demo';
const PRODUCT = 'Standalone product';

// `live` is only used when a project is first created; flip the rest on from the admin once each demo exists.
const STARTERS = [
  {
    slug: M.chatbot.slug,
    name: M.chatbot.name,
    client: DEMO,
    type: 'AI chatbot',
    industry: 'Home solar',
    categories: ['Design', 'Frontend', 'Backend', 'AI'],
    stack: ['Next.js', 'Node.js', 'MongoDB', 'LLM API'],
    summary: 'Answer repeat customer questions using your own prices, policies and FAQs, with sources people can check.',
    challenge:
      'Customers ask about prices, what’s included and how long a job takes. When the answers are spread across price lists, PDFs and web pages, the team has to find and repeat the same information.',
    whatWeDid:
      'Upload documents, paste text or import web pages. AI turns the material into entries your team can review and publish. The chatbot cites the approved sources it uses and offers a handover when it can’t answer. Your team can review unanswered questions to see what the knowledge base is missing.',
    result: 'Ask the Khumalo Home Solar demo about installation costs or warranties, check the sources it cites, and try the chat as a widget on the sample website.',
    demoUrl: M.chatbot.demoUrl,
    featured: true,
    live: false,
  },
  {
    slug: M.whatsapp.slug,
    name: M.whatsapp.name,
    client: DEMO,
    type: 'WhatsApp bookings',
    industry: 'Salons, clinics and tutors',
    categories: ['Frontend', 'Backend', 'AI'],
    stack: ['Next.js', 'Node.js', 'MongoDB', 'WhatsApp'],
    summary: 'Let clients book, reschedule and cancel on WhatsApp. See every appointment in one calendar.',
    challenge:
      'Booking by chat can mean several messages just to agree on a time. Staff still have to update the diary, remember to send reminders and handle changes.',
    whatWeDid:
      'Clients choose a service and an available time in WhatsApp. The assistant holds the slot while they confirm, sends reminders and handles changes. Staff manage hours, breaks and time off in the admin, with a calendar for appointments and an inbox for chats that need a person.',
    result: 'Book, move or cancel a sample appointment in the guided Lerato’s Braids & Beauty demo and see the calendar update alongside the chat.',
    demoUrl: M.whatsapp.demoUrl,
    featured: false,
    live: false,
  },
  {
    slug: M.launch.slug,
    name: M.launch.name,
    client: DEMO,
    type: 'Website and admin',
    industry: 'New businesses',
    categories: ['Design', 'Frontend', 'Backend'],
    stack: ['Next.js', 'Node.js', 'MongoDB'],
    summary: 'A business website with an admin to update prices, add photos and manage enquiries yourself.',
    challenge:
      'A new service business needs somewhere customers can check prices and get in touch. The owner needs to make everyday changes without waiting for a developer.',
    whatWeDid:
      'We built a five-page site for phones, with services, pricing, a gallery and an enquiry form. The admin brings enquiries, page copy, prices and photos together. Owners can save changes as a draft, preview the site and publish when they’re ready.',
    result: 'Browse the Tsela Mobile Wash site, then follow a customer enquiry from the form to the inbox or try publishing a price change and a set of gallery photos.',
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
    summary: 'We use it to run byteleaf. Bookings, enquiries, clients, quotes and invoices all live in one place.',
    challenge:
      'We wanted one place to handle the work that starts with a website enquiry and ends with a paid invoice.',
    whatWeDid:
      'We built an admin for managing availability, responding to enquiries, sending PDF quotes and invoices, recording payments and publishing portfolio projects. Two-step sign-in is available for the owner account.',
    result: 'It powers byteleaf’s own contact and booking workflows. We use the same admin to publish the portfolio you’re browsing.',
    featured: false,
    live: true,
  },
  {
    slug: M.law.slug,
    name: M.law.name,
    client: DEMO,
    type: 'Website',
    industry: 'Legal',
    categories: ['Design', 'Frontend'],
    stack: ['Next.js', 'TypeScript', 'CSS'],
    summary: 'Help prospective clients find the right practice area, understand fees and see how to request a consultation.',
    challenge:
      'Someone looking for legal help needs to know whether the firm handles their matter, what a first consultation costs and what to do if their matter is urgent.',
    whatWeDid:
      'We designed a visual identity and a site with plain-language practice pages, attorney profiles, consultation fees and guides. The contact page explains how to request a consultation and puts urgent contact options where visitors can find them.',
    result: 'Explore the Ravell Ndaba Attorneys demo, from the family law page to the fees and consultation form. The demo form doesn’t send or store your details.',
    demoUrl: M.law.demoUrl,
    featured: false,
    live: false,
  },
  {
    slug: S.yenza.slug,
    name: S.yenza.name,
    client: PRODUCT,
    type: 'Web app',
    industry: 'Job seekers',
    categories: ['Design', 'Frontend', 'Backend', 'AI'],
    stack: ['Next.js', 'Node.js', 'MongoDB', 'LLM API'],
    summary: 'Build or improve your CV with AI feedback, choose a template and download it as a PDF or editable Word file.',
    challenge:
      'Writing a CV means figuring out what to include, how to describe your work and which layout to use. Feedback is especially useful when you’re editing it on your own.',
    whatWeDid:
      'Start with a guided builder or upload an existing CV. Yenza’iCV gives feedback on clarity, achievements and structure, suggests wording you can edit, and offers six templates. Download the finished CV as a PDF or editable Word document.',
    result: 'Open Yenza’iCV to build or improve a CV, preview a template and export a file ready to send with a job application.',
    demoUrl: S.yenza.demoUrl,
    featured: false,
    live: true,
  },
  {
    slug: S.enrollsync.slug,
    name: S.enrollsync.name,
    client: PRODUCT,
    type: 'Web platform',
    industry: 'Schools',
    categories: ['Design', 'Frontend', 'Backend'],
    stack: ['Next.js', 'Node.js', 'MongoDB', 'PWA'],
    summary: 'Manage school admissions, learner records and daily attendance in one place, from application to classroom.',
    challenge:
      'When admissions, learner records and class registers live in separate places, school staff have to re-enter details and check several records to see what’s up to date.',
    whatWeDid:
      'Parents apply from a link on their phones. Office staff review applications, track outstanding documents and enrol accepted learners into a class. Teachers can mark attendance on a phone, even when the signal drops, and the office can review attendance by class.',
    result: 'Explore EnrollSync to see how one application becomes a learner record and how class registers feed into the school’s attendance view.',
    demoUrl: S.enrollsync.demoUrl,
    featured: false,
    live: true,
  },
];

for (const p of STARTERS) {
  if (p.summary.length > 140) throw new Error(`Summary for ${p.slug} is ${p.summary.length} characters; the limit is 140.`);
}

async function main() {
  await connectDB();
  if (process.argv.includes('--copy-only')) {
    for (const { slug, summary, challenge, whatWeDid, result } of STARTERS) {
      const update = await Project.updateOne({ slug, deletedAt: null }, { $set: { summary, challenge, whatWeDid, result } });
      console.log(`${update.matchedCount ? 'synced ' : 'skipped'}   ${slug}`);
    }
    return;
  }
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
