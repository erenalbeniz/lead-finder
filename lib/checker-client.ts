"use client";

import type { SiteCheckResult, WebsiteStatus } from "./types";

/**
 * Browser-side website checker. Uses a public CORS proxy because browsers
 * block direct cross-origin fetches of arbitrary sites. Best-effort: if the
 * proxy is rate-limited or down, we fall back to "unknown" with a graceful note
 * rather than failing the lead-save flow.
 */

// corsproxy.io is small and free; allorigins is the backup.
const PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

export async function checkWebsiteClient(rawUrl: string | null | undefined): Promise<SiteCheckResult> {
  if (!rawUrl || !rawUrl.trim()) {
    return { status: "none", issues: ["No website at all"], loadMs: null, htmlBytes: null };
  }
  const url = normalize(rawUrl);
  const issues: string[] = [];

  let html = "";
  let loadMs: number | null = null;
  let htmlBytes: number | null = null;
  let fetched = false;

  for (const wrap of PROXIES) {
    const start = performance.now();
    try {
      const res = await fetch(wrap(url), { cache: "no-store" });
      if (!res.ok) continue;
      html = await res.text();
      loadMs = Math.round(performance.now() - start);
      htmlBytes = html.length;
      fetched = true;
      break;
    } catch {
      // try next proxy
    }
  }

  if (!fetched) {
    return {
      status: "unknown",
      issues: ["Couldn't fetch the site through the public CORS proxy — try again later or mark the status manually."],
      loadMs: null,
      htmlBytes: null,
    };
  }

  const lower = html.toLowerCase();

  if (!/<meta[^>]+name=["']?viewport/i.test(html)) {
    issues.push("Not mobile-friendly — no viewport meta tag");
  }

  const hasCTA = /(book|reserve|order|quote|contact|whatsapp|call us|call now)/i.test(lower);
  if (!hasCTA) issues.push("No clear call-to-action (book / contact / order / quote)");

  const hasPhone = /(tel:|wa\.me|whatsapp\.com)/i.test(html) || /\+?\d[\d\s().-]{6,}/.test(html);
  if (!hasPhone) issues.push("Phone number not easy to find on the page");

  const hasWA = /wa\.me|whatsapp/i.test(lower);
  if (!hasWA) issues.push("No WhatsApp button — local Malta market expects one");

  const hasServices = /(services|menu|portfolio|treatments|rooms|gallery|shop)/i.test(lower);
  if (!hasServices) issues.push("No clear services / menu / portfolio section");

  let outdated = false;
  if (/<table[^>]*>[\s\S]{200,}<\/table>/i.test(html) && /<font/i.test(html)) {
    issues.push("Old design indicators (table layouts, <font> tags)");
    outdated = true;
  }
  if (/jquery-1\.\d/i.test(lower)) {
    issues.push("Old design indicators (jQuery 1.x)");
    outdated = true;
  }
  if (/<frameset|<embed[^>]+flash/i.test(lower)) {
    issues.push("Old design indicators (framesets / Flash)");
    outdated = true;
  }
  if (url.startsWith("http://")) {
    issues.push("No HTTPS — modern browsers warn visitors");
    outdated = true;
  }

  if (loadMs && loadMs > 4500) issues.push("Slow initial load (HTML > 4.5s)");
  if (htmlBytes && htmlBytes > 1_500_000) issues.push("Heavy page (HTML > 1.5MB)");

  let status: WebsiteStatus = "modern";
  if (outdated) status = "outdated";
  else if (issues.some((i) => /not mobile/i.test(i))) status = "not_mobile";
  if (issues.length === 0) status = "modern";

  return { status, issues, loadMs, htmlBytes };
}

function normalize(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    return new URL(u).toString();
  } catch {
    return u;
  }
}
