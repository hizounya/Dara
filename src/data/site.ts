// Site-wide settings and content that the team fills in over time.
// Rule: nothing here may be invented. Unknown values stay null or empty, and the sections that use them hide.

export interface SiteEvent {
  title: string;
  date: string;            // ISO date, e.g. '2026-11-21'
  location: string;        // venue, city, or 'Online'
  summary: string;
  link?: string;           // registration or details
}

// The community's WhatsApp group (supplied by the team, 28 Oct 2026). Change it here only.
const COMMUNITY_URL = 'https://chat.whatsapp.com/K7fENvWtyzsCB1Cop4U4Ib?mode=gi_t';

export const site = {
  name: 'Dara in Tech',
  tagline: 'A community for women to learn, connect, and grow in tech.',
  instagram: { handle: '@daraintech.id', url: 'https://www.instagram.com/daraintech.id/' },
  contactEmail: 'daraintech.id@gmail.com' as string | null,   // confirmed by the team, 28 Oct 2026 (partnerships and general contact)

  hubUrl: '/hub/',
  signupUrl: '/signup',
  // "Join our community" opens the WhatsApp group; the Member Hub (Talent Pool, roles, Mading) is a separate sign-up.
  joinUrl: COMMUNITY_URL,
  joinVia: 'WhatsApp',

  // In-page anchors until the About, Programs & Events and Partnerships pages exist (Phase 6),
  // so the navigation never leads to a missing page.
  nav: [
    { label: 'About', href: '/#about' },
    { label: 'Programs & Events', href: '/#programs' },
    { label: 'Talent Hub', href: '/#talent-hub' },
    { label: 'Partnerships', href: '/#partner' },
  ],
};

// Confirmed events only. Leave empty until details are final; the homepage shows an Instagram prompt instead.
export const events: SiteEvent[] = [];
