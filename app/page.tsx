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
  Target,
  Clock,
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
import { findService } from "@/lib/services";

interface Stats {
  totals: Record<string, number>;
  byCategory: { name: string; value: number }[];
  byStatus: { name: string; value: number }[];
  byScore: { score: number; count: number }[];
  byService: { service_id: string; value: number }[];
  activity: { day: string; created: number; checked: number }[];
  followUps: Lead[];
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
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="inline-flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-300" /> Top services to sell
              </CardTitle>
              <CardDescription>Where your live opportunities sit</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[40px]" />)
            ) : !stats?.byService?.length ? (
              <p className="text-sm text-muted-foreground">
                No services tagged yet. Pick a "Service to sell" on the search page when saving leads.
              </p>
            ) : (
              stats.byService.map((row, i) => {
                const svc = findService(row.service_id);
                if (!svc) return null;
                const max = stats.byService[0]?.value || 1;
                const pct = Math.round((row.value / max) * 100);
                return (
                  <Link
                    key={row.service_id}
                    href={`/leads?service=${row.service_id}`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base">{svc.emoji}</span>
                        <span className="text-foreground/90 group-hover:text-foreground">{svc.label}</span>
                      </span>
                      <span className="text-muted-foreground tabular-nums">{row.value}</span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        className="block h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400"
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-300" /> Needs follow-up
              </CardTitle>
              <CardDescription>Contacted &gt; 7 days ago, no reply yet</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/leads?status=contacted">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[64px]" />)
            ) : !stats?.followUps?.length ? (
              <p className="text-sm text-muted-foreground">
                Nobody is overdue right now. Anyone you contact will land here once 7 days pass without a reply.
              </p>
            ) : (
              stats.followUps.map((l, i) => <LeadRow key={l.id} lead={l} index={i} dense />)
            )}
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
