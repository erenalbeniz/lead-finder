"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Download, Filter, Loader2, Mail, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SERVICES } from "@/lib/services";
import { apiLeadHasDraft, apiOutreach } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadRow } from "@/components/lead-row";
import type { Lead } from "@/lib/types";
import { apiExport, apiLeadsList } from "@/lib/api";

const ALL_SERVICES = "all";

const STATUSES = ["all", "new", "contacted", "replied", "interested", "closed", "rejected"] as const;
const SITE_STATUSES = ["all", "none", "outdated", "not_mobile", "modern", "unknown"] as const;
const SORTS = [
  { v: "score_desc", label: "Highest score" },
  { v: "score_asc", label: "Lowest score" },
  { v: "recent", label: "Recently updated" },
  { v: "name", label: "Name (A→Z)" },
];

export default function LeadsPageWrapper() {
  return (
    <Suspense fallback={<PageTransition><Skeleton className="h-12 w-1/2" /><Skeleton className="h-72" /></PageTransition>}>
      <LeadsPage />
    </Suspense>
  );
}

function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState<string>("all");
  const [siteStatus, setSiteStatus] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>(ALL_SERVICES);
  const [minScore, setMinScore] = useState(1);
  const [sort, setSort] = useState("score_desc");
  const [drafting, setDrafting] = useState(false);

  function load() {
    setLoading(true);
    const res = apiLeadsList({
      q,
      category,
      location,
      status: status as any,
      website_status: siteStatus as any,
      service_id: serviceFilter as any,
      min_score: minScore,
      sort: sort as any,
    });
    setLeads(res.leads ?? []);
    setCategories(res.categories ?? []);
    setLocations(res.locations ?? []);
    setLoading(false);
  }

  async function draftOutreachForAll() {
    const targets = leads.filter((l) => l.service_id && !apiLeadHasDraft(l.id));
    if (!targets.length) {
      toast.info("Every visible lead with a service already has a draft.");
      return;
    }
    setDrafting(true);
    try {
      for (const lead of targets) {
        try {
          apiOutreach({ lead_id: lead.id, log: "draft", service_id: lead.service_id });
        } catch {
          // ignore individual failures
        }
      }
      toast.success(`Drafted outreach for ${targets.length} lead${targets.length === 1 ? "" : "s"}`, {
        description: "Open any lead to copy or send the prepared email + WhatsApp",
      });
    } finally {
      setDrafting(false);
    }
  }

  const sp = useSearchParams();
  useEffect(() => {
    const svc = sp.get("service");
    const st = sp.get("status");
    if (svc) setServiceFilter(svc);
    if (st) setStatus(st);
    setLoading(true);
    const res = apiLeadsList({
      q,
      category,
      location,
      status: (st ?? status) as any,
      website_status: siteStatus as any,
      service_id: (svc ?? serviceFilter) as any,
      min_score: minScore,
      sort: sort as any,
    });
    setLeads(res.leads ?? []);
    setCategories(res.categories ?? []);
    setLocations(res.locations ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportNow() {
    apiExport({
      q,
      category,
      location,
      status: status as any,
      website_status: siteStatus as any,
      service_id: serviceFilter as any,
      min_score: minScore,
      sort: sort as any,
    });
  }

  return (
    <PageTransition>
      <PageHeader
        eyebrow={`${leads.length} leads`}
        title="Your lead pipeline."
        description="Filter, sort, and export. Click any lead to open the full audit and outreach panel."
        actions={
          <>
            <Button variant="outline" onClick={draftOutreachForAll} disabled={drafting || loading}>
              {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Draft outreach for all
            </Button>
            <Button variant="outline" onClick={exportNow}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button asChild>
              <Link href="/search">
                <Search className="h-4 w-4" /> Find more
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3 space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Name, category, location…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
              />
            </div>
            <FilterSelect label="Category" value={category} onChange={setCategory} options={["all", ...categories]} />
            <FilterSelect label="Location" value={location} onChange={setLocation} options={["all", ...locations]} />
            <FilterSelect label="Outreach" value={status} onChange={setStatus} options={STATUSES as unknown as string[]} />
            <FilterSelect label="Website" value={siteStatus} onChange={setSiteStatus} options={SITE_STATUSES as unknown as string[]} />
            <div className="md:col-span-2 space-y-2">
              <Label>Service</Label>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SERVICES}>All services</SelectItem>
                  {SERVICES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="mr-2">{s.emoji}</span>
                      {s.short}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Min score: {minScore}</Label>
              <input
                type="range"
                min={1}
                max={10}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-violet-400"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Sort</Label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-12 flex justify-end">
              <Button onClick={load} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                Apply filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)
          : leads.length === 0
          ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center"
            >
              <div className="font-display text-lg font-semibold">No leads match your filters</div>
              <p className="text-sm text-muted-foreground mt-1">
                Try widening the filters or run a new search.
              </p>
            </motion.div>
          )
          : leads.map((l, i) => <LeadRow key={l.id} lead={l} index={i} />)}
      </div>
    </PageTransition>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="md:col-span-2 space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o === "all" ? "All" : o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
