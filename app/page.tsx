"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  Flame,
  Globe2,
  TrendingUp,
  Users,
  Sparkles,
  ArrowRight,
  Search as SearchIcon,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart, ScoreDistribution, StatusBreakdown } from "@/components/dashboard/charts";
import { LeadRow } from "@/components/lead-row";
import type { Lead } from "@/lib/types";
import { apiExport, apiLeadsList, apiLeadsStats } from "@/lib/api";

interface Stats {
  totals: Record<string, number>;
  byCategory: { name: string; value: number }[];
  byStatus: { name: string; value: number }[];
  byScore: { score: number; count: number }[];
  activity: { day: string; created: number; checked: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topLeads, setTopLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = apiLeadsStats();
    const l = apiLeadsList({ sort: "score_desc", limit: 6 });
    setStats(s.stats as Stats);
    setTopLeads(l.leads);
    setLoading(false);
  }, []);

  const t = stats?.totals ?? {};

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Live · Malta"
        title="Lead intelligence, made cinematic."
        description="Find local businesses that need a new or improved website. Audit, score, and reach out — all from one calm, premium dashboard."
        actions={
          <>
            <Button variant="outline" onClick={() => apiExport({})}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button asChild>
              <Link href="/search">
                <SearchIcon className="h-4 w-4" /> Find new leads
              </Link>
            </Button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[112px]" />)
        ) : (
          <>
            <StatCard label="Total leads" value={t.total ?? 0} icon={Users} accent="violet" delay={0.05} />
            <StatCard label="Hot (score 8+)" value={t.hot_count ?? 0} icon={Flame} accent="pink" delay={0.1} />
            <StatCard label="No website" value={t.no_website_count ?? 0} icon={Globe2} accent="cyan" delay={0.15} />
            <StatCard
              label="Avg priority"
              value={Number(((t.avg_score ?? 0) as number).toFixed?.(1) ?? 0)}
              icon={TrendingUp}
              accent="amber"
              delay={0.2}
              format="decimal"
              hint="/ 10"
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Activity · last 14 days</CardTitle>
              <CardDescription>New leads saved and websites checked</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[260px]" /> : <ActivityChart data={stats!.activity} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline status</CardTitle>
            <CardDescription>Outreach distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[220px]" /> : <StatusBreakdown data={stats!.byStatus} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score distribution</CardTitle>
            <CardDescription>Where your pipeline sits, 1-10</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[220px]" /> : <ScoreDistribution data={stats!.byScore} />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Top opportunities</CardTitle>
              <CardDescription>Highest priority leads in your database</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/leads">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[64px]" />)
            ) : topLeads.length === 0 ? (
              <EmptyState />
            ) : (
              topLeads.map((l, i) => <LeadRow key={l.id} lead={l} index={i} />)
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center"
    >
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-500/30 mb-3">
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <div className="font-display text-lg font-semibold">No leads yet</div>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Search is free — powered by OpenStreetMap. No API key required. Pick a category and location to find your first leads.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button asChild>
          <Link href="/search">
            <SearchIcon className="h-4 w-4" /> Start searching
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
