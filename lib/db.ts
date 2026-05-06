import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import type { Lead, LeadInput, OutreachStatus, WebsiteStatus } from "./types";

const DATA_DIR = process.env.LEADFINDER_DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "leads.db");

let _db: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (_db) return _db;
  const d = new DatabaseSync(DB_PATH);
  d.exec("PRAGMA journal_mode = WAL;");
  d.exec("PRAGMA foreign_keys = ON;");
  init(d);
  _db = d;
  return d;
}

function init(d: DatabaseSync) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT UNIQUE,
      business_name TEXT NOT NULL,
      category TEXT,
      location TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      google_maps_url TEXT,
      facebook_url TEXT,
      instagram_url TEXT,
      owner_name TEXT,
      website_status TEXT NOT NULL DEFAULT 'unknown',
      issues_json TEXT NOT NULL DEFAULT '[]',
      priority_score INTEGER NOT NULL DEFAULT 0,
      outreach_status TEXT NOT NULL DEFAULT 'new',
      notes TEXT,
      rating REAL,
      user_ratings_total INTEGER,
      lat REAL,
      lng REAL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_checked_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(outreach_status);
    CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(priority_score DESC);
    CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
    CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(location);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS outreach_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      channel TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_outreach_lead ON outreach_log(lead_id);
  `);
}

// node:sqlite returns SQL NULL as `null`; numeric INTEGER as number/bigint.
// We normalize bigint -> number for our purposes (no row counts will exceed safe int).
function rowsAsLeads(rows: any[]): Lead[] {
  return rows.map((r) => normalizeLead(r));
}
function normalizeLead(r: any): Lead {
  return {
    ...r,
    id: Number(r.id),
    priority_score: Number(r.priority_score ?? 0),
    user_ratings_total: r.user_ratings_total == null ? null : Number(r.user_ratings_total),
    rating: r.rating == null ? null : Number(r.rating),
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
    last_checked_at: r.last_checked_at == null ? null : Number(r.last_checked_at),
  } as Lead;
}

// ---------- Settings ----------
export function getSetting(key: string): string | null {
  const row = db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db()
    .prepare(
      "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(key, value);
}

export function getApiKey(): string | null {
  return getSetting("google_places_api_key") ?? process.env.GOOGLE_PLACES_API_KEY ?? null;
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
  const where: string[] = [];
  const params: any[] = [];

  if (filters.q) {
    where.push("(business_name LIKE ? OR category LIKE ? OR location LIKE ?)");
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }
  if (filters.category && filters.category !== "all") {
    where.push("category = ?");
    params.push(filters.category);
  }
  if (filters.location && filters.location !== "all") {
    where.push("location LIKE ?");
    params.push(`%${filters.location}%`);
  }
  if (filters.status && filters.status !== "all") {
    where.push("outreach_status = ?");
    params.push(filters.status);
  }
  if (filters.websiteStatus && filters.websiteStatus !== "all") {
    where.push("website_status = ?");
    params.push(filters.websiteStatus);
  }
  if (filters.minScore != null) {
    where.push("priority_score >= ?");
    params.push(filters.minScore);
  }
  if (filters.maxScore != null) {
    where.push("priority_score <= ?");
    params.push(filters.maxScore);
  }

  let orderBy = "priority_score DESC, updated_at DESC";
  if (filters.sort === "score_asc") orderBy = "priority_score ASC, updated_at DESC";
  if (filters.sort === "recent") orderBy = "updated_at DESC";
  if (filters.sort === "name") orderBy = "business_name ASC";

  const sql = `SELECT * FROM leads ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
  params.push(filters.limit ?? 200, filters.offset ?? 0);
  return rowsAsLeads(db().prepare(sql).all(...params) as any[]);
}

export function getLead(id: number): Lead | null {
  const row = db().prepare("SELECT * FROM leads WHERE id = ?").get(id) as any;
  return row ? normalizeLead(row) : null;
}

export function getLeadByPlaceId(placeId: string): Lead | null {
  const row = db().prepare("SELECT * FROM leads WHERE place_id = ?").get(placeId) as any;
  return row ? normalizeLead(row) : null;
}

export function upsertLead(input: LeadInput): Lead {
  const now = Date.now();
  const issuesJson = JSON.stringify(input.issues ?? []);
  if (input.place_id) {
    const existing = getLeadByPlaceId(input.place_id);
    if (existing) {
      const merged: Lead = {
        ...existing,
        ...stripUndefined({
          business_name: input.business_name,
          category: input.category,
          location: input.location,
          phone: input.phone ?? existing.phone,
          email: input.email ?? existing.email,
          website: input.website ?? existing.website,
          google_maps_url: input.google_maps_url ?? existing.google_maps_url,
          facebook_url: input.facebook_url ?? existing.facebook_url,
          instagram_url: input.instagram_url ?? existing.instagram_url,
          owner_name: input.owner_name ?? existing.owner_name,
          website_status: input.website_status ?? existing.website_status,
          issues_json: input.issues ? issuesJson : existing.issues_json,
          priority_score: input.priority_score ?? existing.priority_score,
          outreach_status: input.outreach_status ?? existing.outreach_status,
          notes: input.notes ?? existing.notes,
          rating: input.rating ?? existing.rating,
          user_ratings_total: input.user_ratings_total ?? existing.user_ratings_total,
          lat: input.lat ?? existing.lat,
          lng: input.lng ?? existing.lng,
          last_checked_at: input.last_checked_at ?? existing.last_checked_at,
        }),
        updated_at: now,
      };
      db()
        .prepare(
          `UPDATE leads SET business_name = :business_name, category = :category, location = :location,
           phone = :phone, email = :email, website = :website, google_maps_url = :google_maps_url,
           facebook_url = :facebook_url, instagram_url = :instagram_url, owner_name = :owner_name,
           website_status = :website_status, issues_json = :issues_json, priority_score = :priority_score,
           outreach_status = :outreach_status, notes = :notes, rating = :rating,
           user_ratings_total = :user_ratings_total, lat = :lat, lng = :lng,
           updated_at = :updated_at, last_checked_at = :last_checked_at WHERE id = :id`
        )
        .run(toBindable(merged));
      return getLead(merged.id)!;
    }
  }

  const result = db()
    .prepare(
      `INSERT INTO leads (place_id, business_name, category, location, phone, email, website,
        google_maps_url, facebook_url, instagram_url, owner_name, website_status, issues_json,
        priority_score, outreach_status, notes, rating, user_ratings_total, lat, lng,
        created_at, updated_at, last_checked_at)
       VALUES (:place_id, :business_name, :category, :location, :phone, :email, :website,
        :google_maps_url, :facebook_url, :instagram_url, :owner_name, :website_status, :issues_json,
        :priority_score, :outreach_status, :notes, :rating, :user_ratings_total, :lat, :lng,
        :created_at, :updated_at, :last_checked_at)`
    )
    .run(
      toBindable({
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
        issues_json: issuesJson,
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
      })
    );
  return getLead(Number(result.lastInsertRowid))!;
}

export function updateLead(id: number, patch: Partial<Lead> & { issues?: string[] }) {
  const existing = getLead(id);
  if (!existing) return null;
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
  db()
    .prepare(
      `UPDATE leads SET business_name = :business_name, category = :category, location = :location,
       phone = :phone, email = :email, website = :website, google_maps_url = :google_maps_url,
       facebook_url = :facebook_url, instagram_url = :instagram_url, owner_name = :owner_name,
       website_status = :website_status, issues_json = :issues_json, priority_score = :priority_score,
       outreach_status = :outreach_status, notes = :notes, rating = :rating,
       user_ratings_total = :user_ratings_total, lat = :lat, lng = :lng,
       updated_at = :updated_at, last_checked_at = :last_checked_at WHERE id = :id`
    )
    .run(toBindable(merged));
  return getLead(id);
}

export function deleteLead(id: number) {
  return db().prepare("DELETE FROM leads WHERE id = ?").run(id);
}

export function leadStats() {
  const totals = db()
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN outreach_status = 'new' THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN outreach_status = 'contacted' THEN 1 ELSE 0 END) AS contacted_count,
        SUM(CASE WHEN outreach_status = 'replied' THEN 1 ELSE 0 END) AS replied_count,
        SUM(CASE WHEN outreach_status = 'interested' THEN 1 ELSE 0 END) AS interested_count,
        SUM(CASE WHEN outreach_status = 'closed' THEN 1 ELSE 0 END) AS closed_count,
        SUM(CASE WHEN outreach_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
        AVG(priority_score) AS avg_score,
        SUM(CASE WHEN priority_score >= 8 THEN 1 ELSE 0 END) AS hot_count,
        SUM(CASE WHEN website_status = 'none' THEN 1 ELSE 0 END) AS no_website_count,
        SUM(CASE WHEN website_status = 'outdated' THEN 1 ELSE 0 END) AS outdated_count,
        SUM(CASE WHEN website_status = 'modern' THEN 1 ELSE 0 END) AS modern_count
      FROM leads`
    )
    .get() as Record<string, any>;

  // node:sqlite may return numerics as bigint; normalize.
  const t: Record<string, number> = {};
  for (const [k, v] of Object.entries(totals ?? {})) t[k] = v == null ? 0 : Number(v);

  const byCategory = (db()
    .prepare(
      "SELECT COALESCE(category, 'Uncategorized') AS name, COUNT(*) AS value FROM leads GROUP BY category ORDER BY value DESC LIMIT 8"
    )
    .all() as any[]).map((r) => ({ name: String(r.name), value: Number(r.value) }));

  const byStatus = (db()
    .prepare("SELECT outreach_status AS name, COUNT(*) AS value FROM leads GROUP BY outreach_status")
    .all() as any[]).map((r) => ({ name: String(r.name), value: Number(r.value) }));

  const byScore = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((bucket) => {
    const row = db()
      .prepare(
        "SELECT COUNT(*) AS c FROM leads WHERE priority_score >= ? AND priority_score < ?"
      )
      .get(bucket, bucket + 1) as any;
    return { score: bucket, count: Number(row?.c ?? 0) };
  });

  const days = 14;
  const dayMs = 86_400_000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activity: { day: string; created: number; checked: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = today.getTime() - i * dayMs;
    const end = start + dayMs;
    const created = Number(
      (db().prepare("SELECT COUNT(*) AS c FROM leads WHERE created_at >= ? AND created_at < ?").get(start, end) as any)?.c ?? 0
    );
    const checked = Number(
      (db().prepare("SELECT COUNT(*) AS c FROM leads WHERE last_checked_at >= ? AND last_checked_at < ?").get(start, end) as any)?.c ?? 0
    );
    activity.push({
      day: new Date(start).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      created,
      checked,
    });
  }

  return { totals: t, byCategory, byStatus, byScore, activity };
}

export function distinctCategories(): string[] {
  return (
    db()
      .prepare("SELECT DISTINCT category FROM leads WHERE category IS NOT NULL ORDER BY category")
      .all() as { category: string }[]
  ).map((r) => r.category);
}

export function distinctLocations(): string[] {
  return (
    db()
      .prepare("SELECT DISTINCT location FROM leads WHERE location IS NOT NULL ORDER BY location")
      .all() as { location: string }[]
  ).map((r) => r.location);
}

export function logOutreach(lead_id: number, channel: string, message: string) {
  db()
    .prepare("INSERT INTO outreach_log(lead_id, channel, message, created_at) VALUES(?, ?, ?, ?)")
    .run(lead_id, channel, message, Date.now());
}

export function listOutreachLog(lead_id: number) {
  return (
    db()
      .prepare("SELECT * FROM outreach_log WHERE lead_id = ? ORDER BY created_at DESC")
      .all(lead_id) as any[]
  ).map((r) => ({
    id: Number(r.id),
    lead_id: Number(r.lead_id),
    channel: String(r.channel),
    message: String(r.message),
    created_at: Number(r.created_at),
  }));
}

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

/**
 * node:sqlite refuses `undefined` (only accepts null, number, string, bigint, Buffer/Uint8Array).
 * Normalize: undefined → null, booleans → 0/1.
 */
function toBindable<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) out[k] = null;
    else if (typeof v === "boolean") out[k] = v ? 1 : 0;
    else out[k] = v;
  }
  return out;
}
