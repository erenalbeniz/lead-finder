"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search as SearchIcon,
  Loader2,
  Plus,
  Check,
  ExternalLink,
  Star,
  MapPin,
  Globe,
  Phone,
  Sparkles,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MALTA_CATEGORIES, MALTA_LOCATIONS } from "@/lib/places";
import type { SearchHit } from "@/lib/types";
import { apiCheck, apiLeadCreate, apiSearch } from "@/lib/api";

interface Hit extends SearchHit { already_saved?: boolean }

export default function SearchPage() {
  const [category, setCategory] = useState("restaurant");
  const [customCategory, setCustomCategory] = useState("");
  const [location, setLocation] = useState("Sliema");
  const ALL_MALTA = "__all__";
  const [autoCheck, setAutoCheck] = useState(true);
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const effectiveCategory = customCategory.trim() || category;

  async function runSearch() {
    if (!effectiveCategory) {
      toast.error("Pick or type a category first.");
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const data = await apiSearch({
        category: effectiveCategory,
        location: location === ALL_MALTA ? "" : location,
      });
      setResults(data.results ?? []);
      const preset = new Set<string>(
        (data.results ?? []).filter((r: Hit) => r.already_saved).map((r: Hit) => r.place_id)
      );
      setSavedIds(preset);
      if ((data.results ?? []).length === 0) toast.info("No results — try a wider area or different category.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveOne(hit: Hit) {
    setSavingIds((s) => new Set(s).add(hit.place_id));
    try {
      let issues: string[] | undefined;
      let website_status: any | undefined;
      if (autoCheck) {
        const cr = await apiCheck({ url: hit.website ?? "" });
        issues = cr.check?.issues;
        website_status = cr.check?.status;
      } else if (!hit.website) {
        issues = ["No website at all"];
        website_status = "none";
      }
      apiLeadCreate({
        place_id: hit.place_id,
        business_name: hit.business_name,
        category: hit.category,
        location: hit.location,
        phone: hit.phone,
        website: hit.website,
        google_maps_url: hit.google_maps_url,
        rating: hit.rating,
        user_ratings_total: hit.user_ratings_total,
        lat: hit.lat,
        lng: hit.lng,
        issues,
        website_status,
        last_checked_at: autoCheck ? Date.now() : undefined,
      });
      setSavedIds((s) => new Set(s).add(hit.place_id));
      toast.success(`Saved ${hit.business_name}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingIds((s) => {
        const ns = new Set(s);
        ns.delete(hit.place_id);
        return ns;
      });
    }
  }

  async function saveAllUnsaved() {
    const targets = results.filter((r) => !savedIds.has(r.place_id));
    if (!targets.length) return;
    toast.message(`Saving ${targets.length} leads…`, {
      description: autoCheck ? "Running website checks in parallel" : "Quick save (no checks)",
    });
    await Promise.all(targets.map(saveOne));
  }

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Lead Search · Free · OpenStreetMap"
        title="Discover businesses worth helping."
        description="Searches OpenStreetMap's public business directory across Malta — no API key, no billing. Only public info is collected."
      />

      <Card className="ring-frame">
        <CardContent className="p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4 space-y-2">
              <Label>Business type</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setCustomCategory(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MALTA_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label>Or custom</Label>
              <Input
                placeholder="e.g. yoga retreat"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label>Location in Malta</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_MALTA}>All of Malta</SelectItem>
                  {MALTA_LOCATIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button onClick={runSearch} className="w-full h-10" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
                Search
              </Button>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Switch checked={autoCheck} onCheckedChange={setAutoCheck} id="auto-check" />
              <label htmlFor="auto-check" className="text-sm text-muted-foreground inline-flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-violet-300" />
                Auto-run website check on save
              </label>
            </div>
            {results.length > 0 && (
              <Button variant="outline" onClick={saveAllUnsaved}>
                <Plus className="h-4 w-4" /> Save all new
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[180px] rounded-2xl" />)}

        <AnimatePresence>
          {!loading && results.map((r, i) => (
            <motion.div
              key={r.place_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="h-full group hover:translate-y-[-2px] transition-transform">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{r.business_name}</CardTitle>
                      <CardDescription className="truncate">{r.category ?? "—"}</CardDescription>
                    </div>
                    {r.rating != null && (
                      <Badge variant="info" className="shrink-0 inline-flex items-center gap-1">
                        <Star className="h-3 w-3" /> {r.rating} <span className="opacity-60">({r.user_ratings_total ?? 0})</span>
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {r.location && (
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1 truncate">
                      <MapPin className="h-3.5 w-3.5" /> <span className="truncate">{r.location}</span>
                    </div>
                  )}
                  {r.phone && (
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {r.phone}
                    </div>
                  )}
                  <div className="text-xs">
                    {r.website ? (
                      <span className="inline-flex items-center gap-1 text-foreground/80">
                        <Globe className="h-3.5 w-3.5" /> {short(r.website)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-300/90">
                        <Globe className="h-3.5 w-3.5" /> No website
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {savedIds.has(r.place_id) ? (
                      <Button variant="outline" disabled className="flex-1">
                        <Check className="h-4 w-4 text-emerald-300" /> Saved
                      </Button>
                    ) : (
                      <Button
                        onClick={() => saveOne(r)}
                        className="flex-1"
                        disabled={savingIds.has(r.place_id)}
                      >
                        {savingIds.has(r.place_id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Save lead
                      </Button>
                    )}
                    <a
                      href={r.google_maps_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      title="Open on Google Maps"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!loading && results.length === 0 && (
        <Card className="text-center p-10">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 mb-3">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="font-display text-lg font-semibold">Pick a category and run a search</div>
          <p className="text-sm text-muted-foreground mt-1">
            Searches are biased to Malta. Try "restaurant in Sliema" or "dentist in Valletta".
          </p>
        </Card>
      )}
    </PageTransition>
  );
}

function short(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 50);
}
