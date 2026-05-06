"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Globe, Phone, MapPin, ExternalLink, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/lib/types";
import { priorityColor, siteStatusColor, siteStatusLabel, statusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function LeadRow({ lead, index = 0, dense = false }: { lead: Lead; index?: number; dense?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.025, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/leads/${lead.id}`}
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
