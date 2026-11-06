// All copy and data from the approved design. Items in [square brackets] are
// owner-supplied placeholders (HANDOFF §12): keep them visible until replaced.

export const SITE = {
  email: 'info@byteleaf.dev',
  emailHref: 'mailto:info@byteleaf.dev',
  phone: '[+27 00 000 0000]',
  phoneHref: 'tel:+27000000000',
  hours: 'Mon–Fri · [08:00–17:00] SAST',
  replyTime: '[X] business hours',
  tagline: 'Design, frontend, backend and AI integrations for businesses at every stage.',
};

export const NAV = [
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/workflow', label: 'Workflow' },
  { href: '/projects', label: 'Projects' },
  { href: '/contact', label: 'Contact' },
];

export const TECH = ['React', 'Next.js', 'TypeScript', 'Node.js', 'Express', 'Python', 'PostgreSQL', 'MongoDB', 'Docker', 'REST & GraphQL', 'LLM APIs', 'Figma', 'Tailwind', 'Cloudflare'];

export const HOME_SERVICES = [
  { icon: 'design', title: 'Design', text: 'Product and interface design that fits how your team and customers already work — flows, wireframes, UI and design systems.', tags: ['UX flows', 'UI', 'Design systems'] },
  { icon: 'frontend', title: 'Frontend', text: 'Fast, accessible web apps, portals and dashboards — built to be easy to change long after launch.', tags: ['React', 'Next.js', 'TypeScript'] },
  { icon: 'backend', title: 'Backend', text: 'APIs, databases, integrations and infrastructure that keep your operations running — secure, monitored and documented.', tags: ['Node.js', 'PostgreSQL', 'Docker'] },
  { icon: 'ai', title: 'AI integrations', text: 'Practical AI inside the systems you already run — assistants on your own data, document processing and workflow automation.', tags: ['LLM APIs', 'RAG', 'Automation'] },
];

export const HOME_WORK_WITH_YOU = [
  { tag: 'CARE', title: 'Maintenance', text: 'A monthly retainer for day-to-day upkeep: updates, security patches, monitoring, backups and small changes.', meta: 'Monthly · ongoing' },
  { tag: 'BUILD', title: 'Full-stack development', text: 'New features, internal tools or whole products — scoped, quoted and delivered as and when you need them.', meta: 'Per project' },
  { tag: 'FIX', title: 'Bug fixing & rescue', text: 'Something broken, slow or inherited from a previous developer? We find the cause, fix it and document what we did.', meta: 'Per issue · or hourly' },
  { tag: 'TEAM', title: 'Collaboration, your way', text: 'Work alongside your in-house team — in your repos, your tools and your stand-ups — or take a whole area off your plate.', meta: 'Flexible' },
];

export const HOME_STEPS = [
  { n: '01', title: 'Discover', text: 'A call to understand your business, your systems and what needs to change.' },
  { n: '02', title: 'Scope', text: 'We review what exists and send a written plan with a clear quote.' },
  { n: '03', title: 'Design', text: 'Flows, screens and architecture, agreed with you before we build.' },
  { n: '04', title: 'Build', text: 'Short cycles with regular demos on a staging site you can click through.' },
  { n: '05', title: 'Launch', text: 'A careful release, handover docs and training for your team.' },
  { n: '06', title: 'Care', text: 'Ongoing maintenance, monitoring and improvements every month.' },
];

export const HOME_PROJECTS = [
  { type: 'E-commerce · Frontend + Backend', pattern: 0 },
  { type: 'AI integration · Backend', pattern: 1 },
  { type: 'Maintenance · Full stack', pattern: 2 },
];

export const WHY = [
  { title: 'Here in Johannesburg', text: 'Same time zone, meetings in person when it helps, and invoicing in rand.' },
  { title: 'Front to back, one team', text: 'Design, frontend, backend and AI under one roof — no hand-offs between agencies.' },
  { title: 'You own everything', text: 'Your code, your accounts, your data — documented so anyone can pick it up.' },
  { title: 'Plain-language reporting', text: "A short monthly report on what changed, what's at risk and what's next." },
];

export const SERVICE_LISTS = {
  design: ['User research & journeys', 'Wireframes & prototypes', 'UI design in Figma', 'Design systems & brand'],
  frontend: ['Web apps & portals', 'Admin dashboards', 'E-commerce storefronts', 'Accessibility & speed'],
  backend: ['REST & GraphQL APIs', 'Databases & migrations', 'Third-party integrations', 'Hosting, CI/CD & monitoring'],
  ai: ['Assistants on your own data', 'Document reading & extraction', 'Workflow automation', 'AI features in existing apps'],
};

export const ENDPOINTS = [
  { m: 'GET', p: '/api/orders', color: 'var(--method-get)' },
  { m: 'POST', p: '/api/invoices', color: 'var(--method-post)' },
  { m: 'PATCH', p: '/api/customers/:id', color: 'var(--method-patch)' },
  { m: 'GET', p: '/api/stock/levels', color: 'var(--method-get)' },
  { m: 'POST', p: '/webhooks/payments', color: 'var(--method-post)' },
];

export const MODELS = [
  { tag: 'CARE', title: 'Maintenance', text: 'Day-to-day upkeep for the systems your business runs on.', price: '[From R— / month]', unit: 'Monthly retainer', items: ['Updates & security patches', 'Monitoring & backups', '[X] hours of changes a month', 'Monthly report'] },
  { tag: 'BUILD', title: 'Full-stack projects', text: 'New features, tools or products, built as you need them.', price: '[Quoted per project]', unit: 'Fixed scope', items: ['Discovery & written scope', 'Design through launch', 'Regular demos', 'Handover docs'] },
  { tag: 'FIX', title: 'Bug fixing & rescue', text: 'Fast help when something breaks or a codebase is inherited.', price: '[R— / hour]', unit: 'Per issue or hourly', items: ['Diagnosis & root cause', 'Fix and test', 'Code health review', 'Written summary'] },
  { tag: 'TEAM', title: 'Collaboration', text: 'Extra hands that slot into your own team and tools.', price: '[Let’s talk]', unit: 'Flexible', items: ['Your repos & workflow', 'Join your stand-ups', 'Pair with your devs', 'Scale up or down'] },
];

export const FAQS = [
  { q: 'Do you only work with big companies?', a: 'No. We work with businesses of any size and at any stage — from a new idea that needs its first website to established, multi-branch operations.' },
  { q: 'Can you take over a system someone else built?', a: 'Yes. We start with a short audit so we understand the code, fix what is urgent, and document it as we go.' },
  { q: 'What does a maintenance contract include?', a: 'Updates, security patches, monitoring, backups and a set number of hours each month for small changes and fixes, plus a short monthly report.' },
  { q: 'Who owns the code?', a: 'You do. Code, accounts and data stay in your name, and we document everything so you are never locked in.' },
  { q: 'Is AI safe to use with our business data?', a: 'We design integrations so your data stays under your control, and we explain clearly what is sent where before anything goes live.' },
];

export const PROCESS_STEPS = [
  { n: '01', title: 'Discover', who: 'Free · 30-min call', text: 'We learn how your business runs, which systems you depend on and what is getting in the way. No jargon, no pressure.', get: ['Shared understanding', 'Next-step recommendation'] },
  { n: '02', title: 'Audit & scope', who: 'Before any build', text: 'We review your existing code, hosting and tools, then write up exactly what we propose — with a fixed quote or a retainer that fits.', get: ['Written proposal', 'Clear quote', 'Risk list'] },
  { n: '03', title: 'Design', who: 'You sign off', text: 'User flows, screens and technical architecture, shaped with your team and approved before a line of production code is written.', get: ['Clickable prototype', 'Architecture plan'] },
  { n: '04', title: 'Build', who: 'Short cycles', text: 'We build in small increments on a staging site you can use, with regular demos so feedback lands early and nothing surprises you.', get: ['Staging link', 'Regular demos', 'Weekly updates'] },
  { n: '05', title: 'Launch', who: 'Planned release', text: 'A careful go-live with backups and a rollback plan, followed by handover documents and training for the people who will use it.', get: ['Live release', 'Handover docs', 'Team training'] },
  { n: '06', title: 'Care', who: 'Ongoing', text: 'On a maintenance contract, we keep things updated, secure and improving, and report back every month.', get: ['Monitoring', 'Monthly report', 'Priority support'] },
];

export const CARE_BEATS = [
  { k: 'A · MONITOR', v: 'Uptime, errors, security alerts and backups.' },
  { k: 'B · TRIAGE', v: 'Issues and requests ranked with you by impact.' },
  { k: 'C · IMPROVE', v: 'Fixes, updates and small features shipped.' },
  { k: 'D · REPORT', v: "A plain-language summary and next month's plan." },
];

export const TOUCH = [
  { big: '[X] hrs', title: 'Response time', text: 'For urgent production issues on a care contract, during business hours.' },
  { big: 'Weekly', title: 'Progress updates', text: 'A short written update and a demo link while a project is in build.' },
  { big: '1 channel', title: 'Shared workspace', text: 'Slack, Teams, WhatsApp or email — whatever your team already uses.' },
  { big: 'SAST', title: 'Your time zone', text: 'Based in Johannesburg, working the same hours you do.' },
];

export const PROJECT_FILTERS = ['All', 'Design', 'Frontend', 'Backend', 'AI'] as const;

export const PROJECTS = [
  { type: 'E-commerce storefront', cats: ['Design', 'Frontend', 'Backend'], text: '[One line on the brief and the outcome.]', tags: ['Next.js', 'Node.js'] },
  { type: 'AI document assistant', cats: ['AI', 'Backend'], text: '[One line on the brief and the outcome.]', tags: ['LLM API', 'Python'] },
  { type: 'Maintenance', cats: ['Backend', 'Frontend'], text: '[One line on the brief and the outcome.]', tags: ['React', 'PostgreSQL'] },
  { type: 'Customer portal redesign', cats: ['Design', 'Frontend'], text: '[One line on the brief and the outcome.]', tags: ['Figma', 'React'] },
  { type: 'Systems integration', cats: ['Backend'], text: '[One line on the brief and the outcome.]', tags: ['REST', 'Docker'] },
  { type: 'Workflow automation', cats: ['AI', 'Backend'], text: '[One line on the brief and the outcome.]', tags: ['Automation', 'Node.js'] },
];

export const NEEDS = ['Maintenance', 'New feature', 'Bug fix', 'Design', 'Frontend', 'Backend', 'AI integration', 'Something else'];
export const WORK_TYPES = ['Not sure yet', 'Monthly maintenance contract', 'One-off project', 'Bug fix / rescue', 'Join our in-house team'];
export const START_WHEN = ['As soon as possible', 'Within a month', 'In 1–3 months', 'Just exploring'];

export const MEETING_TYPES = [
  { key: 'discovery' as const, name: 'Discovery call', text: 'Tell us about your business and what you need. No prep required.', meta: '30 min · Free · Video call', where: 'Video call' },
  { key: 'deep-dive' as const, name: 'Technical deep-dive', text: 'Walk us through an existing system, codebase or problem in detail.', meta: '60 min · Video call', where: 'Video call' },
  { key: 'in-person' as const, name: 'In-person meeting', text: 'Meet the team at your office or ours in Johannesburg.', meta: '60 min · Johannesburg', where: 'Johannesburg' },
];

// Placeholder availability. TODO: replace with a real calendar source.
export const SLOT_TIMES = ['09:00', '10:00', '11:30', '13:00', '14:30', '16:00'];

// About page. Still a placeholder: the founding-story line and founder photo (see the About page).
export const ABOUT_PRINCIPLES = [
  { n: '01', title: 'Fix the cause, not the symptom', text: 'We dig until we understand why something broke, so it stays fixed.' },
  { n: '02', title: 'Leave it better than we found it', text: 'Every change comes with documentation and tidier code, so anyone can pick it up.' },
  { n: '03', title: 'Say it in plain language', text: 'You always know what we did, what it cost and what comes next — without the jargon.' },
  { n: '04', title: 'AI only where it earns its place', text: 'We recommend AI when it saves real time or money, and say so when it doesn’t.' },
];

export const FOUNDER = {
  first: 'Gerald',
  name: 'Gerald Mutswi',
  role: 'Founder · Full Stack Engineer',
  bio: "I’m Gerald, the founder of byteleaf. I’ve spent the last two years building software for real businesses, working remotely with a European company. I take a project from the first sketch all the way to launch, and I’m the person you’ll deal with the whole way through.",
  linkedin: 'https://www.linkedin.com/in/gerald-mutswi-550711237',
  github: 'https://github.com/Geraldmutsw',
};
