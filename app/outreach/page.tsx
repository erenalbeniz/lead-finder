"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Mail,
  MessageCircle,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Lead, OutreachStatus } from "@/lib/types";
import { cn, priorityColor, siteStatusColor, siteStatusLabel, statusColor } from "@/lib/utils";
import { apiLeadsList, apiLeadUpdate, apiOutreach } from "@/lib/api";

interface OutreachBundle {
  problems: string[];
  businessImpact: string;
  suggestedFix: string;
  whatsapp: string;
  email: { subject: string; body: string };
}

export default function OutreachPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [bundle, setBundle] = useState<OutreachBundle | null>(null);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<OutreachStatus | "all">("new");

  useEffect(() => {
    setLoading(true);
    const d = apiLeadsList({ status: filter as any, sort: "score_desc", limit: 50 });
    setLeads(d.leads ?? []);
    setActiveIdx(0);
    setBundle(null);
    setLoading(false);
  }, [filter]);

  const active = leads[activeIdx];

  useEffect(() => {
    if (!active) { setBundle(null); return; }
    setGenerating(true);
    try {
      const d = apiOutreach({ lead_id: active.id });
      setBundle(d.bundle);
    } finally {
      setGenerating(false);
    }
  }, [active?.id]);

  function next() { if (activeIdx < leads.length - 1) setActiveIdx(activeIdx + 1); }
  function prev() { if (activeIdx > 0) setActiveIdx(activeIdx - 1); }

  async function copy(s: string, what: string) {
    await navigator.clipboard.writeText(s);
    toast.success(`${what} copied`);
  }

  async function send(kind: "whatsapp" | "email") {
    if (!active || !bundle) return;
    if (kind === "whatsapp") {
      const phone = (active.phone ?? "").replace(/[^\d+]/g, "");
      const msg = encodeURIComponent(bundle.whatsapp);
      window.open(phone ? `https://wa.me/${phone.replace(/^\+/, "")}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
    } else {
      const subject = encodeURIComponent(bundle.email.subject);
      const body = encodeURIComponent(bundle.email.body);
      const to = active.email ? encodeURIComponent(active.email) : "";
      window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
    }
    apiOutreach({ lead_id: active.id, log: kind });
    if (active.outreach_status === "new") {
      apiLeadUpdate(active.id, { outreach_status: "contacted" });
      setLeads((arr) => arr.map((l) => l.id === active.id ? { ...l, outreach_status: "contacted" } : l));
    }
  }

  const counts = useMemo(() => leads.length, [leads]);

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Outreach Studio"
        title="Send the message that wins the meeting."
        description="Cycle through your pipeline. Each lead gets 3 problems, business impact, suggested fix, and a ready-to-send WhatsApp + email."
        actions={
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="interested">Interested</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px] lg:col-span-2" />
        </div>
      ) : counts === 0 ? (
        <Card className="p-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 mb-3">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="font-display text-lg font-semibold">No leads in this status</div>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Switch the filter or run a new search.
          </p>
          <Button asChild><Link href="/search">Find new leads</Link></Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* Lead list */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
              <CardDescription>{counts} {counts === 1 ? "lead" : "leads"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-[640px] overflow-y-auto pr-2">
              {leads.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-all",
                    i === activeIdx
                      ? "border-violet-400/30 bg-gradient-to-r from-violet-500/10 to-cyan-500/10"
                      : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br text-white text-sm font-semibold", priorityColor(l.priority_score))}>{l.priority_score}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{l.business_name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{l.category}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge className={cn("border", siteStatusColor(l.website_status))}>{siteStatusLabel(l.website_status)}</Badge>
                    <Badge className={cn("border", statusColor(l.outreach_status))}>{l.outreach_status}</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Active outreach */}
          <Card className="ring-frame">
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Composing for</div>
                <CardTitle className="mt-1">
                  {active ? <Link href={`/lead?id=${active.id}`} className="hover:text-violet-300 transition-colors">{active.business_name}</Link> : "—"}
                </CardTitle>
                <CardDescription>
                  {active?.category ?? ""}{active?.location ? ` · ${active.location}` : ""}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={prev} disabled={activeIdx === 0}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs text-muted-foreground tabular-nums px-2">{activeIdx + 1} / {counts}</span>
                <Button variant="outline" size="icon" onClick={next} disabled={activeIdx >= counts - 1}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {!bundle || generating ? (
                <Skeleton className="h-[380px]" />
              ) : (
                <Tabs defaultValue="whatsapp">
                  <TabsList>
                    <TabsTrigger value="whatsapp"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</TabsTrigger>
                    <TabsTrigger value="email"><Mail className="h-3.5 w-3.5" /> Email</TabsTrigger>
                    <TabsTrigger value="brief"><Sparkles className="h-3.5 w-3.5" /> Brief</TabsTrigger>
                  </TabsList>

                  <TabsContent value="whatsapp">
                    <Textarea
                      rows={6}
                      value={bundle.whatsapp}
                      onChange={(e) => setBundle({ ...bundle, whatsapp: e.target.value })}
                    />
                    <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {active?.phone ? `Will open WhatsApp for ${active.phone}` : "No public phone — WhatsApp will open without a contact."}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => copy(bundle.whatsapp, "WhatsApp")}>Copy</Button>
                        <Button onClick={() => send("whatsapp")}><ExternalLink className="h-4 w-4" /> Send via WhatsApp</Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="email">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input value={bundle.email.subject} onChange={(e) => setBundle({ ...bundle, email: { ...bundle.email, subject: e.target.value } })} />
                      <Label>Body</Label>
                      <Textarea rows={11} value={bundle.email.body} onChange={(e) => setBundle({ ...bundle, email: { ...bundle.email, body: e.target.value } })} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {active?.email ? `Will open mailto: ${active.email}` : "No public email yet — add one on the lead page."}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => copy(`${bundle.email.subject}\n\n${bundle.email.body}`, "Email")}>Copy</Button>
                        <Button onClick={() => send("email")}><ExternalLink className="h-4 w-4" /> Open in Mail</Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="brief">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {bundle.problems.map((p, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4"
                        >
                          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Problem #{i + 1}</div>
                          <div className="text-sm">{p}</div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300 mb-1">Business impact</div>
                        {bundle.businessImpact}
                      </div>
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300 mb-1">Suggested fix</div>
                        {bundle.suggestedFix}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageTransition>
  );
}
