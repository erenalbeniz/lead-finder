"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "violet",
  delay = 0,
  format = "int",
}: {
  label: string;
  value: number;
  hint?: string;
  icon: LucideIcon;
  accent?: "violet" | "cyan" | "pink" | "emerald" | "amber";
  delay?: number;
  format?: "int" | "decimal" | "percent";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const display = useTransform(motionVal, (v) => {
    if (format === "decimal") return v.toFixed(1);
    if (format === "percent") return `${Math.round(v)}%`;
    return Math.round(v).toLocaleString();
  });

  useEffect(() => {
    const ctrl = animate(motionVal, value, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    return ctrl.stop;
  }, [value, motionVal]);

  useEffect(() => {
    if (!ref.current) return;
    const unsub = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = String(v);
    });
    return unsub;
  }, [display]);

  const grad = {
    violet: "from-violet-500/40 to-fuchsia-500/10",
    cyan: "from-cyan-500/40 to-sky-500/10",
    pink: "from-pink-500/40 to-rose-500/10",
    emerald: "from-emerald-500/40 to-teal-500/10",
    amber: "from-amber-500/40 to-orange-500/10",
  }[accent];

  const ring = {
    violet: "ring-violet-400/30",
    cyan: "ring-cyan-400/30",
    pink: "ring-pink-400/30",
    emerald: "ring-emerald-400/30",
    amber: "ring-amber-400/30",
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-xl p-5"
    >
      <div className={cn("absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br blur-2xl opacity-60 group-hover:opacity-90 transition-opacity", grad)} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span ref={ref} className="font-display text-3xl font-semibold tracking-tight">0</span>
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
          </div>
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1", ring)}>
          <Icon className="h-4 w-4 text-foreground/90" />
        </div>
      </div>
    </motion.div>
  );
}
