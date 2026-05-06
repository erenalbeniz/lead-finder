import { NextRequest, NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/db";
import { checkWebsite, checkWebsiteDeep } from "@/lib/checker";
import { scoreFromLead } from "@/lib/scoring";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/check
 *  - { url: "https://..." }                → run checker, return result (no DB write)
 *  - { lead_id: 123 }                      → run checker on lead.website, persist results, return updated lead
 *  - { lead_id: 123, deep: true }          → use Playwright if ENABLE_PLAYWRIGHT=true
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const deep = !!body.deep;

  if (body.lead_id) {
    const lead = getLead(Number(body.lead_id));
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    const result = deep ? await checkWebsiteDeep(lead.website) : await checkWebsite(lead.website);
    const updated = updateLead(lead.id, {
      website_status: result.status,
      issues: result.issues,
      last_checked_at: Date.now(),
    });
    if (updated) {
      const score = scoreFromLead(updated);
      const re = updateLead(lead.id, { priority_score: score });
      return NextResponse.json({ lead: re, check: result });
    }
    return NextResponse.json({ check: result });
  }

  if (body.url || body.url === "") {
    const result = deep ? await checkWebsiteDeep(body.url) : await checkWebsite(body.url);
    return NextResponse.json({ check: result });
  }
  return NextResponse.json({ error: "Provide url or lead_id" }, { status: 400 });
}
