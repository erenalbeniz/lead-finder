"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Globe, Phone, MapPin, ExternalLink, ChevronRight, MessageCircle, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/lib/types";
import { priorityColor, siteStatusColor, siteStatusLabel, statusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { apiLeadDraft, apiOutreach } from "@/lib/api";
import { findService } from "@/lib/services";

export function LeadRow({ lead, index = 0, dense = false }: { lead: Lead; index?: number; dense?: boolean }) {
  const service = findService(lead.service_id);

  function ensureBundleAndGet(channel: "email" | "whatsapp"): { whatsapp: string; email: { subject: string; body: string } } {
    const cached = apiLeadDraft(lead.id);
    if (cached.email && cached.whatsapp) return { email: cached.email, whatsapp: cached.whatsapp };
    const { bundle } = apiOutreach({ lead_id: lead.id, log: "draft" });
    return bundle;
  }

  function openWhatsApp(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!lead.phone) return;
    const { whatsapp } = ensureBundleAndGet("whatsapp");
    const number = lead.phone.replace(/[^\d+]/g, "");
    const msg = encodeURIComponent(whatsapp);
    window.open(`https://wa.me/${number}?text=${msg}`, "_blank", "noopener,noreferrer");
    apiOutreach({ lead_id: lead.id, log: "whatsapp" });
  }

  function openMail(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const { email } = ensureBundleAndGet("email");
    const target = lead.email ?? "";
    const subject = encodeURIComponent(email.subject);
    const body = encodeURIComponent(email.body);
    window.open(`mailto:${target}?subject=${subject}&body=${body}`, "_blank", "noopener,noreferrer");
    apiOutreach({ lead_id: lead.id, log: "email" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.025, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/lead?id=${lead.id}`}
        className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.045] hover:border-white/10 transition-all px-4 py-3"
      >
        <div className="relative">
          <div className={cn(
            "grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-white font-display font-semibold shadow-lg",
            priorityColor(lead.priority_score)
          )}>
            {lead.priority_score}
          </div>
          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-zinc-950 text-[9px] font-semibold uppercase tracking-wider ring-1 ring-white/10">
            {lead.priority_score >= 8 ? "🔥" : lead.priority_score >= 6 ? "⚡" : lead.priority_score >= 4 ? "•" : "·"}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-medium truncate">{lead.business_name}</div>
            <Badge className={cn("border", siteStatusColor(lead.website_status))}>{siteStatusLabel(lead.website_status)}</Badge>
            <Badge className={cn("border", statusColor(lead.outreach_status))}>{lead.outreach_status}</Badge>
            {service && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200"
                title={`Pitching ${service.label}`}
              >
                <span>{service.emoji}</span>
                {service.short}
              </span>
            )}
          </div>
          {!dense && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {lead.category && <span>{lead.category}</span>}
              {lead.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {lead.location}
                </span>
              )}
              {lead.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {lead.phone}
                </span>
              )}
              {lead.website ? (
                <span className="inline-flex items-center gap-1">
                  <Globe className="h-3 w-3" /> {short(lead.website)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-300/80">
                  <Globe className="h-3 w-3" /> No website
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lead.phone && (
            <button
              type="button"
              onClick={openWhatsApp}
              className="hidden md:grid h-8 w-8 place-items-center rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200 hover:bg-emerald-400/[0.12] hover:border-emerald-400/40 transition"
              title={`Send WhatsApp${service ? ` · ${service.short}` : ""}`}
              aria-label="Send WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
          )}
          {(lead.email || true) && (
            <button
              type="button"
              onClick={openMail}
              className="hidden md:grid h-8 w-8 place-items-center rounded-lg border border-violet-400/20 bg-violet-400/[0.06] text-violet-200 hover:bg-violet-400/[0.12] hover:border-violet-400/40 transition"
              title={`Open email draft${service ? ` · ${service.short}` : ""}`}
              aria-label="Open email"
            >
              <Mail className="h-3.5 w-3.5" />
            </button>
          )}
          {lead.website && (
            <a
              href={lead.website}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              className="hidden md:grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-white/20"
              aria-label="Open website"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    </motion.div>
  );
}

function short(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 40);
}
