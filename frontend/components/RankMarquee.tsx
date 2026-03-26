"use client";

import { RANKS } from "@/lib/constants";

function Track() {
  return (
    <div className="flex shrink-0" style={{ animation: "marquee 8s linear infinite", willChange: "transform" }}>
      {RANKS.map((rank, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 px-8 shrink-0"
          style={{ borderRight: i < RANKS.length - 1 ? "1px solid var(--border)" : "none" }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
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
    </div>
  );
}

export default function RankMarquee() {
  return (
    <div
      className="border-t border-b py-7 overflow-hidden relative"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="absolute top-0 bottom-0 left-0 w-30 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, var(--bg), transparent)" }}
      />
      <div
        className="absolute top-0 bottom-0 right-0 w-30 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, var(--bg), transparent)" }}
      />

      <div className="flex">
        <Track />
        <Track />
        <Track />
        <Track />
      </div>
    </div>
  );
}
