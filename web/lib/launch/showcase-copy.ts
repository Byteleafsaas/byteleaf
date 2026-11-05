// The showcase page copy (HANDOFF-LAUNCH §7), from launch/copy.json.
export const SHOWCASE = {
  "eyebrow": "Showcase project 3 of 5 · Website and admin",
  "h1": [
    "Look established on day one.",
    "Run it yourself after that."
  ],
  "intro": "A fast site for a brand-new business, and a simple admin to keep it current. Switch between the two below, or play one of the stories.",
  "demoNote": "This is a demo with sample data. Tsela Mobile Wash is a made-up business, and its prices, reviews and enquiries are invented. The browser and phone are our own drawings.",
  "views": [
    "What your customers see",
    "What you manage"
  ],
  "idleCaption": "Two views of one business. Customers see a calm, quick site. You see a few clear screens to keep it current.",
  "stories": {
    "enquiry": {
      "tab": "A customer sends an enquiry",
      "steps": [
        {
          "view": "site",
          "caption": "A customer in Hatfield finds you. She opens your site on her phone and taps Book a wash."
        },
        {
          "view": "site",
          "caption": "She fills in four fields. Name, number, area and the wash she wants. Then Send request."
        },
        {
          "view": "site",
          "caption": "She knows what happens next. The sent message says you’ll confirm within [reply time]."
        },
        {
          "view": "admin",
          "caption": "It lands in your admin, and your email. Everything she typed, ready for a reply on WhatsApp or email."
        }
      ],
      "done": "No missed customers. Every enquiry is in one place, with a reply button."
    },
    "price": {
      "tab": "You change a price",
      "steps": [
        {
          "view": "admin",
          "caption": "Prices went up this month. Open Services & prices and tap the wash to change."
        },
        {
          "view": "admin",
          "caption": "Change the number, then Save. Saving keeps it as a draft. Nothing changes for customers yet."
        },
        {
          "view": "admin",
          "caption": "One change is waiting. The bar at the bottom shows it. Tap Publish when you’re ready."
        },
        {
          "view": "site",
          "caption": "Your site is updated. The new price shows everywhere it appears. You could undo for 10 seconds."
        }
      ],
      "done": "Two minutes, no developer. You changed it, checked it and published it yourself."
    },
    "photos": {
      "tab": "You add photos",
      "steps": [
        {
          "view": "admin",
          "caption": "Your gallery is empty. The site still looks finished. When you have photos, tap Upload photos."
        },
        {
          "view": "admin",
          "caption": "Three photos from your phone. They upload, get a short description, and wait for you to publish."
        },
        {
          "view": "site",
          "caption": "Your gallery fills in. Before-and-after pairs, sized to load quickly on any phone."
        }
      ],
      "done": "Photos whenever you have them. The site looked finished before, and better after."
    }
  },
  "offPathHint": "This story follows one path. Tap the highlighted button, or use Next step.",
  "included": [
    "A five-page site with your own look: a name-based logo, colours and type",
    "Built for phones and weak data, with call and WhatsApp buttons always in reach",
    "An enquiry form that lands in your admin and your email",
    "Your admin: pages, prices, photos, details, enquiries and bookings",
    "Your web address, secure hosting and renewals looked after",
    "Room to add bookings, payments or a shop later, without starting again"
  ],
  "liveIn": "[delivery time]",
  "from": "[from price]",
  "notIncluded": "Not included yet: online payments, a shop, a blog and more than one language. Each can be added later.",
  "howTitle": "How we set it up for you",
  "how": [
    {
      "t": "Tell us about the business",
      "d": "A 30-minute call. We pick a name-based logo, colours and words that sound like you."
    },
    {
      "t": "See it before it’s live",
      "d": "You get a working version on your phone within [delivery time]. Change anything you like."
    },
    {
      "t": "Go live, then run it yourself",
      "d": "We connect your web address, show you the admin, and stay a message away."
    }
  ],
  "cta": {
    "title": "Want a site like this?",
    "text": "Tell us about your business. You’ll see a working first version before anything goes live.",
    "button": "Book a call"
  }
} as const;
