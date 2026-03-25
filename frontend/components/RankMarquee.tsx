"use client";

import { motion } from "framer-motion";
import { RANKS } from "@/lib/constants";

const items = [...RANKS, ...RANKS, ...RANKS, ...RANKS];

export default function RankMarquee() {
  return (
    <div
      className="border-t border-b py-7 overflow-hidden relative"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Fade edges */}
      <div
        className="absolute top-0 bottom-0 left-0 w-[120px] z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, var(--bg), transparent)" }}
      />
      <div
        className="absolute top-0 bottom-0 right-0 w-[120px] z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, var(--bg), transparent)" }}
      />

      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        {items.map((rank, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-8 flex-shrink-0"
            style={{ borderRight: i < items.length - 1 ? "1px solid var(--border)" : "none" }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: rank.color }}
            />
            <span className="font-display text-[12px] font-semibold tracking-[0.03em] text-text-primary">
              {rank.name}
            </span>
            <span className="text-[10px] text-text-secondary tracking-[0.03em]">
              {rank.range}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
