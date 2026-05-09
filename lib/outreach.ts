import type { Lead } from "./types";
import type { ServiceDef } from "./services";

export interface OutreachBundle {
  problems: string[];        // 3 specific website problems
  businessImpact: string;    // why it costs them money
  suggestedFix: string;      // what we'd do
  whatsapp: string;          // short WA message
  email: { subject: string; body: string };
}

const SENDER_DEFAULT = "Eren";
const STUDIO_DEFAULT = "your studio";

interface Ctx {
  niceName: string;
  ownerLine: string;
  town: string;
  cat: string;
  sender: string;
  studio: string;
}

/**
 * Builds personalised outreach copy from a Lead's data and detected issues.
 * If `service` is provided, the pitch is tailored to that specific service
 * (Instagram setup, QR menu, redesign, etc.) instead of the generic
 * "your site has issues" pitch.
 */
export function generateOutreach(
  lead: Lead,
  opts?: { senderName?: string; studioName?: string; service?: ServiceDef | null },
): OutreachBundle {
  const sender = opts?.senderName?.trim() || SENDER_DEFAULT;
  const studio = opts?.studioName?.trim() || STUDIO_DEFAULT;
  const service = opts?.service ?? null;

  const cat = (lead.category ?? "business").toLowerCase();
  const town = (lead.location ?? "Malta").split(",")[0].trim();
  const niceName = lead.business_name.trim();
  const ownerLine = lead.owner_name ? `Hi ${lead.owner_name.split(" ")[0]},` : `Hi ${niceName} team,`;
  const ctx: Ctx = { niceName, ownerLine, town, cat, sender, studio };

  if (service) {
    const pitch = SERVICE_PITCHES[service.id];
    if (pitch) {
      const problems = pitch.problems(lead, ctx);
      const businessImpact = pitch.impact(lead, ctx);
      const suggestedFix = pitch.fix(lead, ctx);
      const whatsapp = pitch.whatsapp(lead, ctx);
      const email = pitch.email(lead, ctx, { problems, businessImpact, suggestedFix });
      return { problems, businessImpact, suggestedFix, whatsapp, email };
    }
  }

  const issues: string[] = safeIssues(lead.issues_json);
  const problems = pickThreeProblems(lead, issues);
  const businessImpact = impactLine(lead, problems, cat);
  const suggestedFix = fixLine(lead, problems);
  const whatsapp = buildWhatsApp({ niceName, town, sender, studio, problems });
  const email = buildEmail({ niceName, ownerLine, town, cat, sender, studio, problems, businessImpact, suggestedFix });
  return { problems, businessImpact, suggestedFix, whatsapp, email };
}

function safeIssues(json: string): string[] {
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; }
  catch { return []; }
}

function pickThreeProblems(lead: Lead, issues: string[]): string[] {
  if (lead.website_status === "none") {
    return [
      "No website at all — customers can't research, book, or trust the brand before visiting",
      "Invisible to Google searches like \"" + (lead.category ?? "service") + " near me\"",
      "Every enquiry depends on phone or DMs — no way to qualify leads while you sleep",
    ];
  }
  const priority = [
    /not mobile-friendly/i,
    /no clear call-to-action/i,
    /Phone number not easy to find/i,
    /No WhatsApp/i,
    /No clear services/i,
    /Old design indicators/i,
    /Slow initial load/i,
    /Heavy page/i,
    /HTTP error/i,
  ];
  const sorted = [...issues].sort((a, b) => indexOfMatch(priority, a) - indexOfMatch(priority, b));
  const top = sorted.slice(0, 3);
  while (top.length < 3) top.push(genericFiller(top));
  return top;
}

function indexOfMatch(arr: RegExp[], s: string) {
  for (let i = 0; i < arr.length; i++) if (arr[i].test(s)) return i;
  return 999;
}

function genericFiller(existing: string[]): string {
  const pool = [
    "Generic stock imagery — doesn't show the actual space, team or work",
    "No social proof (reviews, awards, press) above the fold",
    "Contact info is buried in the footer instead of the header",
  ];
  return pool.find((p) => !existing.includes(p)) ?? pool[0];
}

function impactLine(lead: Lead, problems: string[], cat: string): string {
  const reviews = lead.user_ratings_total ?? 0;
  const traffic = reviews > 200 ? "high foot traffic" : reviews > 50 ? "steady foot traffic" : "growing demand";
  if (lead.website_status === "none") {
    return `With ${traffic} on Google Maps, every week without a proper site is enquiries lost to the next ${cat} in the search results.`;
  }
  if (problems.some((p) => /mobile/i.test(p))) {
    return `Most of your visitors are on a phone — a non-responsive site doubles bounce rate and quietly kills the easiest bookings.`;
  }
  if (problems.some((p) => /call-to-action|WhatsApp|Phone/i.test(p))) {
    return `Visitors who can't book, call, or message in two taps almost always leave — the page is doing the visit, but not the conversion.`;
  }
  return `These three issues are the difference between a site that decorates the brand and one that actually books customers.`;
}

function fixLine(lead: Lead, problems: string[]): string {
  if (lead.website_status === "none") {
    return "A focused 4-section site (hero, services, gallery, contact) with WhatsApp + booking, launched in ~2 weeks.";
  }
  if (problems.some((p) => /mobile|viewport/i.test(p))) {
    return "Mobile-first redesign of the key pages, sticky call/WhatsApp button, and a single clear CTA per section.";
  }
  if (problems.some((p) => /Old design|outdated|HTTPS/i.test(p))) {
    return "Modern visual refresh on the existing structure, HTTPS enabled, fast image delivery, and a refreshed services section.";
  }
  return "Tightened copy, prominent contact + WhatsApp, faster load, and a conversion-focused homepage.";
}

function buildWhatsApp(args: { niceName: string; town: string; sender: string; studio: string; problems: string[] }) {
  const { niceName, town, sender, studio, problems } = args;
  const top = problems[0].replace(/^[A-Z]/, (c) => c.toLowerCase()).split(" — ")[0];
  return [
    `Hi ${niceName}! I'm ${sender} from ${studio}, a small web design studio working with ${town} businesses.`,
    `Spotted a quick thing on your online presence — ${top}.`,
    `Happy to send a 2-min Loom showing exactly what I'd change. No pitch deck, no obligation. Want me to send it over?`,
  ].join(" ");
}

function buildEmail(args: {
  niceName: string;
  ownerLine: string;
  town: string;
  cat: string;
  sender: string;
  studio: string;
  problems: string[];
  businessImpact: string;
  suggestedFix: string;
}) {
  const { niceName, ownerLine, sender, studio, problems, businessImpact, suggestedFix, town } = args;
  const subject = `Quick idea for ${niceName}'s website`;
  const body = [
    ownerLine,
    "",
    `I run ${studio}, a small web design practice — I work with ${town}-area businesses and spotted three things on your site I'd quietly fix:`,
    "",
    ...problems.map((p, i) => `  ${i + 1}. ${p}`),
    "",
    businessImpact,
    "",
    `If it's useful: ${suggestedFix}`,
    "",
    `Happy to send a 2-minute screen recording walking through it — no pitch, just the changes. Reply with a yes and I'll send it today.`,
    "",
    `Best,`,
    sender,
  ].join("\n");
  return { subject, body };
}

// ---------- Service-tailored pitches ----------

interface ServicePitch {
  problems: (lead: Lead, ctx: Ctx) => string[];
  impact: (lead: Lead, ctx: Ctx) => string;
  fix: (lead: Lead, ctx: Ctx) => string;
  whatsapp: (lead: Lead, ctx: Ctx) => string;
  email: (
    lead: Lead,
    ctx: Ctx,
    parts: { problems: string[]; businessImpact: string; suggestedFix: string },
  ) => { subject: string; body: string };
}

function emailFromTemplate(
  ctx: Ctx,
  parts: { problems: string[]; businessImpact: string; suggestedFix: string },
  intro: string,
  subject: string,
): { subject: string; body: string } {
  const { ownerLine, sender, studio } = ctx;
  const body = [
    ownerLine,
    "",
    `I run ${studio}. ${intro}`,
    "",
    ...parts.problems.map((p, i) => `  ${i + 1}. ${p}`),
    "",
    parts.businessImpact,
    "",
    `What I'd do: ${parts.suggestedFix}`,
    "",
    `If you're up for it, reply "yes" and I'll send a 2-minute Loom walking through the exact changes — no pitch deck, no obligation.`,
    "",
    `Best,`,
    sender,
  ].join("\n");
  return { subject, body };
}

function whatsappFromTemplate(ctx: Ctx, hook: string, ask: string): string {
  const { niceName, sender, studio, town } = ctx;
  return [
    `Hi ${niceName}! I'm ${sender} from ${studio} — I work with ${town} businesses on web & marketing.`,
    hook,
    ask,
  ].join(" ");
}

const SERVICE_PITCHES: Record<string, ServicePitch> = {
  "website-design": {
    problems: (l, c) => [
      `No website at all — guests checking ${c.niceName} on Google find a Maps card and nothing else`,
      `Every enquiry has to go through the phone, IG DMs or walk-ins — leads disappear out of hours`,
      `Without a site you don't show up for searches like "${c.cat} in ${c.town}" — competitors with sites do`,
    ],
    impact: (l, c) =>
      `In ${c.town}, ${c.cat}s with even a simple site convert 3-5× more first-time enquiries than the ones living only on Maps. Every week without one is bookings handed to the next result.`,
    fix: () =>
      `A focused 4-section site (hero · what you do · gallery/menu · contact) with WhatsApp button and Maps embed. Launched in ~2 weeks.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Noticed ${c.niceName} doesn't have a website yet — I'd happily put together a quick mock to show what one could look like for you.`,
        `Want me to send it over? Takes me 30 min, costs you nothing.`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `I work with ${c.town} businesses on websites and noticed ${c.niceName} doesn't have one yet. Three things this is costing you:`,
        `A simple website for ${c.niceName}`,
      ),
  },

  "website-redesign": {
    problems: (l, c) => [
      `The current site looks dated next to newer ${c.cat}s in ${c.town} — guests judge in 3 seconds`,
      `Hero doesn't tell visitors what to do — book, call, see menu — so most leave without acting`,
      `Mobile experience is rough and the page feels slow on a phone`,
    ],
    impact: () => `Refreshing a tired site is the single highest-leverage change a local business can make — same traffic, 2-3× the bookings.`,
    fix: () => `A modern visual refresh on the existing structure, mobile-first, sticky call/WhatsApp button, and one clear CTA per section.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Took a quick look at your site — there's a really fast win in just refreshing the homepage and mobile flow.`,
        `Want a 2-min Loom showing exactly what I'd change?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `I work with ${c.town} businesses on website refreshes and spotted three things I'd quietly redesign on yours:`,
        `Quick redesign idea for ${c.niceName}`,
      ),
  },

  "mobile-optimization": {
    problems: (l, c) => [
      `Site isn't optimised for phones — that's where 70%+ of your visitors actually are`,
      `Tap targets are too small and the layout breaks on iPhone-sized screens`,
      `No sticky call / WhatsApp button on mobile, so booking takes too many taps`,
    ],
    impact: () => `A non-responsive site doubles bounce rate and quietly kills the easiest enquiries — guests on the move never call back.`,
    fix: () => `Mobile-first rebuild of the key pages, big tap targets, sticky bottom CTA, and tested on real iPhone + Android.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Pulled up your site on my phone — there are some quick mobile fixes that would seriously bump bookings.`,
        `Mind if I send a 2-min walkthrough?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Your site looks fine on desktop but the phone version is where the real traffic is — and that's where I'd focus:`,
        `Mobile fix for ${c.niceName}`,
      ),
  },

  "seo": {
    problems: (l, c) => [
      `Not ranking for searches like "${c.cat} in ${c.town}" — those are the ones that actually convert`,
      `Pages don't have proper titles or descriptions for Google to read`,
      `No location-specific landing pages telling Google where you operate`,
    ],
    impact: (l, c) => `Local SEO is the cheapest customer-acquisition channel a ${c.cat} has — once it's set up, it pays you forever.`,
    fix: () => `Local SEO setup: optimise titles + meta, schema markup, location pages, and submit to the right local directories.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Quick check — your site isn't showing up for "${c.cat} in ${c.town}" yet. Easy fix.`,
        `Want me to send the 3 changes that would move you up?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `I checked where ${c.niceName} ranks for the searches that actually drive business. Three quick fixes that would change that:`,
        `Local SEO ideas for ${c.niceName}`,
      ),
  },

  "google-business": {
    problems: (l, c) => [
      `Google Business profile is under-built — photos missing, services not listed, hours not maintained`,
      `Posts and offers section sits empty — Google rewards profiles that update weekly`,
      `Reviews aren't being responded to — both Google and customers notice`,
    ],
    impact: () => `Google Business is the #1 source of local leads — a fully-optimised profile typically gets 5-10× the calls of a bare one.`,
    fix: () => `Full GBP audit + setup: photos, services, attributes, FAQ, weekly post template, and a review-reply tone you can re-use.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Looked at ${c.niceName} on Google Maps — the listing is missing some quick wins that get you in the top-3 for "${c.cat} near me".`,
        `Want me to share the checklist?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Most of your new customers find you on Google Maps before they ever see your website. Three quick wins on your Google Business profile:`,
        `Google Maps fix for ${c.niceName}`,
      ),
  },

  "instagram-setup": {
    problems: (l, c) => [
      `No Instagram presence — for a ${c.cat} in ${c.town}, that's where guests check before deciding`,
      `Without a branded IG, Google Maps reviews are doing all the trust-building`,
      `No way to repost guest content, run stories, or appear in location tags`,
    ],
    impact: () => `For hospitality and lifestyle brands in Malta, IG drives 30-50% of new bookings. A blank profile is leaving the door closed.`,
    fix: () => `Branded IG setup: profile, bio, link-in-bio, 9-grid template, highlights for menu/rooms/team, plus a starter month of posts.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Noticed you're not on Instagram — that's the platform people check before booking a ${c.cat} in ${c.town}.`,
        `Happy to put together a free starter pack (bio + first 9 posts). Want me to send it?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `I set up Instagram for ${c.town}-area businesses. ${c.niceName} doesn't have one yet, and here's what that costs:`,
        `Instagram for ${c.niceName}`,
      ),
  },

  "facebook-setup": {
    problems: () => [
      `No Facebook business page (or one that's never updated) — older locals still book through it`,
      `Without a page you can't run Meta ads or appear in Marketplace / local groups`,
      `Reviews and recommendations on Facebook are passing you by`,
    ],
    impact: () => `Facebook is still where the over-35 audience books — and it's the only ad surface that scales paid traffic on a small budget.`,
    fix: () => `Page setup, About + services + hours, weekly post template, integration with Maps and Instagram.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Quick one — couldn't find a Facebook page for ${c.niceName}. For a ${c.cat} in ${c.town}, that's leaving older locals on the table.`,
        `Want a 5-min setup walkthrough?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Most ${c.cat}s in ${c.town} still get a chunk of bookings through Facebook. ${c.niceName} doesn't have a page set up. Three reasons that's costing you:`,
        `Facebook page for ${c.niceName}`,
      ),
  },

  "social-management": {
    problems: () => [
      `Social channels are dormant — last post is months old`,
      `No consistent voice or content rhythm across IG and Facebook`,
      `No way to repurpose one shoot into a month of posts and stories`,
    ],
    impact: () => `Social runs on consistency, not creativity — even 3 posts a week beats a brilliant burst followed by silence.`,
    fix: () => `Monthly content plan: 12 posts + stories, written + scheduled, plus a short brand voice doc so it sounds like you.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Noticed your socials have gone quiet — there's a really lightweight way to keep them active without you having to think about it.`,
        `Want me to share how I'd run a month of content for ${c.niceName}?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Running socials for a ${c.cat} eats more time than it should. Here's how I'd take it off your plate:`,
        `Social content plan for ${c.niceName}`,
      ),
  },

  "content-photo": {
    problems: (l, c) => [
      `Site / socials are using stock photos or low-light phone shots — guests can tell`,
      `No reusable photo library to feed Instagram, the website, and Google posts for the next 6 months`,
      `No short-form video — Reels and TikToks are where ${c.cat}s in ${c.town} are now found`,
    ],
    impact: () => `Photography is the single most copied-from element of your brand — guests' first impression lives or dies on it.`,
    fix: () => `Half-day shoot on location: hero stills, food/space details, team candids, and 6-8 short vertical clips for Reels.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Took a look at your photos — there's a half-day shoot that would carry your IG and site for the next 6 months.`,
        `Want to see the shot list I'd plan for ${c.niceName}?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Photography is what makes a ${c.cat} look bookable online. Here's what I'd shoot for ${c.niceName}:`,
        `Photo + content shoot for ${c.niceName}`,
      ),
  },

  "branding": {
    problems: (l, c) => [
      `No consistent logo, color or type system — site, IG and signage all feel different`,
      `Brand doesn't tell anyone what makes ${c.niceName} different from the next ${c.cat}`,
      `No brand kit means every new flyer, post or sign reinvents the wheel`,
    ],
    impact: () => `Brand consistency is what makes a small business feel premium — same product, double the price tolerance.`,
    fix: () => `Logo system, color palette, type pairing and a one-page brand kit you can hand to any printer or designer.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Quick observation — your brand looks slightly different across site, IG and Maps. Easy fix that lifts the whole thing.`,
        `Want to see how I'd unify it for ${c.niceName}?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Your brand is the cheapest thing to fix and the highest-leverage. Three areas where I'd tighten ${c.niceName}'s identity:`,
        `Branding refresh for ${c.niceName}`,
      ),
  },

  "online-booking": {
    problems: (l, c) => [
      `Bookings rely on phone calls and DMs — guests give up after hours`,
      `No online booking widget on Google Maps or the site, so out-of-hours visits don't convert`,
      `No system to confirm, remind, or recover no-shows`,
    ],
    impact: () => `Around 60% of restaurant / hotel / appointment bookings now happen outside business hours. No online flow = lost.`,
    fix: () => `Online booking widget on the site, a "Reserve" button on Google, automatic SMS confirmations and reminders.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Noticed there's no online booking on your site or Maps profile — easy way to capture the after-hours crowd.`,
        `Want a 2-min walkthrough of how I'd set it up?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Most enquiries to a ${c.cat} now happen on a phone, after-hours. Without online booking they vanish. Here's the fix:`,
        `Online booking for ${c.niceName}`,
      ),
  },

  "ecommerce": {
    problems: () => [
      `No way to buy online — every order is a phone call or DM`,
      `No product catalogue feeding Instagram Shop, Google Shopping or Marketplace`,
      `No payment, shipping or stock system tying it all together`,
    ],
    impact: () => `Even local shops are getting half their orders online now. Without an online store you're invisible to the audience that wants to buy without messaging.`,
    fix: () => `A clean online shop with payment, delivery options, and a product feed that powers IG Shop and Google Shopping.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Noticed there's no online shop yet — for a ${c.cat} in ${c.town}, that's the easiest revenue line to add.`,
        `Want me to send a 2-min Loom on how it would work for you?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Customers now expect to buy without picking up the phone. Here's how I'd set up an online shop for ${c.niceName}:`,
        `Online shop for ${c.niceName}`,
      ),
  },

  "qr-menu": {
    problems: (l, c) => [
      `Menu is on paper or PDF — guests can't see what dishes look like before ordering`,
      `Updating prices or daily specials means reprinting everything`,
      `No way to capture allergens, languages or photos in one tap`,
    ],
    impact: () => `Restaurants on visual digital menus see 20-30% higher average tickets — guests order what they can see.`,
    fix: () => `A fast, image-rich digital menu in your brand, accessed by QR, with allergen tags and EN/IT/MT toggles.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Quick idea — a QR digital menu typically lifts average ticket size 20-30% on a ${c.cat} like ${c.niceName}.`,
        `Want to see a sample one I'd build for you?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Paper menus cost more than they look — here's what swapping to a fast QR menu does for a ${c.cat}:`,
        `QR digital menu for ${c.niceName}`,
      ),
  },

  "google-ads": {
    problems: (l, c) => [
      `Not running Google Ads — high-intent searches like "${c.cat} ${c.town} now" are going to competitors`,
      `Without a tracked campaign there's no way to know what a customer actually costs to acquire`,
      `Branded searches (your name) aren't protected — competitors can bid on them`,
    ],
    impact: (l, c) => `Google Ads on local intent searches usually return 4-8× ad spend for a ${c.cat} that's already established on Maps.`,
    fix: (l, c) => `Tight local-intent campaign: 3-5 keywords, geofenced to ${c.cat}-shoppers in your area, conversion-tracked from day one.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Saw competitors bidding on "${c.cat} in ${c.town}" — there's a really tight Google Ads setup I'd recommend.`,
        `Want me to share the campaign plan?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Google Ads on local intent searches is the highest-ROI channel for a ${c.cat}. Here's how I'd set it up for you:`,
        `Google Ads plan for ${c.niceName}`,
      ),
  },

  "meta-ads": {
    problems: (l, c) => [
      `No Meta ad activity — competitors with even small budgets are reaching your audience daily`,
      `No pixel installed, so no retargeting of people who already visited the site`,
      `No video creative to power Reels and Stories ads, where reach is cheapest`,
    ],
    impact: () => `Even €5/day on a smart Meta retargeting setup brings back 30-40% of website abandoners — pure free money.`,
    fix: () => `Pixel + conversions API setup, retargeting audience, and a starter video ad pack you can run on a small daily budget.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `For a ${c.cat} in ${c.town}, a small Meta retargeting setup typically pays for itself in week 1.`,
        `Want to see the exact setup?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Meta ads on €5-10/day are the cheapest way to keep ${c.niceName} in front of warm visitors. Here's the setup I'd do:`,
        `Meta ads starter for ${c.niceName}`,
      ),
  },

  "reputation": {
    problems: (l, c) => [
      `Review velocity is too low — Google's algorithm rewards businesses getting fresh reviews every week`,
      `Negative reviews aren't being replied to — that's what most browsers actually read`,
      `No system asking happy customers for a review at the right moment`,
    ],
    impact: () => `Going from 4.0 to 4.5 stars typically lifts call-volume from Maps by 25%. Reviews compound.`,
    fix: () => `A simple review-request flow (QR cards, post-visit SMS), reply templates for negatives, and weekly tracking.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Took a look at your reviews — easy way to get more 5-stars coming in weekly without any extra effort.`,
        `Want me to share the system?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Reviews compound — small lifts in average rating drive disproportionate calls from Maps. Three things I'd put in place for ${c.niceName}:`,
        `Reviews system for ${c.niceName}`,
      ),
  },

  "email-marketing": {
    problems: () => [
      `No newsletter — past customers aren't being brought back`,
      `No automated welcome / post-visit / win-back flows`,
      `No incentive to capture emails in the first place (offer, guide, list)`,
    ],
    impact: () => `Email is the highest-ROI channel by a mile — every €1 spent typically returns €30-40 over a year.`,
    fix: () => `Email capture on site + IG, welcome sequence, monthly newsletter template, and a quarterly win-back.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Quick one — there's a really simple email setup that brings 20-30% of past customers back without any ad spend.`,
        `Want the playbook?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `The cheapest customer is one you've already had. Here's how I'd bring them back for ${c.niceName}:`,
        `Email plan for ${c.niceName}`,
      ),
  },

  "whatsapp-business": {
    problems: () => [
      `No WhatsApp Business with proper catalog, hours and quick replies`,
      `No click-to-chat button on the site or Google profile, so messages never start`,
      `No automated greeting / away message — out-of-hours leads cool off`,
    ],
    impact: () => `In Malta, WhatsApp is where bookings actually happen. Removing 1-2 taps on contact moves the conversion needle massively.`,
    fix: () => `WhatsApp Business setup, catalog, quick replies, away message, and a sticky chat button across site + Maps.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Most of your enquiries probably come through WhatsApp — there's a 30-min setup that turns it into a proper booking channel.`,
        `Want me to share it?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `WhatsApp is doing more work for your business than your website. Three quick wins on ${c.niceName}'s WhatsApp setup:`,
        `WhatsApp setup for ${c.niceName}`,
      ),
  },

  "video-reels": {
    problems: (l, c) => [
      `No short-form video on IG / TikTok — ${c.cat}s in ${c.town} are now discovered through Reels`,
      `No reusable B-roll library to clip into ads, posts or website hero`,
      `No content rhythm — even one shoot a month outperforms reactive phone footage`,
    ],
    impact: () => `One Reel that lands can do more for bookings than a month of static posts — Malta's algorithm right now rewards local hospitality content.`,
    fix: () => `Monthly half-day shoot, 8-12 vertical clips edited, captioned, and scheduled across IG / TikTok / Reels.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Reels are the cheapest reach you can get for a ${c.cat} in ${c.town} right now. There's a really simple monthly setup.`,
        `Want to see what it would look like for ${c.niceName}?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Short-form video is the only marketing channel still growing in reach. Here's the monthly setup I'd run for ${c.niceName}:`,
        `Reels plan for ${c.niceName}`,
      ),
  },

  "ai-chatbot": {
    problems: () => [
      `No 24/7 way for guests to ask questions, book or qualify themselves`,
      `Same FAQs (hours, prices, allergens, parking) are being typed by hand every day`,
      `No way to capture out-of-hours intent into a real booking or callback`,
    ],
    impact: () => `An AI chatbot tied to your booking system removes the most expensive cost in your business: your time on repetitive enquiries.`,
    fix: () => `AI chat on site + WhatsApp, trained on your menu / rooms / FAQs, handing off to you only when needed.`,
    whatsapp: (l, c) =>
      whatsappFromTemplate(
        c,
        `Most ${c.cat} owners in ${c.town} spend an hour a day on the same questions. There's a simple AI setup that takes that off your plate.`,
        `Want a 2-min walkthrough?`,
      ),
    email: (l, c, p) =>
      emailFromTemplate(
        c,
        p,
        `Half of your customer-support time is repetitive FAQs. Here's how I'd put a 24/7 AI assistant in front of ${c.niceName}:`,
        `AI assistant for ${c.niceName}`,
      ),
  },
};
