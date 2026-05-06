import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelative(ts: number | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  const diff = Date.now() - ts;
  const min = 60_000, hr = 3_600_000, day = 86_400_000;
  if (diff < min) return "just now";
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;
  return d.toLocaleDateString();
}

export function priorityColor(score: number) {
  if (score >= 8) return "from-rose-500 to-orange-400";
  if (score >= 6) return "from-amber-400 to-yellow-300";
  if (score >= 4) return "from-cyan-400 to-sky-400";
  return "from-emerald-400 to-teal-400";
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    new: "bg-zinc-500/15 text-zinc-200 border-zinc-500/30",
    contacted: "bg-cyan-500/15 text-cyan-200 border-cyan-500/30",
    replied: "bg-violet-500/15 text-violet-200 border-violet-500/30",
    interested: "bg-amber-500/15 text-amber-200 border-amber-500/30",
    closed: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
    rejected: "bg-rose-500/15 text-rose-200 border-rose-500/30",
  };
  return map[status] ?? map.new;
}

export function siteStatusLabel(s: string | null | undefined) {
  switch (s) {
    case "none": return "No website";
    case "outdated": return "Outdated";
    case "not_mobile": return "Not mobile-friendly";
    case "modern": return "Modern";
    default: return "Unknown";
  }
}

export function siteStatusColor(s: string | null | undefined) {
  switch (s) {
    case "none": return "bg-rose-500/15 text-rose-200 border-rose-500/30";
    case "outdated": return "bg-amber-500/15 text-amber-200 border-amber-500/30";
    case "not_mobile": return "bg-orange-500/15 text-orange-200 border-orange-500/30";
    case "modern": return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
    default: return "bg-zinc-500/15 text-zinc-200 border-zinc-500/30";
  }
}
