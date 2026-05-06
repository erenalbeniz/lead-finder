import type { Lead } from "./types";

export interface OutreachBundle {
  problems: string[];        // 3 specific website problems
  businessImpact: string;    // why it costs them money
  suggestedFix: string;      // what we'd do
  whatsapp: string;          // short WA message
  email: { subject: string; body: string };
}

const SENDER_DEFAULT = "Eren";
const STUDIO_DEFAULT = "your studio";

/**
 * Builds personalised outreach copy from a Lead's data and detected issues.
 * Copy is intentionally concise, friendly, and specific — not spammy.
 */
export function generateOutreach(lead: Lead, opts?: { senderName?: string; studioName?: string; }): OutreachBundle {
  const sender = opts?.senderName?.trim() || SENDER_DEFAULT;
  const studio = opts?.studioName?.trim() || STUDIO_DEFAULT;

  const issues: string[] = safeIssues(lead.issues_json);
  const problems = pickThreeProblems(lead, issues);

  const cat = (lead.category ?? "business").toLowerCase();
  const town = (lead.location ?? "Malta").split(",")[0].trim();
  const niceName = lead.business_name.trim();
  const ownerLine = lead.owner_name ? `Hi ${lead.owner_name.split(" ")[0]},` : `Hi ${niceName} team,`;

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
