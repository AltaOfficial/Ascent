"use client";

import { STATS } from "@/lib/constants";

export default function StatsRow() {
  return (
    <section className="px-6 md:px-15 py-20">
      <div className="max-w-275 mx-auto">
        <div
          className="grid grid-cols-2 md:grid-cols-4 border rounded-xl overflow-hidden"
          style={{ gap: "1px", background: "var(--border)", borderColor: "var(--border)" }}
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="px-6 md:px-8 py-8 md:py-10"
              style={{ background: "var(--bg)" }}
            >
              <div className="font-display font-bold leading-none tracking-[-0.04em] mb-2 text-text-primary" style={{ fontSize: "clamp(32px, 5vw, 44px)" }}>
                {stat.num}
              </div>
              <div className="text-[11px] text-text-secondary tracking-[0.05em] uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
