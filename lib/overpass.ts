import type { SearchHit } from "./types";

/**
 * Free local-business search using the Overpass API (OpenStreetMap).
 *  - No API key required, no billing
 *  - Public data, contributed by the OSM community
 *  - Surprisingly good Malta coverage (restaurants, hotels, dive shops, salons…)
 *
 * Docs:
 *  - https://wiki.openstreetmap.org/wiki/Overpass_API
 *  - https://wiki.openstreetmap.org/wiki/Map_features
 */

const OVERPASS_URL =
  process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";

const NOMINATIM_URL =
  process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org/search";

// Malta + Gozo + Comino bounding box (south, west, north, east)
const MALTA_BBOX = "35.78,14.16,36.10,14.58";

const UA = "LeadFinder/1.0 (Malta lead engine; localhost)";

// Tiny in-memory cache of location → bbox so we don't hit Nominatim on every
// search. Nominatim's usage policy is 1 req/sec — caching keeps us well under.
const bboxCache = new Map<string, string>();

async function bboxForLocation(location: string): Promise<string> {
  const key = location.trim().toLowerCase();
  if (!key) return MALTA_BBOX;
  if (bboxCache.has(key)) return bboxCache.get(key)!;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", `${location}, Malta`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "mt");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": UA, "Accept": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const arr = (await res.json()) as any[];
    const top = arr?.[0];
    if (!top?.boundingbox) throw new Error("no bbox");
    // Nominatim format: [south, north, west, east]
    const [south, north, west, east] = top.boundingbox.map((s: string) => Number(s));
    // Pad slightly so we don't miss businesses on the edge
    const pad = 0.005;
    const bbox = `${south - pad},${west - pad},${north + pad},${east + pad}`;
    bboxCache.set(key, bbox);
    return bbox;
  } catch {
    // Fallback: search all of Malta
    bboxCache.set(key, MALTA_BBOX);
    return MALTA_BBOX;
  }
}

/**
 * Mapping from "what the user types" → array of OSM tag selectors.
 * Each selector is an Overpass tag filter like `["amenity"="restaurant"]`.
 * Multiple selectors are unioned (OR).
 */
const CATEGORY_TAGS: Record<string, string[]> = {
  "restaurant": ['["amenity"="restaurant"]'],
  "cafe": ['["amenity"="cafe"]'],
  "bar": ['["amenity"="bar"]', '["amenity"="pub"]', '["amenity"="biergarten"]'],
  "hotel": ['["tourism"="hotel"]'],
  "guest house": ['["tourism"="guest_house"]', '["tourism"="hostel"]'],
  "spa": ['["leisure"="spa"]', '["amenity"="spa"]'],
  "beauty salon": ['["shop"="beauty"]', '["shop"="cosmetics"]'],
  "barbershop": ['["shop"="hairdresser"]'],
  "dentist": ['["amenity"="dentist"]'],
  "lawyer": ['["office"="lawyer"]'],
  "real estate agency": ['["office"="estate_agent"]'],
  "gym": ['["leisure"="fitness_centre"]', '["leisure"="sports_centre"]'],
  "yoga studio": ['["leisure"="fitness_centre"]["sport"~"yoga",i]'],
  "language school": ['["amenity"="language_school"]'],
  "bakery": ['["shop"="bakery"]', '["shop"="pastry"]'],
  "florist": ['["shop"="florist"]'],
  "auto repair": ['["shop"="car_repair"]', '["amenity"="car_repair"]'],
  "car rental": ['["amenity"="car_rental"]'],
  "boat charter": ['["amenity"="boat_rental"]', '["tourism"="boat_rental"]'],
  "diving center": ['["sport"="scuba_diving"]', '["shop"="scuba_diving"]'],
  "tour operator": ['["office"="travel_agent"]', '["shop"="travel_agency"]'],
  "wedding planner": ['["office"="wedding"]', '["shop"="wedding"]'],
  "photographer": ['["craft"="photographer"]', '["office"="photographer"]', '["shop"="photo"]'],
  "accountant": ['["office"="accountant"]'],
  "veterinarian": ['["amenity"="veterinary"]'],
  "pharmacy": ['["amenity"="pharmacy"]'],
  "tattoo parlor": ['["shop"="tattoo"]'],
  "pet shop": ['["shop"="pet"]'],
  "art gallery": ['["tourism"="gallery"]', '["amenity"="arts_centre"]'],
  "construction company": ['["office"="construction_company"]', '["craft"="builder"]'],
};

/** Any of these tags marks an element as "a business worth surfacing". */
const BUSINESSY_TAGS = ["amenity", "shop", "tourism", "leisure", "office", "craft", "sport"];

export interface OverpassSearchOptions {
  category: string;
  location?: string;
  limit?: number;
}

export async function searchOverpass(opts: OverpassSearchOptions): Promise<SearchHit[]> {
  const cat = opts.category.trim().toLowerCase();
  const tagFilters = CATEGORY_TAGS[cat];
  const limit = Math.min(opts.limit ?? 60, 120);

  // Geocode the requested town to a bounding box so we actually find businesses
  // in it (most aren't tagged with addr:city). Falls back to all-of-Malta.
  const bbox = opts.location ? await bboxForLocation(opts.location) : MALTA_BBOX;

  // Build Overpass QL — node + way + relation per filter
  const parts: string[] = [];
  if (tagFilters && tagFilters.length) {
    for (const f of tagFilters) {
      parts.push(`node${f}(${bbox});`);
      parts.push(`way${f}(${bbox});`);
      parts.push(`relation${f}(${bbox});`);
    }
  } else {
    // Custom / unknown category → search any business-tagged element by name
    const re = `["name"~"${escapeRegex(opts.category)}",i]`;
    for (const k of BUSINESSY_TAGS) {
      const f = `["${k}"]${re}`;
      parts.push(`node${f}(${bbox});`);
      parts.push(`way${f}(${bbox});`);
    }
  }

  const query = `[out:json][timeout:25];(${parts.join("")});out tags center ${limit};`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
    },
    body: "data=" + encodeURIComponent(query),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Overpass error ${res.status}: ${text.slice(0, 200) || res.statusText}`);
  }

  const data = await res.json();
  const elements = (data.elements ?? []) as any[];

  const seen = new Set<string>();
  const hits: SearchHit[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name: string =
      (tags.name || tags["name:en"] || tags["name:mt"] || tags.brand || "").trim();
    if (!name) continue;

    const lat = el.lat ?? el.center?.lat ?? null;
    const lng = el.lon ?? el.center?.lon ?? null;

    // Dedupe by name + coarse coords (OSM often has duplicate ways/nodes for the same business)
    const dedupeKey = `${name.toLowerCase()}|${typeof lat === "number" ? lat.toFixed(3) : "?"}|${typeof lng === "number" ? lng.toFixed(3) : "?"}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const city: string | undefined =
      tags["addr:city"] ||
      tags["addr:town"] ||
      tags["addr:village"] ||
      tags["addr:suburb"];

    const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
    const fullAddress = [street, city].filter(Boolean).join(", ");

    const phone: string | null = tags.phone || tags["contact:phone"] || null;
    const website: string | null = tags.website || tags["contact:website"] || null;
    const facebook: string | null = tags["contact:facebook"] || null;
    const instagram: string | null = tags["contact:instagram"] || null;
    const email: string | null = tags.email || tags["contact:email"] || null;

    const place_id = `osm_${el.type}_${el.id}`;
    const mapsQuery = encodeURIComponent(`${name} ${city ?? "Malta"}`);
    const google_maps_url = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

    hits.push({
      place_id,
      business_name: name,
      category: prettyCategory(tags) || opts.category,
      location: fullAddress || city || null,
      phone,
      website,
      google_maps_url,
      rating: null,
      user_ratings_total: null,
      lat,
      lng,
      // Carry extra OSM contact info on the hit so the API route can persist it
      ...(email || facebook || instagram
        ? ({ email, facebook_url: facebook, instagram_url: instagram } as any)
        : {}),
    } as SearchHit);
  }

  return hits.slice(0, limit);
}

function prettyCategory(tags: any): string | null {
  for (const k of ["amenity", "shop", "tourism", "leisure", "office", "craft", "sport"]) {
    if (tags[k]) return String(tags[k]).replace(/_/g, " ");
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
