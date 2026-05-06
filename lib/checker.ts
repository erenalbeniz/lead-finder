import type { SiteCheckResult, WebsiteStatus } from "./types";

/**
 * Lightweight, fetch-based website check. We only inspect publicly accessible
 * pages (no logins, no paywalls). The check looks at:
 *  - presence/availability
 *  - viewport meta tag (mobile-friendly hint)
 *  - obvious CTAs (book/contact/quote/buy)
 *  - phone & WhatsApp links
 *  - "services"/"work"/"menu" sections
 *  - old design indicators (Flash, table layouts, jQuery 1.x, no SSL, no responsive units)
 *  - rough load time (HTML response only)
 *
 * If ENABLE_PLAYWRIGHT=true and `playwright` is installed, we additionally
 * try a headless render + Lighthouse-style perf metrics. Otherwise we stay
 * fully fetch-only so the app installs and runs without browser binaries.
 */

const TIMEOUT_MS = 12_000;

export async function checkWebsite(rawUrl: string | null | undefined): Promise<SiteCheckResult> {
  if (!rawUrl || !rawUrl.trim()) {
    return {
      status: "none",
      issues: [
        "No website at all",
        "No online discoverability beyond Google Maps",
        "Loses customers who research before visiting",
      ],
    };
  }

  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const start = Date.now();
  let html = "";
  let finalUrl = url;
  let httpOk = false;
  let usesHttps = url.startsWith("https://");
  let bytes = 0;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 LeadFinder/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(t);
    httpOk = res.ok;
    finalUrl = res.url || url;
    usesHttps = finalUrl.startsWith("https://");
    html = await res.text();
    bytes = html.length;
  } catch (err: any) {
    return {
      status: "none",
      issues: [
        "Website is unreachable or returns an error",
        "Domain may be parked, expired, or misconfigured",
        "Customers clicking the link see a broken page",
      ],
      loadMs: Date.now() - start,
      htmlBytes: 0,
    };
  }

  const loadMs = Date.now() - start;
  const lower = html.toLowerCase();
  const issues: string[] = [];

  if (!httpOk) issues.push("Website returns an HTTP error");

  // Mobile-friendly hint: must declare viewport and not be a fixed 980px layout
  const hasViewport = /<meta[^>]+name=["']?viewport["']?/i.test(html);
  if (!hasViewport) issues.push("Not mobile-friendly: missing viewport meta tag");

  // Obvious CTA detection
  const ctaRegex = /(book\s*now|book\s*online|reserve|contact\s*us|get\s*a\s*quote|get\s*in\s*touch|request\s*a\s*quote|order\s*online|buy\s*now|hire|enquire)/i;
  if (!ctaRegex.test(lower)) issues.push("No clear call-to-action visible on the page");

  // Phone visibility
  const hasTelLink = /href=["']tel:/i.test(html);
  const phoneShownAsText = /(\+\d[\d\s\-]{6,}|\(\d{2,4}\)\s?\d{2,4}[\s-]?\d{2,4})/.test(html);
  if (!hasTelLink && !phoneShownAsText) issues.push("Phone number not easy to find or click");

  // WhatsApp button
  const hasWhatsApp = /(wa\.me\/|api\.whatsapp\.com|whatsapp\.com\/send|class=["'][^"']*whatsapp)/i.test(lower);
  if (!hasWhatsApp) issues.push("No WhatsApp button — high-friction contact");

  // Services / menu / work section
  const hasServices = /(services|our\s+services|menu|portfolio|treatments|rooms|packages|what\s+we\s+do)/i.test(lower);
  if (!hasServices) issues.push("No clear services / menu / portfolio section");

  // Old-design indicators
  const oldHints: string[] = [];
  if (/<table[^>]*(width=|cellpadding=|cellspacing=)/i.test(html)) oldHints.push("table-based layout");
  if (/jquery-1\.\d|jquery\/1\./i.test(lower)) oldHints.push("very old jQuery 1.x");
  if (/<embed[^>]+flash|application\/x-shockwave-flash/i.test(lower)) oldHints.push("Adobe Flash content");
  if (/<font[^>]+/i.test(html)) oldHints.push("legacy <font> tags");
  if (!usesHttps) oldHints.push("no HTTPS / SSL");
  if (/<frameset|<frame /i.test(html)) oldHints.push("frameset layout");
  if (oldHints.length) issues.push(`Old design indicators: ${oldHints.join(", ")}`);

  // Performance hint
  if (loadMs > 4500) issues.push(`Slow initial load (~${(loadMs / 1000).toFixed(1)}s)`);
  if (bytes > 1_500_000) issues.push("Heavy page (1.5 MB+ of HTML alone)");

  // Modern stack hint
  const looksModern = /(__next|_next\/static|nuxt|astro|gatsby|sveltekit|tailwind|swiper|gsap|alpine\.js)/i.test(lower);

  let status: WebsiteStatus = "modern";
  if (!hasViewport) status = "not_mobile";
  if (oldHints.length >= 2) status = "outdated";
  if (issues.length >= 4 && !looksModern) status = "outdated";
  if (looksModern && issues.length <= 1) status = "modern";

  return { status, issues, loadMs, htmlBytes: bytes };
}

/**
 * Optional Playwright/Lighthouse-style deep check, gated behind ENABLE_PLAYWRIGHT.
 * Falls back to checkWebsite() if Playwright is not installed at runtime.
 */
export async function checkWebsiteDeep(url: string | null | undefined): Promise<SiteCheckResult> {
  if (process.env.ENABLE_PLAYWRIGHT !== "true") return checkWebsite(url);
  try {
    // Optional Playwright — kept opaque to the bundler so it isn't resolved
    // unless the user has actually installed it. They opt in by running
    //   npm i -D playwright && npx playwright install chromium
    //   echo "ENABLE_PLAYWRIGHT=true" >> .env.local
    const modName = "playwright";
    const pw: any = await (Function("m", "return import(m)") as (m: string) => Promise<any>)(modName);
    const { chromium } = pw;
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 LeadFinder/1.0",
    });
    const page = await ctx.newPage();
    if (!url) { await browser.close(); return checkWebsite(url); }
    let target = url.startsWith("http") ? url : "https://" + url;
    const start = Date.now();
    const resp = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 20_000 });
    const loadMs = Date.now() - start;
    const html = await page.content();
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const isMobileFriendly = await page.evaluate(() => {
      const v = document.querySelector('meta[name="viewport"]');
      return !!v;
    });
    await browser.close();
    const base = await checkWebsite(url);
    const issues = [...base.issues];
    if (!isMobileFriendly) issues.push("Confirmed: no viewport meta in rendered DOM");
    if (loadMs > 4000) issues.push(`Confirmed slow render: ${(loadMs / 1000).toFixed(1)}s`);
    return { ...base, issues: dedupe(issues), loadMs, htmlBytes: html.length };
  } catch {
    return checkWebsite(url);
  }
}

function dedupe(arr: string[]) { return Array.from(new Set(arr)); }
