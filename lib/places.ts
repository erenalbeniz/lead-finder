import type { SearchHit } from "./types";

/**
 * Wrapper around the Google Places API (new "Places API" v1).
 * Uses Text Search and Place Details. Only collects publicly available business info.
 *
 * Docs:
 *  - https://developers.google.com/maps/documentation/places/web-service/text-search
 *  - https://developers.google.com/maps/documentation/places/web-service/place-details
 */

const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

export interface SearchOptions {
  query: string;
  locationBias?: { lat: number; lng: number; radiusMeters: number };
  pageSize?: number;
}

export async function searchPlaces(apiKey: string, opts: SearchOptions): Promise<SearchHit[]> {
  if (!apiKey) throw new Error("Google Places API key is missing. Add it in Settings.");

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.types",
    "places.primaryType",
    "places.primaryTypeDisplayName",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.googleMapsUri",
  ].join(",");

  const body: any = {
    textQuery: opts.query,
    pageSize: Math.min(opts.pageSize ?? 20, 20),
  };
  if (opts.locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: opts.locationBias.lat, longitude: opts.locationBias.lng },
        radius: opts.locationBias.radiusMeters,
      },
    };
  }

  const res = await fetch(TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const places = (data.places ?? []) as any[];
  return places.map((p) => ({
    place_id: p.id,
    business_name: p.displayName?.text ?? "Unknown",
    category: p.primaryTypeDisplayName?.text ?? p.primaryType ?? (p.types?.[0] ?? null),
    location: p.formattedAddress ?? null,
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    google_maps_url: p.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`,
    rating: typeof p.rating === "number" ? p.rating : null,
    user_ratings_total: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
  }));
}

/**
 * Build a Malta-biased query like "restaurants in Sliema, Malta".
 * Adding ", Malta" to the query reliably anchors results to the country.
 */
export function buildMaltaQuery(category: string, location?: string): string {
  const cat = category.trim();
  const loc = (location ?? "").trim();
  if (loc) return `${cat} in ${loc}, Malta`;
  return `${cat} in Malta`;
}

export const MALTA_LOCATIONS = [
  "Valletta",
  "Sliema",
  "St. Julian's",
  "Gzira",
  "Msida",
  "Birkirkara",
  "Mosta",
  "Mdina",
  "Rabat",
  "Marsaskala",
  "Marsaxlokk",
  "Bugibba",
  "Qawra",
  "St. Paul's Bay",
  "Mellieha",
  "Gozo - Victoria",
  "Gozo - Marsalforn",
  "Gozo - Xlendi",
  "Paola",
  "Cospicua",
  "Senglea",
  "Vittoriosa",
  "Hamrun",
  "Pieta",
  "Floriana",
  "Naxxar",
  "Swieqi",
  "Pembroke",
  "Attard",
  "Balzan",
  "Lija",
];

export const MALTA_CATEGORIES = [
  "restaurant",
  "cafe",
  "bar",
  "hotel",
  "guest house",
  "spa",
  "beauty salon",
  "barbershop",
  "dentist",
  "lawyer",
  "real estate agency",
  "gym",
  "yoga studio",
  "language school",
  "bakery",
  "florist",
  "auto repair",
  "car rental",
  "boat charter",
  "diving center",
  "tour operator",
  "wedding planner",
  "photographer",
  "accountant",
  "veterinarian",
  "pharmacy",
  "tattoo parlor",
  "pet shop",
  "art gallery",
  "construction company",
];
