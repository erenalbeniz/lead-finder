"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Map as MapIcon, Filter } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Lead } from "@/lib/types";
import { apiLeadsList } from "@/lib/api";
import { SERVICES, findService } from "@/lib/services";

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const MALTA_CENTER: [number, number] = [35.917973, 14.409943];
const ALL_SERVICES = "all";

// Leaflet is loaded from CDN at runtime — no @types/leaflet dep needed.
type LeafletNS = any;

function loadLeaflet(): Promise<LeafletNS> {
  if (typeof window === "undefined") return Promise.reject(new Error("not browser"));
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);

  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).L));
      existing.addEventListener("error", () => reject(new Error("failed to load Leaflet")));
      if ((window as any).L) resolve((window as any).L);
      return;
    }
    const s = document.createElement("script");
    s.src = LEAFLET_JS;
    s.async = true;
    s.onload = () => resolve((window as any).L);
    s.onerror = () => reject(new Error("failed to load Leaflet"));
    document.head.appendChild(s);
  });
}

function priorityHex(score: number): string {
  if (score >= 8) return "#f43f5e";
  if (score >= 6) return "#fb923c";
  if (score >= 4) return "#a78bfa";
  return "#64748b";
}

function popupHtml(lead: Lead): string {
  const svc = findService(lead.service_id);
  const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const phoneRow = lead.phone ? `<div style="font-size:11px;color:#9ca3af">📞 ${escape(lead.phone)}</div>` : "";
  const websiteRow = lead.website
    ? `<div style="font-size:11px;color:#9ca3af">🌐 ${escape(lead.website.replace(/^https?:\/\//, "").slice(0, 40))}</div>`
    : `<div style="font-size:11px;color:#fb7185">🌐 No website</div>`;
  const svcRow = svc
    ? `<div style="margin-top:6px;display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;background:rgba(52,211,153,0.12);color:#6ee7b7;border:1px solid rgba(52,211,153,0.35)">${svc.emoji} ${escape(svc.short)}</div>`
    : "";
  return `
    <div style="font-family:system-ui;min-width:200px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="display:inline-grid;place-items:center;width:24px;height:24px;border-radius:6px;background:${priorityHex(lead.priority_score)};color:white;font-size:11px;font-weight:700">${lead.priority_score}</span>
        <strong style="font-size:13px">${escape(lead.business_name)}</strong>
      </div>
      <div style="font-size:11px;color:#9ca3af;margin-bottom:4px">${escape(lead.category ?? "")} · ${escape((lead.location ?? "").split(",")[0] ?? "")}</div>
      ${phoneRow}
      ${websiteRow}
      ${svcRow}
      <a href="/lead?id=${lead.id}" style="display:block;margin-top:10px;text-align:center;padding:6px 10px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:white;text-decoration:none;font-weight:600;font-size:11px">Open lead →</a>
    </div>
  `;
}

export default function MapPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string>(ALL_SERVICES);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    setLeads(apiLeadsList({ limit: 1000 }).leads);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView(MALTA_CENTER, 11);
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            maxZoom: 19,
            subdomains: "abcd",
            attribution: "&copy; OpenStreetMap &copy; CARTO",
          },
        ).addTo(map);
        L.control.attribution({ prefix: false }).addAttribution("OSM · CARTO").addTo(map);
        mapRef.current = map;
        layerRef.current = L.layerGroup().addTo(map);
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !layerRef.current) return;
    const w = window as any;
    const L = w.L as LeafletNS;
    layerRef.current.clearLayers();

    const filtered = serviceFilter === ALL_SERVICES
      ? leads
      : leads.filter((l) => l.service_id === serviceFilter);

    const points: [number, number][] = [];
    for (const lead of filtered) {
      if (lead.lat == null || lead.lng == null) continue;
      const color = priorityHex(lead.priority_score);
      const marker = L.circleMarker([lead.lat, lead.lng], {
        radius: 7 + Math.min(lead.priority_score, 10) * 0.6,
        fillColor: color,
        color: "#0f172a",
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.85,
      }).bindPopup(popupHtml(lead), { closeButton: true });
      marker.addTo(layerRef.current);
      points.push([lead.lat, lead.lng]);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      mapRef.current.fitBounds(bounds.pad(0.15), { animate: true });
    }
  }, [ready, leads, serviceFilter]);

  const hasCoords = leads.some((l) => l.lat != null && l.lng != null);

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Map · Malta"
        title="Your leads, mapped."
        description="Saved leads pinned by location. Bigger and warmer markers mean higher priority. Click any marker to jump into the lead."
      />

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4 space-y-2">
              <Label className="inline-flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-violet-300" />
                Filter by service
              </Label>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SERVICES}>All services</SelectItem>
                  {SERVICES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="mr-2">{s.emoji}</span>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-8 flex md:justify-end gap-3 text-xs text-muted-foreground">
              <Legend dot="#f43f5e" label="Hot · 8-10" />
              <Legend dot="#fb923c" label="Warm · 6-7" />
              <Legend dot="#a78bfa" label="Mid · 4-5" />
              <Legend dot="#64748b" label="Cold · 1-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="relative w-full h-[560px] bg-zinc-950" ref={containerRef}>
          {!ready && (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <MapIcon className="h-4 w-4" /> Loading Malta map…
              </div>
            </div>
          )}
        </div>
      </Card>

      {!hasCoords && leads.length > 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Your saved leads don't have coordinates yet — re-save them from the search page so OSM lat/lng gets stored.
        </Card>
      )}

      {leads.length === 0 && (
        <Card className="p-6 text-center text-sm">
          No leads saved yet. <Link href="/search" className="text-violet-300 hover:underline">Run a search</Link> first.
        </Card>
      )}
    </PageTransition>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />
      {label}
    </span>
  );
}
