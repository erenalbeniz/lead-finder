"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

const COLORS = [
  "rgba(124,92,255,0.6)",
  "rgba(34,211,238,0.6)",
  "rgba(255,92,240,0.5)",
  "rgba(52,245,197,0.5)",
];

export function AnimatedBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const next: Particle[] = Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1.5,
      duration: 9 + Math.random() * 14,
      delay: Math.random() * 6,
      color: COLORS[i % COLORS.length],
    }));
    setParticles(next);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <motion.div
        className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full"
        style={{
          background: "radial-gradient(closest-side, rgba(124,92,255,0.35), transparent)",
          filter: "blur(40px)",
        }}
        animate={{ x: [0, 60, -20, 0], y: [0, 40, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full"
        style={{
          background: "radial-gradient(closest-side, rgba(34,211,238,0.28), transparent)",
          filter: "blur(50px)",
        }}
        animate={{ x: [0, -50, 30, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(closest-side, rgba(255,92,240,0.16), transparent)",
          filter: "blur(60px)",
        }}
        animate={{ x: [-20, 20, -10, -20], y: [0, -30, 30, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
          }}
          animate={{
            y: ["-12%", "12%", "-6%"],
            opacity: [0.15, 0.7, 0.15],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
