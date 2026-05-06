import { NextRequest } from "next/server";
import { listLeads } from "@/lib/db";
import { siteStatusLabel } from "@/lib/utils";

export const runtime = "nodejs";

const HEADERS = [
  "id",
  "business_name",
  "category",
  "location",
  "phone",
  "email",
  "website",
  "google_maps_url",
  "facebook_url",
  "instagram_url",
  "owner_name",
  "website_status",
  "issues",
  "priority_score",
  "outreach_status",
  "rating",
  "user_ratings_total",
  "notes",
  "created_at",
  "updated_at",
  "last_checked_at",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leads = listLeads({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    status: (searchParams.get("status") ?? undefined) as any,
    websiteStatus: (searchParams.get("website_status") ?? undefined) as any,
    minScore: searchParams.get("min_score") ? Number(searchParams.get("min_score")) : undefined,
    sort: (searchParams.get("sort") ?? "score_desc") as any,
    limit: 5000,
  });

  const rows = [HEADERS.join(",")];
  for (const l of leads) {
    let issues: string[] = [];
    try { issues = JSON.parse(l.issues_json); } catch {}
    rows.push(
      [
        l.id,
        l.business_name,
        l.category ?? "",
        l.location ?? "",
        l.phone ?? "",
        l.email ?? "",
        l.website ?? "",
        l.google_maps_url ?? "",
        l.facebook_url ?? "",
        l.instagram_url ?? "",
        l.owner_name ?? "",
        siteStatusLabel(l.website_status),
        issues.join(" | "),
        l.priority_score,
        l.outreach_status,
        l.rating ?? "",
        l.user_ratings_total ?? "",
        (l.notes ?? "").replace(/\s+/g, " "),
        new Date(l.created_at).toISOString(),
        new Date(l.updated_at).toISOString(),
        l.last_checked_at ? new Date(l.last_checked_at).toISOString() : "",
      ].map(csvCell).join(",")
    );
  }

  const csv = rows.join("\n");
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvCell(v: any): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
