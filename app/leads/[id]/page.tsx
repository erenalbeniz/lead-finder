"use client";

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Globe,
  Phone,
  Mail,
  MapPin,
  Star,
  ExternalLink,
  Loader2,
  Trash2,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Save,
  Facebook,
  Instagram,
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import type { Lead, OutreachStatus } from "@/lib/types";
import { cn, formatRelative, priorityColor, siteStatusColor, siteStatusLabel, statusColor } from "@/lib/utils";

const STATUS_OPTIONS: OutreachStatus[] = ["new", "contacted", "replied", "interested", "closed", "rejected"];

interface OutreachBundle {
  problems: string[];
  businessImpact: string;
  suggestedFix: string;
  whatsapp: string;
  email: { subject: string; body: string };
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bundle, setBundle] = useState<OutreachBundle | null>(null);
  const [outreach, setOutreach] = useState<{ id: number; channel: string; message: string; created_at: number }[]>([]);
  const [editing, setEditing] = useState({
    email: "",
    facebook_url: "",
    instagram_url: "",
    owner_name: "",
    notes: "",
  });

  async function load() {
    setLoading(true);
    const data = await fetch(`/api/leads/${id}`).then((r) => r.json());
    if (data.lead) {
      setLead(data.lead);
      setEditing({
        email: data.lead.email ?? "",
        facebook_url: data.lead.facebook_url ?? "",
        instagram_url: data.lead.instagram_url ?? "",
        owner_name: data.lead.owner_name ?? "",
        notes: data.lead.notes ?? "",
      });
      setOutreach(data.outreach ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function runCheck(deep = false) {
    if (!lead) return;
    setChecking(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, deep }),
      });
      const data = await res.json();
      if (data.lead) setLead(data.lead);
      toast.success(deep ? "Deep check complete" : "Website check complete");
    } catch (e: any) {
      toast.error(e.message ?? "Check failed");
    } finally {
      setChecking(false);
    }
  }

  async function generate() {
    if (!lead) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      }).then((r) => r.json());
      setBundle(res.bundle);
    } finally {
      setGenerating(false);
    }
  }

  async function saveEdits() {
    if (!lead) return;
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    const data = await res.json();
    if (data.lead) setLead(data.lead);
    toast.success("Saved");
  }

  async function setStatus(s: OutreachStatus) {
    if (!lead) return;
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outreach_status: s }),
    });
    const data = await res.json();
    if (data.lead) setLead(data.lead);
    toast.success(`Marked as ${s}`);
  }

  async function deleteLead() {
    if (!lead) return;
    if (!confirm(`Delete ${lead.business_name}? This can't be undone.`)) return;
    await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    toast.success("Lead deleted");
    router.push("/leads");
  }

  async function copy(s: string, what: string) {
    await navigator.clipboard.writeText(s);
    toast.success(`${what} copied`);
  }

  async function sendOutreach(kind: "whatsapp" | "email") {
    if (!lead || !bundle) return;
    if (kind === "whatsapp") {
      const phone = (lead.phone ?? "").replace(/[^\d+]/g, "");
      const msg = encodeURIComponent(bundle.whatsapp);
      const url = phone ? `https://wa.me/${phone.replace(/^\+/, "")}?text=${msg}` : `https://wa.me/?text=${msg}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const subject = encodeURIComponent(bundle.email.subject);
      const body = encodeURIComponent(bundle.email.body);
      const to = lead.email ? encodeURIComponent(lead.email) : "";
      window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
    }
    await fetch("/api/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, log: kind }),
    });
    if (lead.outreach_status === "new") await setStatus("contacted");
    load();
  }

  if (loading) {
    return (
      <PageTransition>
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-72" />
      </PageTransition>
    );
  }
  if (!lead) {
    return (
      <PageTransition>
        <Card className="p-10 text-center">
          <div className="font-display text-lg font-semibold">Lead not found</div>
          <Button className="mt-4" asChild><Link href="/leads">Back to leads</Link></Button>
        </Card>
      </PageTransition>
    );
  }

  const issues: string[] = (() => {
    try { return JSON.parse(lead.issues_json); } catch { return []; }
  })();

  return (
    <PageTransition>
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/leads"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => runCheck(false)} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Re-check website
          </Button>
          <Button variant="destructive" onClick={deleteLead}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Card className="ring-frame overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className={cn("absolute -top-20 -right-20 h-80 w-80 rounded-full bg-gradient-to-br blur-3xl", priorityColor(lead.priority_score))} />
        </div>
        <CardContent className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className={cn("relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-white font-display text-2xl font-semibold shadow-2xl", priorityColor(lead.priority_score))}
              >
                {lead.priority_score}
                <span className="absolute -inset-1 rounded-2xl ring-1 ring-white/10 animate-pulse-glow" />
              </motion.div>
              <div className="min-w-0">
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight truncate">{lead.business_name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {lead.category && <Badge variant="outline">{lead.category}</Badge>}
                  <Badge className={cn("border", siteStatusColor(lead.website_status))}>{siteStatusLabel(lead.website_status)}</Badge>
                  <Badge className={cn("border", statusColor(lead.outreach_status))}>{lead.outreach_status}</Badge>
                  {lead.rating != null && (
                    <Badge variant="info" className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3" /> {lead.rating} <span className="opacity-60">({lead.user_ratings_total ?? 0})</span>
                    </Badge>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                  {lead.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {lead.location}</span>}
                  <span>Updated {formatRelative(lead.updated_at)}</span>
                  {lead.last_checked_at && <span>· Checked {formatRelative(lead.last_checked_at)}</span>}
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto md:min-w-[260px] space-y-2">
              <Label>Outreach status</Label>
              <Select value={lead.outreach_status} onValueChange={(v) => setStatus(v as OutreachStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-3">Priority</div>
              <Progress value={lead.priority_score * 10} />
              <div className="text-xs text-muted-foreground">{lead.priority_score} / 10</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300" /> Website audit
            </CardTitle>
            <CardDescription>
              {lead.website ? `Last checked ${formatRelative(lead.last_checked_at)}` : "No website on file — that's already a 5-point opportunity."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {issues.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 inline-flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> No issues recorded yet — run a check.
              </div>
            ) : (
              issues.map((issue, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-500/10 text-amber-300 text-xs">!</span>
                  <span className="text-sm text-foreground/90">{issue}</span>
                </motion.div>
              ))
            )}
            <div className="pt-2 flex flex-wrap gap-2">
              {lead.website && (
                <Button variant="outline" asChild>
                  <a href={lead.website} target="_blank" rel="noreferrer noopener">
                    <Globe className="h-4 w-4" /> Visit site <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
              {lead.google_maps_url && (
                <Button variant="outline" asChild>
                  <a href={lead.google_maps_url} target="_blank" rel="noreferrer noopener">
                    <MapPin className="h-4 w-4" /> Open in Maps
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={() => runCheck(true)} disabled={checking}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Deep check
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public contact</CardTitle>
            <CardDescription>From Google Maps + your edits. No private data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ContactRow icon={Phone} value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} placeholder="No phone listed" />
            <ContactRow icon={Mail} value={editing.email} placeholder="Add public email">
              <Input value={editing.email} onChange={(e) => setEditing((s) => ({ ...s, email: e.target.value }))} placeholder="hello@business.com" />
            </ContactRow>
            <ContactRow icon={Facebook} value={editing.facebook_url} placeholder="Public Facebook URL">
              <Input value={editing.facebook_url} onChange={(e) => setEditing((s) => ({ ...s, facebook_url: e.target.value }))} placeholder="https://facebook.com/…" />
            </ContactRow>
            <ContactRow icon={Instagram} value={editing.instagram_url} placeholder="Public Instagram URL">
              <Input value={editing.instagram_url} onChange={(e) => setEditing((s) => ({ ...s, instagram_url: e.target.value }))} placeholder="https://instagram.com/…" />
            </ContactRow>
            <div className="space-y-2">
              <Label>Owner / manager (only if clearly public)</Label>
              <Input value={editing.owner_name} onChange={(e) => setEditing((s) => ({ ...s, owner_name: e.target.value }))} placeholder="e.g. listed on the website's About page" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editing.notes}
                onChange={(e) => setEditing((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Anything you noticed — not for storing private data."
                rows={4}
              />
            </div>
            <Button onClick={saveEdits} className="w-full"><Save className="h-4 w-4" /> Save details</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="inline-flex items-center gap-2"><MessageSquare className="h-4 w-4 text-violet-300" /> Outreach studio</CardTitle>
            <CardDescription>Generate a personalised WhatsApp and email opener in one click.</CardDescription>
          </div>
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {bundle ? "Regenerate" : "Generate messages"}
          </Button>
        </CardHeader>
        <CardContent>
          {!bundle ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-muted-foreground text-center">
              Click <span className="text-foreground">Generate messages</span> to get 3 problems, business impact, fix, and ready-to-send WhatsApp + email.
            </div>
          ) : (
            <Tabs defaultValue="problems">
              <TabsList>
                <TabsTrigger value="problems">Problems & fix</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>
              <TabsContent value="problems">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {bundle.problems.map((p, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4"
                    >
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Problem #{i + 1}</div>
                      <div className="text-sm text-foreground/90">{p}</div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300 mb-1">Business impact</div>
                    <div className="text-sm">{bundle.businessImpact}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300 mb-1">Suggested fix</div>
                    <div className="text-sm">{bundle.suggestedFix}</div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="whatsapp">
                <Textarea
                  value={bundle.whatsapp}
                  onChange={(e) => setBundle({ ...bundle, whatsapp: e.target.value })}
                  rows={5}
                />
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" onClick={() => copy(bundle.whatsapp, "WhatsApp message")}>Copy</Button>
                  <Button onClick={() => sendOutreach("whatsapp")}>
                    <ExternalLink className="h-4 w-4" /> Open WhatsApp
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="email">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={bundle.email.subject} onChange={(e) => setBundle({ ...bundle, email: { ...bundle.email, subject: e.target.value } })} />
                  <Label>Body</Label>
                  <Textarea
                    rows={10}
                    value={bundle.email.body}
                    onChange={(e) => setBundle({ ...bundle, email: { ...bundle.email, body: e.target.value } })}
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" onClick={() => copy(`${bundle.email.subject}\n\n${bundle.email.body}`, "Email")}>Copy</Button>
                  <Button onClick={() => sendOutreach("email")}>
                    <ExternalLink className="h-4 w-4" /> Open in Mail
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {outreach.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Outreach history</div>
              {outreach.map((o) => (
                <div key={o.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="uppercase tracking-wider">{o.channel}</span>
                    <span>{formatRelative(o.created_at)}</span>
                  </div>
                  <pre className="mt-1 text-xs whitespace-pre-wrap font-sans text-foreground/80">{o.message}</pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  );
}

function ContactRow({
  icon: Icon, value, href, placeholder, children,
}: {
  icon: any; value?: string | null; href?: string; placeholder: string; children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {href && value ? (
          <a href={href} className="text-foreground hover:text-violet-300 transition-colors">{value}</a>
        ) : null}
      </div>
      {children ? children : !value && <div className="text-xs text-muted-foreground/60 italic">{placeholder}</div>}
    </div>
  );
}
