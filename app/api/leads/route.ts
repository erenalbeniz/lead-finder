import { NextRequest, NextResponse } from "next/server";
import {
  distinctCategories,
  distinctLocations,
  leadStats,
  listLeads,
  upsertLead,
} from "@/lib/db";
import { computeScore } from "@/lib/scoring";
import type { OutreachStatus, WebsiteStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stats = searchParams.get("stats") === "1";
  if (stats) {
    return NextResponse.json({
      stats: leadStats(),
      categories: distinctCategories(),
      locations: distinctLocations(),
    });
  }

  const filters = {
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    status: (searchParams.get("status") ?? undefined) as OutreachStatus | "all" | undefined,
    websiteStatus: (searchParams.get("website_status") ?? undefined) as WebsiteStatus | "all" | undefined,
    minScore: searchParams.get("min_score") ? Number(searchParams.get("min_score")) : undefined,
    maxScore: searchParams.get("max_score") ? Number(searchParams.get("max_score")) : undefined,
    sort: (searchParams.get("sort") ?? "score_desc") as any,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    offset: searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined,
  };

  const leads = listLeads(filters);
  return NextResponse.json({
    leads,
    categories: distinctCategories(),
    locations: distinctLocations(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // body: { leads: LeadInput[] }  OR  a single lead
  const inputs: any[] = Array.isArray(body?.leads) ? body.leads : [body];
  const saved = inputs.map((input) => {
    const score =
      input.priority_score ??
      computeScore({
        website_status: (input.website_status as WebsiteStatus) ?? "unknown",
        issues: input.issues ?? [],
        rating: input.rating,
        user_ratings_total: input.user_ratings_total,
        has_phone: !!input.phone,
        has_email: !!input.email,
        has_socials: !!(input.facebook_url || input.instagram_url),
        category: input.category,
      });
    return upsertLead({ ...input, priority_score: score });
  });
  return NextResponse.json({ saved, count: saved.length });
}
