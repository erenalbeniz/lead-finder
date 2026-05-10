"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Search,
  Users,
  MessageSquare,
  Settings,
  Sparkles,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Lead Search", icon: Search },
  { href: "/leads", label: "Lead List", icon: Users },
  { href: "/map", label: "Lead Map", icon: Map },
  { href: "/outreach", label: "Outreach", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-zinc-950/40 backdrop-blur-xl px-4 py-6">
      <Link href="/" className="group flex items-center gap-3 px-2 mb-8">
        <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-500/30">
          <Sparkles className="h-5 w-5 text-white" />
          <motion.div
            className="absolute inset-0 rounded-xl"
            animate={{ boxShadow: ["0 0 0 0 rgba(124,92,255,0.45)", "0 0 0 14px rgba(124,92,255,0)"] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
        </div>
        <div className="leading-tight">
          <div className="font-display text-base font-semibold tracking-tight">LeadFinder</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Malta · Web design</div>
        </div>
      </Link>

      <nav className="flex flex-col gap-1">
        {items.map((it) => {
          const active = isActive(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-cyan-500/15 ring-1 ring-inset ring-white/10"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className={cn("relative z-10 h-4 w-4", active ? "text-violet-300" : "")} />
              <span className="relative z-10 font-medium">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 p-4 text-xs text-muted-foreground">
        <div className="text-foreground font-semibold mb-1">Public data only</div>
        Collects publicly available business info from Google. No logins, paywalls, or private data.
      </div>
    </aside>
  );
}

export function MobileNav() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-white/[0.06] bg-zinc-950/70 backdrop-blur-xl px-4 py-3">
      <Link href="/" className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="font-display text-sm font-semibold">LeadFinder</span>
      </Link>
      <div className="flex items-center gap-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-lg transition",
                active ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
              aria-label={it.label}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
