export type OutreachStatus =
  | "new"
  | "contacted"
  | "replied"
  | "interested"
  | "closed"
  | "rejected";

export type WebsiteStatus = "none" | "outdated" | "not_mobile" | "modern" | "unknown";

export interface Lead {
  id: number;
  place_id: string | null;
  business_name: string;
  category: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  google_maps_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  owner_name: string | null;
  website_status: WebsiteStatus;
  issues_json: string; // JSON array of strings
  priority_score: number;
  outreach_status: OutreachStatus;
  notes: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  lat: number | null;
  lng: number | null;
  created_at: number;
  updated_at: number;
  last_checked_at: number | null;
  service_id: string | null;
}

export interface LeadInput {
  place_id?: string | null;
  business_name: string;
  category?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  owner_name?: string | null;
  website_status?: WebsiteStatus;
  issues?: string[];
  priority_score?: number;
  outreach_status?: OutreachStatus;
  notes?: string | null;
  rating?: number | null;
  user_ratings_total?: number | null;
  lat?: number | null;
  lng?: number | null;
  last_checked_at?: number | null;
  service_id?: string | null;
}

export interface SearchHit {
  place_id: string;
  business_name: string;
  category: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  google_maps_url: string;
  rating: number | null;
  user_ratings_total: number | null;
  lat: number | null;
  lng: number | null;
}

export interface SiteCheckResult {
  status: WebsiteStatus;
  issues: string[];
  loadMs?: number | null;
  htmlBytes?: number | null;
}

export interface SavedSearch {
  id: number;
  name: string;
  category: string;
  location: string;
  service_id: string | null;
  only_matches: boolean;
  created_at: number;
}
