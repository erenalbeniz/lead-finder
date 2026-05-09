"use client";

import type { Lead, LeadInput, OutreachStatus, SearchHit, WebsiteStatus } from "./types";
import {
  deleteLead,
  distinctCategories,
  distinctLocations,
  getLead,
  getLeadByPlaceId,
  leadStats,
  listLeads,
  listOutreachLog,
  logOutreach,
  upsertLead,
  updateLead,
  getAllSettings,
  setSetting,
} from "./store";
import { searchOverpass as searchOverpassClient } from "./overpass";
import { checkWebsiteClient } from "./checker-client";
import { generateOutreach } from "./outreach";
import { scoreFromLead } from "./scoring";
import { findService } from "./services";

/**
 * Drop-in replacement for the previous `/api/*` HTTP routes — same return
 * shapes, but everything runs in the browser. Pages call these directly
 * instead of going through fetch().
 */

interface SearchHitEnriched extends SearchHit {
  email?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  already_saved?: boolean;
}

export async function apiSearch(opts: { category: string; location?: string }): Promise<{
  query: string;
  results: SearchHitEnriched[];
  source: string;
}> {
  const cat = (opts.category ?? "").trim();
  if (!cat) throw new Error("category is required");
  const hits = await searchOverpassClient({ category: cat, location: opts.location, limit: 60 });
  const enriched = hits.map((h) => ({
    ...(h as SearchHitEnriched),
    already_saved: !!getLeadByPlaceId(h.place_id),
  }));
  return {
    query: opts.location ? `${cat} in ${opts.location}, Malta` : `${cat} in Malta`,
    results: enriched,
    source: "openstreetmap",
  };
}

export interface ListLeadsParams {
  q?: string;
  category?: string;
  location?: string;
  status?: OutreachStatus | "all";
  website_status?: WebsiteStatus | "all";
  min_score?: number;
  sort?: "score_desc" | "score_asc" | "recent" | "name";
  limit?: number;
  stats?: boolean;
}

export function apiLeadsList(params: ListLeadsParams): {
  leads: Lead[];
  categories: string[];
  locations: string[];
} {
  const leads = listLeads({
    q: params.q,
    category: params.category,
    location: params.location,
    status: params.status,
    websiteStatus: params.website_status,
    minScore: params.min_score,
    sort: params.sort,
    limit: params.limit ?? 200,
  });
  return {
    leads,
    categories: distinctCategories(),
    locations: distinctLocations(),
  };
}

export function apiLeadsStats() {
  return { stats: leadStats() };
}

export function apiLeadCreate(input: LeadInput): { lead: Lead } {
  const placeholder: Lead = {
    id: 0,
    place_id: input.place_id ?? null,
    business_name: input.business_name,
    category: input.category ?? null,
    location: input.location ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    website: input.website ?? null,
    google_maps_url: input.google_maps_url ?? null,
    facebook_url: input.facebook_url ?? null,
    instagram_url: input.instagram_url ?? null,
    owner_name: input.owner_name ?? null,
    website_status: input.website_status ?? "unknown",
    issues_json: JSON.stringify(input.issues ?? []),
    priority_score: 0,
    outreach_status: input.outreach_status ?? "new",
    notes: input.notes ?? null,
    rating: input.rating ?? null,
    user_ratings_total: input.user_ratings_total ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    created_at: 0,
    updated_at: 0,
    last_checked_at: input.last_checked_at ?? null,
    service_id: input.service_id ?? null,
  };
  const score = scoreFromLead(placeholder);
  const lead = upsertLead({ ...input, priority_score: score });
  return { lead };
}

export function apiLeadGet(id: number): { lead: Lead | null; outreach: ReturnType<typeof listOutreachLog> } {
  const lead = getLead(id);
  if (!lead) return { lead: null, outreach: [] };
  return { lead, outreach: listOutreachLog(id) };
}

export function apiLeadUpdate(id: number, patch: Partial<Lead> & { issues?: string[] }): { lead: Lead | null } {
  const updated = updateLead(id, patch);
  if (!updated) return { lead: null };
  // Recompute priority score after material changes.
  const rescored = updateLead(id, { priority_score: scoreFromLead(updated) });
  return { lead: rescored };
}

export function apiLeadDelete(id: number) {
  deleteLead(id);
  return { ok: true };
}

export async function apiCheck(args: {
  url?: string;
  lead_id?: number;
}): Promise<{ check: { status: WebsiteStatus; issues: string[] }; lead?: Lead | null }> {
  let target = args.url ?? "";
  if (args.lead_id != null) {
    const lead = getLead(args.lead_id);
    target = lead?.website ?? "";
  }
  const result = await checkWebsiteClient(target);
  let lead: Lead | null = null;
  if (args.lead_id != null) {
    lead = updateLead(args.lead_id, {
      website_status: result.status,
      issues: result.issues,
      last_checked_at: Date.now(),
    });
    if (lead) {
      lead = updateLead(args.lead_id, { priority_score: scoreFromLead(lead) });
    }
  }
  return { check: { status: result.status, issues: result.issues }, lead };
}

export function apiOutreach(args: { lead_id: number; log?: "whatsapp" | "email" | "draft"; service_id?: string | null }) {
  const lead = getLead(args.lead_id);
  if (!lead) throw new Error("Lead not found");
  const settings = getAllSettings();
  const serviceId = args.service_id ?? lead.service_id ?? null;
  const service = findService(serviceId);
  const bundle = generateOutreach(lead, {
    senderName: settings.sender_name,
    studioName: settings.studio_name,
    service,
  });
  if (args.log === "whatsapp") logOutreach(args.lead_id, "whatsapp", bundle.whatsapp);
  if (args.log === "email") logOutreach(args.lead_id, "email", `${bundle.email.subject}\n\n${bundle.email.body}`);
  if (args.log === "draft") {
    const tag = service ? ` (${service.label})` : "";
    logOutreach(
      args.lead_id,
      `draft-email${tag}`,
      `${bundle.email.subject}\n\n${bundle.email.body}`,
    );
    logOutreach(args.lead_id, `draft-whatsapp${tag}`, bundle.whatsapp);
  }
  return { bundle };
}

export function apiSettingsGet() {
  const all = getAllSettings();
  return {
    settings: {
      google_places_api_key: null,
      sender_name: all.sender_name ?? null,
      studio_name: all.studio_name ?? null,
      default_location: all.default_location ?? null,
    },
    env: { has_env_key: false, enable_playwright: false },
  };
}

export function apiSettingsSet(payload: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === "string") setSetting(k, v);
  }
  return { ok: true };
}

export function apiExport(filters: ListLeadsParams) {
  const { leads } = apiLeadsList({ ...filters, limit: 5000 });
  const headers = [
    "id", "business_name", "category", "location", "phone", "email", "website",
    "facebook_url", "instagram_url", "owner_name", "website_status",
    "priority_score", "outreach_status", "rating", "user_ratings_total",
    "issues", "notes", "google_maps_url", "created_at", "updated_at", "last_checked_at",
  ];
  const rows = leads.map((l) => {
    let issues: string[] = [];
    try { issues = JSON.parse(l.issues_json); } catch { /* ignore */ }
    return [
      l.id, l.business_name, l.category, l.location, l.phone, l.email, l.website,
      l.facebook_url, l.instagram_url, l.owner_name, l.website_status,
      l.priority_score, l.outreach_status, l.rating, l.user_ratings_total,
      issues.join(" | "), l.notes, l.google_maps_url,
      l.created_at ? new Date(l.created_at).toISOString() : "",
      l.updated_at ? new Date(l.updated_at).toISOString() : "",
      l.last_checked_at ? new Date(l.last_checked_at).toISOString() : "",
    ];
  });
  const csv = [headers, ...rows].map((r) => r.map(csvField).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvField(v: any): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
