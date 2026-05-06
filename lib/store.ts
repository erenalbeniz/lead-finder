"use client";

import type { Lead, LeadInput, OutreachStatus, WebsiteStatus } from "./types";

/**
 * Browser localStorage-backed data store.
 * Drop-in replacement for the old SQLite-based lib/db.ts when running as a
 * static GitHub Pages site. All data lives in this browser only.
 */

const KEYS = {
  leads: "lf:leads",
  outreach: "lf:outreach",
  settings: "lf:settings",
  nextId: "lf:nextId",
  nextOutreachId: "lf:nextOutreachId",
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function nextId(key: string): number {
  const cur = read<number>(key, 0) + 1;
  write(key, cur);
  return cur;
}

// ---------- Settings ----------
type Settings = Record<string, string>;

export function getSetting(key: string): string | null {
  const all = read<Settings>(KEYS.settings, {});
  return all[key] ?? null;
}

export function setSetting(key: string, value: string) {
  const all = read<Settings>(KEYS.settings, {});
  all[key] = value;
  write(KEYS.settings, all);
}

export function getAllSettings(): Settings {
  return read<Settings>(KEYS.settings, {});
}

// ---------- Leads ----------
export function listLeads(filters: {
  q?: string;
  category?: string;
  location?: string;
  status?: OutreachStatus | "all";
  websiteStatus?: WebsiteStatus | "all";
  minScore?: number;
  maxScore?: number;
  sort?: "score_desc" | "score_asc" | "recent" | "name";
  limit?: number;
  offset?: number;
} = {}): Lead[] {
  let items = read<Lead[]>(KEYS.leads, []);

  if (filters.q) {
    const q = filters.q.toLowerCase();
    items = items.filter(
      (l) =>
        l.business_name.toLowerCase().includes(q) ||
        (l.category ?? "").toLowerCase().includes(q) ||
        (l.location ?? "").toLowerCase().includes(q)
    );
  }
  if (filters.category && filters.category !== "all") {
    items = items.filter((l) => l.category === filters.category);
  }
  if (filters.location && filters.location !== "all") {
    items = items.filter((l) =>
      (l.location ?? "").toLowerCase().includes(filters.location!.toLowerCase())
    );
  }
  if (filters.status && filters.status !== "all") {
    items = items.filter((l) => l.outreach_status === filters.status);
  }
  if (filters.websiteStatus && filters.websiteStatus !== "all") {
    items = items.filter((l) => l.website_status === filters.websiteStatus);
  }
  if (filters.minScore != null) {
    items = items.filter((l) => l.priority_score >= filters.minScore!);
  }
  if (filters.maxScore != null) {
    items = items.filter((l) => l.priority_score <= filters.maxScore!);
  }

  switch (filters.sort) {
    case "score_asc":
      items.sort((a, b) => a.priority_score - b.priority_score || b.updated_at - a.updated_at);
      break;
    case "recent":
      items.sort((a, b) => b.updated_at - a.updated_at);
      break;
    case "name":
      items.sort((a, b) => a.business_name.localeCompare(b.business_name));
      break;
    default:
      items.sort((a, b) => b.priority_score - a.priority_score || b.updated_at - a.updated_at);
  }

  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 200;
  return items.slice(offset, offset + limit);
}

export function getLead(id: number): Lead | null {
  return read<Lead[]>(KEYS.leads, []).find((l) => l.id === id) ?? null;
}

export function getLeadByPlaceId(placeId: string): Lead | null {
  return read<Lead[]>(KEYS.leads, []).find((l) => l.place_id === placeId) ?? null;
}

export function upsertLead(input: LeadInput): Lead {
  const now = Date.now();
  const issues_json = JSON.stringify(input.issues ?? []);
  const items = read<Lead[]>(KEYS.leads, []);

  if (input.place_id) {
    const idx = items.findIndex((l) => l.place_id === input.place_id);
    if (idx >= 0) {
      const existing = items[idx];
      const merged: Lead = {
        ...existing,
        business_name: input.business_name ?? existing.business_name,
        category: input.category ?? existing.category,
        location: input.location ?? existing.location,
        phone: input.phone ?? existing.phone,
        email: input.email ?? existing.email,
        website: input.website ?? existing.website,
        google_maps_url: input.google_maps_url ?? existing.google_maps_url,
        facebook_url: input.facebook_url ?? existing.facebook_url,
        instagram_url: input.instagram_url ?? existing.instagram_url,
        owner_name: input.owner_name ?? existing.owner_name,
        website_status: input.website_status ?? existing.website_status,
        issues_json: input.issues ? issues_json : existing.issues_json,
        priority_score: input.priority_score ?? existing.priority_score,
        outreach_status: input.outreach_status ?? existing.outreach_status,
        notes: input.notes ?? existing.notes,
        rating: input.rating ?? existing.rating,
        user_ratings_total: input.user_ratings_total ?? existing.user_ratings_total,
        lat: input.lat ?? existing.lat,
        lng: input.lng ?? existing.lng,
        last_checked_at: input.last_checked_at ?? existing.last_checked_at,
        updated_at: now,
      };
      items[idx] = merged;
      write(KEYS.leads, items);
      return merged;
    }
  }

  const lead: Lead = {
    id: nextId(KEYS.nextId),
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
    issues_json,
    priority_score: input.priority_score ?? 0,
    outreach_status: input.outreach_status ?? "new",
    notes: input.notes ?? null,
    rating: input.rating ?? null,
    user_ratings_total: input.user_ratings_total ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    created_at: now,
    updated_at: now,
    last_checked_at: input.last_checked_at ?? null,
  };
  items.push(lead);
  write(KEYS.leads, items);
  return lead;
}

export function updateLead(id: number, patch: Partial<Lead> & { issues?: string[] }): Lead | null {
  const items = read<Lead[]>(KEYS.leads, []);
  const idx = items.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  const existing = items[idx];
  const issues_json = patch.issues ? JSON.stringify(patch.issues) : existing.issues_json;
  const merged: Lead = {
    ...existing,
    ...stripUndefined({
      business_name: patch.business_name,
      category: patch.category,
      location: patch.location,
      phone: patch.phone,
      email: patch.email,
      website: patch.website,
      google_maps_url: patch.google_maps_url,
      facebook_url: patch.facebook_url,
      instagram_url: patch.instagram_url,
      owner_name: patch.owner_name,
      website_status: patch.website_status,
      issues_json,
      priority_score: patch.priority_score,
      outreach_status: patch.outreach_status,
      notes: patch.notes,
      rating: patch.rating,
      user_ratings_total: patch.user_ratings_total,
      lat: patch.lat,
      lng: patch.lng,
      last_checked_at: patch.last_checked_at,
    }),
    updated_at: Date.now(),
  };
  items[idx] = merged;
  write(KEYS.leads, items);
  return merged;
}

export function deleteLead(id: number) {
  const items = read<Lead[]>(KEYS.leads, []);
  write(
    KEYS.leads,
    items.filter((l) => l.id !== id)
  );
  // Also purge outreach log
  const log = read<OutreachLogEntry[]>(KEYS.outreach, []);
  write(
    KEYS.outreach,
    log.filter((o) => o.lead_id !== id)
  );
}

export function leadStats() {
  const items = read<Lead[]>(KEYS.leads, []);
  const t = {
    total: items.length,
    new_count: 0,
    contacted_count: 0,
    replied_count: 0,
    interested_count: 0,
    closed_count: 0,
    rejected_count: 0,
    avg_score: 0,
    hot_count: 0,
    no_website_count: 0,
    outdated_count: 0,
    modern_count: 0,
  };
  let scoreSum = 0;
  for (const l of items) {
    scoreSum += l.priority_score;
    if (l.outreach_status === "new") t.new_count++;
    else if (l.outreach_status === "contacted") t.contacted_count++;
    else if (l.outreach_status === "replied") t.replied_count++;
    else if (l.outreach_status === "interested") t.interested_count++;
    else if (l.outreach_status === "closed") t.closed_count++;
    else if (l.outreach_status === "rejected") t.rejected_count++;
    if (l.priority_score >= 8) t.hot_count++;
    if (l.website_status === "none") t.no_website_count++;
    else if (l.website_status === "outdated") t.outdated_count++;
    else if (l.website_status === "modern") t.modern_count++;
  }
  t.avg_score = items.length ? scoreSum / items.length : 0;

  const catMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  for (const l of items) {
    const c = l.category ?? "Uncategorized";
    catMap.set(c, (catMap.get(c) ?? 0) + 1);
    statusMap.set(l.outreach_status, (statusMap.get(l.outreach_status) ?? 0) + 1);
  }
  const byCategory = Array.from(catMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const byStatus = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));

  const byScore = Array.from({ length: 10 }, (_, bucket) => ({
    score: bucket,
    count: items.filter((l) => l.priority_score >= bucket && l.priority_score < bucket + 1).length,
  }));

  const days = 14;
  const dayMs = 86_400_000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activity: { day: string; created: number; checked: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = today.getTime() - i * dayMs;
    const end = start + dayMs;
    const created = items.filter((l) => l.created_at >= start && l.created_at < end).length;
    const checked = items.filter(
      (l) => l.last_checked_at != null && l.last_checked_at >= start && l.last_checked_at < end
    ).length;
    activity.push({
      day: new Date(start).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      created,
      checked,
    });
  }

  return { totals: t, byCategory, byStatus, byScore, activity };
}

export function distinctCategories(): string[] {
  const items = read<Lead[]>(KEYS.leads, []);
  return Array.from(new Set(items.map((l) => l.category).filter(Boolean) as string[])).sort();
}

export function distinctLocations(): string[] {
  const items = read<Lead[]>(KEYS.leads, []);
  return Array.from(new Set(items.map((l) => l.location).filter(Boolean) as string[])).sort();
}

// ---------- Outreach log ----------
export interface OutreachLogEntry {
  id: number;
  lead_id: number;
  channel: string;
  message: string;
  created_at: number;
}

export function logOutreach(lead_id: number, channel: string, message: string) {
  const log = read<OutreachLogEntry[]>(KEYS.outreach, []);
  log.push({ id: nextId(KEYS.nextOutreachId), lead_id, channel, message, created_at: Date.now() });
  write(KEYS.outreach, log);
}

export function listOutreachLog(lead_id: number): OutreachLogEntry[] {
  return read<OutreachLogEntry[]>(KEYS.outreach, [])
    .filter((o) => o.lead_id === lead_id)
    .sort((a, b) => b.created_at - a.created_at);
}

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}
