# LeadFinder · Malta web design lead engine

A premium, animated, dark-mode dashboard that helps you find local businesses in Malta who need a new or improved website — then audit, score, and reach out, all from one place.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · shadcn/ui · SQLite · Google Places API**. Optional **Playwright** for deep website checks.

> **Legal & ethics**: this tool only collects publicly available business information from the Google Places API and renders publicly accessible web pages. It does **not** log into any platform, bypass paywalls, or store private personal data. Owner names should only be added if they are clearly public (e.g. listed on a website's public About page).

---

## Requirements

- **Node 22.5+** — uses Node's built-in `node:sqlite` module. No native compilation, no `better-sqlite3` headaches, works on paths with spaces.

## Quick start

```bash
cd lead-finder
npm install
cp .env.local.example .env.local      # add your GOOGLE_PLACES_API_KEY (optional, also configurable in-app)
npm run dev
```

Open **http://localhost:3000**.

The first time you run it, SQLite creates `./data/leads.db` automatically.

### Get a Google Places API key

1. Go to https://console.cloud.google.com/apis/credentials
2. Enable **Places API (New)**
3. Create an API key. Restrict it to your IP for safety.
4. Paste it into the **Settings** page in-app, or into `.env.local`.

---

## Project structure

```
lead-finder/
├── app/
│   ├── layout.tsx                  # Dark, animated shell with sidebar nav
│   ├── globals.css                 # Theme tokens, glassmorphism, gradients
│   ├── page.tsx                    # 1) Dashboard
│   ├── search/page.tsx             # 2) Lead Search
│   ├── leads/page.tsx              # 3) Lead List + filters
│   ├── leads/[id]/page.tsx         # 4) Lead Detail (audit + outreach studio)
│   ├── outreach/page.tsx           # 5) Outreach Messages (pipeline cycle)
│   ├── settings/page.tsx           # 6) Settings / API keys
│   └── api/
│       ├── search/route.ts         # POST — Google Places text search
│       ├── leads/route.ts          # GET (list/stats), POST (upsert)
│       ├── leads/[id]/route.ts     # GET, PATCH, DELETE
│       ├── check/route.ts          # POST — website checker
│       ├── outreach/route.ts       # POST — generate + log messages
│       ├── export/route.ts         # GET  — CSV export
│       └── settings/route.ts       # GET, POST
├── components/
│   ├── ui/                         # shadcn/ui primitives (button, card, ...)
│   ├── dashboard/                  # StatCard, charts
│   ├── nav.tsx                     # Animated sidebar + mobile nav
│   ├── animated-background.tsx     # Floating particles + gradient blobs
│   ├── lead-row.tsx                # Animated table-style row
│   ├── page-header.tsx
│   ├── page-transition.tsx
│   └── toaster.tsx
├── lib/
│   ├── db.ts                       # SQLite (Node's built-in node:sqlite) + schema
│   ├── places.ts                   # Google Places API client + Malta presets
│   ├── checker.ts                  # Website checker (fetch + optional Playwright)
│   ├── outreach.ts                 # Personalised outreach generator
│   ├── scoring.ts                  # Priority score (1-10)
│   ├── types.ts
│   └── utils.ts
├── data/                           # SQLite DB lives here (auto-created)
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
├── components.json                 # shadcn config (already wired up)
├── .env.local.example
└── package.json
```

---

## Pages

1. **Dashboard** — Animated hero stats, live count-ups, area chart of activity, score distribution bar chart, pipeline pie, top opportunities feed. Skeleton loading + page transitions.
2. **Lead Search** — Pick a Malta business type + location (presets included) or type a custom category. Results card grid with rating, location, phone, website. Toggle auto-check on save to immediately audit each site.
3. **Lead List** — Filter by category, location, outreach status, website status, min priority score. Sort 4 ways. CSV export uses your active filter set.
4. **Lead Detail** — Animated priority badge, glowing ring, full audit panel with detected issues, public-contact editor (email / Facebook / Instagram / owner / notes), outreach studio with three tabs (Problems & fix, WhatsApp, Email), one-click open in WhatsApp / Mail, history log.
5. **Outreach Messages** — Pipeline carousel: cycle through your "new" leads with prev/next, generate-on-arrival, edit + send.
6. **Settings** — Google Places API key (stored in SQLite, masked on display), studio name + sender name (used in messages), default location bias, plus instructions for enabling Playwright.

---

## Lead fields (collected & stored)

| Field | Source |
|---|---|
| Business name, category, location, phone, website, rating, reviews, lat/lng | Google Places (public) |
| Google Maps link | Generated from `place_id` |
| Email, Facebook URL, Instagram URL, owner name | Manually added (public-only) |
| Website status (`none` / `outdated` / `not_mobile` / `modern`) | Website checker |
| Issues found (array) | Website checker |
| Priority score (1-10) | Scoring engine |
| Outreach status (`new` / `contacted` / `replied` / `interested` / `closed` / `rejected`) | You |
| Notes | You |

---

## Website checker — what it detects

Out of the box (no browser needed):

- No website at all
- Missing call-to-action (book / contact / quote / order)
- Hard-to-find phone or contact button
- No WhatsApp button
- No clear services / menu / portfolio section
- Old design indicators (table layouts, jQuery 1.x, Flash, `<font>`, no HTTPS, framesets)
- Slow load (HTML response time > 4.5s)
- Heavy page (>1.5MB HTML)
- Not mobile-friendly (no viewport meta tag)

### Optional: Playwright deep checks

```bash
npm i -D playwright
npx playwright install chromium
echo "ENABLE_PLAYWRIGHT=true" >> .env.local
```

Then the **Deep check** button on the lead page renders the page in a real headless mobile viewport and double-confirms render time + viewport.

---

## Priority score (1-10)

Higher = more likely to need help and easier to reach. Drivers:

- Website status (no site = +5, outdated = +3.5, not mobile = +3, modern = +0.5)
- Number of issues found
- Reachability (phone, email, socials)
- Business activity (Google rating × review count → real revenue → can afford a site)
- Category bonus for high-website-need types (restaurant, hotel, dentist, lawyer, etc.)

---

## Outreach generator

For each lead, one click produces:

- **3 specific website problems** (ranked by likely impact)
- **Business impact** — why those problems cost money
- **Suggested fix** — what you'd actually do
- **WhatsApp message** — short, friendly, no pitch deck
- **Email** — subject + body, signed with your studio name

The lead's `outreach_status` automatically advances to **contacted** the first time you click *Send via WhatsApp* or *Open in Mail*.

---

## CSV export

`GET /api/export` (or the **Export CSV** button on Dashboard / Lead List) returns the current filtered view as `leads-YYYY-MM-DD.csv`. Includes all stored fields and a pipe-joined issues column.

---

## Environment variables

| Var | Purpose |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Google Places API key (also settable from Settings UI) |
| `ENABLE_PLAYWRIGHT` | `true` to enable deep checks (requires `npm i -D playwright`) |
| `DEFAULT_LAT` | Latitude bias for searches (default `35.9375` — Malta) |
| `DEFAULT_LNG` | Longitude bias (default `14.3754`) |
| `DEFAULT_RADIUS` | Search radius in metres (default `20000`) |

---

## Commands

```bash
npm install     # install deps
npm run dev     # dev server at http://localhost:3000
npm run build   # production build
npm run start   # production server
```

---

## Notes

- The SQLite database lives at `./data/leads.db`. Delete it to reset everything.
- All animations are GPU-accelerated; particles auto-throttle when out of viewport via Framer Motion.
- The whole UI is dark by default with calibrated glassmorphism, animated gradient blobs, gold/violet/cyan accents, and `Space Grotesk` for display type.
