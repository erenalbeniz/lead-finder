import { NextRequest, NextResponse } from "next/server";
import { searchOverpass } from "@/lib/overpass";
import { getLeadByPlaceId } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const category = (body.category ?? "").toString().trim();
    const location = (body.location ?? "").toString().trim();
    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    const hits = await searchOverpass({ category, location, limit: 60 });

    const enriched = hits.map((h) => ({
      ...h,
      already_saved: !!getLeadByPlaceId(h.place_id),
    }));

    return NextResponse.json({
      query: location ? `${category} in ${location}, Malta` : `${category} in Malta`,
      results: enriched,
      source: "openstreetmap",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Search failed" }, { status: 500 });
  }
}
