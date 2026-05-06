import type { Lead, WebsiteStatus } from "./types";

export interface ScoringInput {
  website_status: WebsiteStatus;
  issues: string[];
  rating?: number | null;
  user_ratings_total?: number | null;
  has_phone?: boolean;
  has_email?: boolean;
  has_socials?: boolean;
  category?: string | null;
}

/**
 * Priority score 1-10. Higher = more likely to need our help and more reachable.
 * Drivers:
 *  - Website status (no website / outdated → big boost)
 *  - Issue count
 *  - Reachability (phone/email/socials)
 *  - Business activity (Google rating + review count)
 */
export function computeScore(input: ScoringInput): number {
  let score = 1;

  switch (input.website_status) {
    case "none": score += 5; break;
    case "outdated": score += 3.5; break;
    case "not_mobile": score += 3; break;
    case "modern": score += 0.5; break;
    case "unknown": score += 1.5; break;
  }

  const issueCount = Math.min(input.issues.length, 6);
  score += issueCount * 0.4;

  let reachability = 0;
  if (input.has_phone) reachability += 0.6;
  if (input.has_email) reachability += 0.6;
  if (input.has_socials) reachability += 0.4;
  score += reachability;

  // Active business signal: many reviews → real revenue → can afford a website
  const reviews = input.user_ratings_total ?? 0;
  if (reviews > 200) score += 1.2;
  else if (reviews > 50) score += 0.8;
  else if (reviews > 10) score += 0.4;

  const rating = input.rating ?? 0;
  if (rating >= 4.3) score += 0.4;
  else if (rating >= 3.8) score += 0.2;

  // Categories that almost always need a polished site
  const cat = (input.category ?? "").toLowerCase();
  const highValue = ["restaurant", "bar", "cafe", "hotel", "spa", "salon", "dentist", "lawyer", "real estate", "clinic", "gym"];
  if (highValue.some((k) => cat.includes(k))) score += 0.6;

  return Math.max(1, Math.min(10, Math.round(score)));
}

export function scoreFromLead(l: Lead): number {
  let issues: string[] = [];
  try { issues = JSON.parse(l.issues_json); } catch { /* ignore */ }
  return computeScore({
    website_status: l.website_status,
    issues,
    rating: l.rating,
    user_ratings_total: l.user_ratings_total,
    has_phone: !!l.phone,
    has_email: !!l.email,
    has_socials: !!(l.facebook_url || l.instagram_url),
    category: l.category,
  });
}
