"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { motion } from "framer-motion";

const tip = {
  contentStyle: {
    background: "rgba(9,9,11,0.92)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    backdropFilter: "blur(12px)",
    fontSize: 12,
  },
  itemStyle: { color: "#fff" },
  labelStyle: { color: "rgba(255,255,255,0.6)" },
};

export function ActivityChart({ data }: { data: { day: string; created: number; checked: number }[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="h-[260px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g-created" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-checked" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip {...tip} />
          <Area type="monotone" dataKey="created" stroke="#a78bfa" strokeWidth={2} fill="url(#g-created)" name="Saved" />
          <Area type="monotone" dataKey="checked" stroke="#67e8f9" strokeWidth={2} fill="url(#g-checked)" name="Checked" />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

const SCORE_COLORS = [
  "#10b981", "#34d399", "#22d3ee", "#67e8f9",
  "#a78bfa", "#c4b5fd", "#f0abfc", "#f472b6", "#fb923c", "#ef4444",
];

export function ScoreDistribution({ data }: { data: { score: number; count: number }[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="h-[220px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="score" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip {...tip} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={d.score} fill={SCORE_COLORS[i] ?? "#7c5cff"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  new: "#a1a1aa",
  contacted: "#22d3ee",
  replied: "#a78bfa",
  interested: "#fbbf24",
  closed: "#34d399",
  rejected: "#f87171",
};

export function StatusBreakdown({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative h-[220px] grid place-items-center"
    >
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.length ? data : [{ name: "empty", value: 1 }]}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={3}
              stroke="none"
            >
              {(data.length ? data : [{ name: "empty", value: 1 }]).map((d, i) => (
                <Cell key={i} fill={STATUS_COLORS[d.name] ?? "rgba(255,255,255,0.08)"} />
              ))}
            </Pie>
            <Tooltip {...tip} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="relative text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Total leads</div>
        <div className="font-display text-2xl font-semibold">{total}</div>
      </div>
    </motion.div>
  );
}
