import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

export const runtime = "nodejs";

const KEYS = ["google_places_api_key", "sender_name", "studio_name", "default_location"];

export async function GET() {
  const out: Record<string, string | null> = {};
  for (const k of KEYS) out[k] = getSetting(k);
  // Mask the API key for display purposes; we never send the raw key to the browser.
  if (out.google_places_api_key) {
    const v = out.google_places_api_key;
    out.google_places_api_key = v.length <= 6 ? "••••" : v.slice(0, 4) + "•".repeat(Math.max(4, v.length - 8)) + v.slice(-4);
  }
  return NextResponse.json({
    settings: out,
    env: {
      has_env_key: !!process.env.GOOGLE_PLACES_API_KEY,
      enable_playwright: process.env.ENABLE_PLAYWRIGHT === "true",
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  for (const k of KEYS) {
    if (typeof body[k] === "string") setSetting(k, body[k]);
  }
  return NextResponse.json({ ok: true });
}
