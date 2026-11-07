// Copy for the website and admin showcase.
export const SHOWCASE = {
  "eyebrow": "Website and admin",
  "h1": [
    "Launch your business website.",
    "Keep it current yourself."
  ],
  "intro": "Give customers a place to check your services, see prices and get in touch. Use the admin to update your site and manage enquiries.",
  "demoNote": "Tsela Mobile Wash is a fictional business. The walkthrough uses sample prices, photos and enquiries.",
  "views": [
    "What your customers see",
    "What you manage"
  ],
  "idleCaption": "Switch between the customer site and the admin, or follow a task from start to finish.",
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
          "caption": "The confirmation tells her what to expect next and when she’ll hear back."
        },
        {
          "view": "admin",
          "caption": "Her request appears in the enquiry inbox with the details you need to follow up."
        }
      ],
      "done": "See incoming enquiries in one place and reply from the inbox."
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
      "done": "You’ve saved, checked and published a price change from the admin."
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
          "caption": "Upload photos from your phone, add descriptions and publish when you’re ready."
        },
        {
          "view": "site",
          "caption": "Your gallery fills in. Before-and-after pairs, sized to load quickly on any phone."
        }
      ],
      "done": "The new photos are on the site. You can update the gallery whenever you have more work to show."
    }
  },
  "offPathHint": "This story follows one path. Tap the highlighted button, or use Next step.",
  "included": [
    "Five pages with your branding, including services, pricing and a photo gallery",
    "A mobile-friendly layout with quick access to phone and WhatsApp",
    "An enquiry form connected to an admin inbox, with optional email notifications",
    "An admin to edit pages, services, prices, photos and business details",
    "Drafts and previews so you can check updates before publishing"
  ],
  "howTitle": "How we set it up for you",
  "how": [
    {
      "t": "Tell us about the business",
      "d": "A 30-minute call. We pick a name-based logo, colours and words that sound like you."
    },
    {
      "t": "See it before it’s live",
      "d": "Review a working version on your phone and give us feedback on the design and copy."
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
