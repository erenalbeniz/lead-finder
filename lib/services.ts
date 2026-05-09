import type { SearchHit } from "./types";

/**
 * The 20 services Wairo Studio sells. Each entry can `match()` a SearchHit
 * (raw OSM result, optionally enriched with email / facebook / instagram from
 * overpass.ts) and tell the UI whether the lead is a strong fit for that
 * service. The match logic uses only signals visible from a search result —
 * no website check required — so the picker works in real time.
 */

export interface ServiceHit extends SearchHit {
  email?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
}

export interface ServiceDef {
  id: string;
  label: string;
  short: string;
  blurb: string;
  emoji: string;
  match: (hit: ServiceHit) => boolean;
}

const VISUAL_CATS = ["restaurant", "cafe", "bar", "pub", "hotel", "guest_house", "spa", "beauty", "salon", "hairdresser", "bakery", "florist", "boutique", "tattoo", "gallery", "tourism"];
const HOSPITALITY_CATS = ["restaurant", "cafe", "bar", "pub", "hotel", "guest_house", "spa", "salon", "hairdresser"];
const APPOINTMENT_CATS = ["dentist", "doctor", "clinic", "veterinary", "spa", "salon", "hairdresser", "lawyer", "accountant", "yoga"];
const RETAIL_CATS = ["bakery", "florist", "boutique", "shop", "pet", "pharmacy", "gallery"];
const FOOD_CATS = ["restaurant", "cafe", "bar", "pub", "biergarten"];

function catIncludes(hit: ServiceHit, keys: string[]): boolean {
  const c = (hit.category ?? "").toLowerCase();
  return keys.some((k) => c.includes(k));
}

export const SERVICES: ServiceDef[] = [
  {
    id: "website-design",
    label: "Website Design",
    short: "New site",
    blurb: "Build a modern site from scratch for businesses with no web presence.",
    emoji: "🌐",
    match: (h) => !h.website,
  },
  {
    id: "website-redesign",
    label: "Website Redesign",
    short: "Redesign",
    blurb: "Refresh dated or low-quality sites with a modern, conversion-focused redesign.",
    emoji: "✨",
    match: (h) => !!h.website,
  },
  {
    id: "mobile-optimization",
    label: "Mobile Optimization",
    short: "Mobile-friendly",
    blurb: "Make existing sites fast and usable on phones — most local sites aren't.",
    emoji: "📱",
    match: (h) => !!h.website,
  },
  {
    id: "seo",
    label: "SEO & Local Search",
    short: "SEO",
    blurb: "Rank higher on Google for local searches that drive walk-ins and bookings.",
    emoji: "🔎",
    match: () => true,
  },
  {
    id: "google-business",
    label: "Google Business Profile Setup",
    short: "GBP setup",
    blurb: "Claim and optimize the Google Maps listing — the #1 source of local leads.",
    emoji: "📍",
    match: (h) => !h.website || (h.user_ratings_total ?? 0) < 20,
  },
  {
    id: "instagram-setup",
    label: "Instagram Setup & Strategy",
    short: "Instagram",
    blurb: "Set up a branded Instagram presence with bio, highlights, and a content plan.",
    emoji: "📸",
    match: (h) => !h.instagram_url && catIncludes(h, VISUAL_CATS),
  },
  {
    id: "facebook-setup",
    label: "Facebook Page Setup",
    short: "Facebook",
    blurb: "Create or fix a proper Facebook business page wired to Maps and ads.",
    emoji: "👍",
    match: (h) => !h.facebook_url,
  },
  {
    id: "social-management",
    label: "Social Media Management",
    short: "Social mgmt",
    blurb: "Monthly content, posting schedule, community replies — fully managed.",
    emoji: "💬",
    match: (h) => !h.instagram_url || !h.facebook_url,
  },
  {
    id: "content-photo",
    label: "Content & Photography",
    short: "Photo/Content",
    blurb: "Pro photo + short-form video shoots for menus, rooms, treatments, products.",
    emoji: "🎞️",
    match: (h) => catIncludes(h, VISUAL_CATS),
  },
  {
    id: "branding",
    label: "Logo & Branding",
    short: "Branding",
    blurb: "Logo, colors, type system and brand guidelines that look premium.",
    emoji: "🎨",
    match: () => true,
  },
  {
    id: "online-booking",
    label: "Online Booking System",
    short: "Bookings",
    blurb: "Let customers book tables, rooms or appointments 24/7 from the website.",
    emoji: "📅",
    match: (h) => catIncludes(h, [...HOSPITALITY_CATS, ...APPOINTMENT_CATS]),
  },
  {
    id: "ecommerce",
    label: "E-commerce / Online Shop",
    short: "E-commerce",
    blurb: "Sell products online with stock, payments and shipping integrated.",
    emoji: "🛒",
    match: (h) => catIncludes(h, RETAIL_CATS),
  },
  {
    id: "qr-menu",
    label: "Digital QR Menu",
    short: "QR menu",
    blurb: "Replace paper menus with a fast, image-rich digital menu accessed by QR.",
    emoji: "🍽️",
    match: (h) => catIncludes(h, FOOD_CATS),
  },
  {
    id: "google-ads",
    label: "Google Ads",
    short: "Google Ads",
    blurb: "Targeted Google search ads to capture high-intent buyers in their micro-moment.",
    emoji: "🎯",
    match: () => true,
  },
  {
    id: "meta-ads",
    label: "Meta Ads (Facebook/Instagram)",
    short: "Meta Ads",
    blurb: "Paid social campaigns built around video creative and pixel-driven retargeting.",
    emoji: "📊",
    match: (h) => catIncludes(h, VISUAL_CATS),
  },
  {
    id: "reputation",
    label: "Reputation & Reviews",
    short: "Reviews",
    blurb: "Generate consistent 5-star reviews and respond to negative ones professionally.",
    emoji: "⭐",
    match: (h) => (h.rating != null && h.rating < 4.2) || (h.user_ratings_total ?? 0) < 25,
  },
  {
    id: "email-marketing",
    label: "Email Marketing & Newsletter",
    short: "Email",
    blurb: "Set up a newsletter, automations and recovery flows to bring customers back.",
    emoji: "✉️",
    match: () => true,
  },
  {
    id: "whatsapp-business",
    label: "WhatsApp Business Setup",
    short: "WhatsApp",
    blurb: "Catalog, quick replies and a click-to-chat button on every page and ad.",
    emoji: "💚",
    match: (h) => !!h.phone,
  },
  {
    id: "video-reels",
    label: "Short-form Video & Reels",
    short: "Reels",
    blurb: "Monthly batch-shot Reels and TikToks engineered for reach and bookings.",
    emoji: "🎥",
    match: (h) => catIncludes(h, VISUAL_CATS),
  },
  {
    id: "ai-chatbot",
    label: "AI Chatbot / Customer Support",
    short: "AI chatbot",
    blurb: "Answer FAQs, take bookings and qualify leads on the site and WhatsApp 24/7.",
    emoji: "🤖",
    match: (h) => catIncludes(h, [...HOSPITALITY_CATS, ...APPOINTMENT_CATS]),
  },
];

export function findService(id: string | null | undefined): ServiceDef | null {
  if (!id) return null;
  return SERVICES.find((s) => s.id === id) ?? null;
}

/** Return all services this lead is a strong fit for (used for badges). */
export function matchingServices(hit: ServiceHit): ServiceDef[] {
  return SERVICES.filter((s) => s.match(hit));
}
