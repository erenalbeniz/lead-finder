import { NextRequest, NextResponse } from "next/server";
import { getLead, getSetting, logOutreach } from "@/lib/db";
import { generateOutreach } from "@/lib/outreach";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = Number(body.lead_id);
  const lead = getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const senderName = body.sender_name ?? getSetting("sender_name") ?? undefined;
  const studioName = body.studio_name ?? getSetting("studio_name") ?? undefined;
  const bundle = generateOutreach(lead, { senderName, studioName });

  if (body.log) {
    if (body.log === "whatsapp") logOutreach(id, "whatsapp", bundle.whatsapp);
    if (body.log === "email") logOutreach(id, "email", `${bundle.email.subject}\n\n${bundle.email.body}`);
  }

  return NextResponse.json({ bundle });
}
