import { NextRequest, NextResponse } from "next/server";
import { deleteLead, getLead, listOutreachLog, updateLead } from "@/lib/db";
import { scoreFromLead } from "@/lib/scoring";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const lead = getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead, outreach: listOutreachLog(id) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const patch = await req.json();
  const updated = updateLead(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Recompute score if checker-affecting fields changed
  if (patch.website_status || patch.issues || patch.rating || patch.user_ratings_total) {
    updateLead(id, { priority_score: scoreFromLead(updated) });
  }
  return NextResponse.json({ lead: getLead(id) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  deleteLead(id);
  return NextResponse.json({ ok: true });
}
