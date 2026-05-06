"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Download, Filter, Loader2, Search } from "lucide-react";
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

const STATUSES = ["all", "new", "contacted", "replied", "interested", "closed", "rejected"] as const;
const SITE_STATUSES = ["all", "none", "outdated", "not_mobile", "modern", "unknown"] as const;
const SORTS = [
  { v: "score_desc", label: "Highest score" },
  { v: "score_asc", label: "Lowest score" },
  { v: "recent", label: "Recently updated" },
  { v: "name", label: "Name (A→Z)" },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState<string>("all");
  const [siteStatus, setSiteStatus] = useState<string>("all");
  const [minScore, setMinScore] = useState(1);
  const [sort, setSort] = useState("score_desc");

  function load() {
    setLoading(true);
    const res = apiLeadsList({
      q,
      category,
      location,
      status: status as any,
      website_status: siteStatus as any,
      min_score: minScore,
      sort: sort as any,
    });
    setLeads(res.leads ?? []);
    setCategories(res.categories ?? []);
    setLocations(res.locations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportNow() {
    apiExport({
      q,
      category,
      location,
      status: status as any,
      website_status: siteStatus as any,
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
