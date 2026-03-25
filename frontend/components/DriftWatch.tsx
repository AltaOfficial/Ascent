"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { driftCats } from "@/lib/constants";
import { reveal, staggerContainer } from "@/lib/animations";

function DriftBars({ cats, weekKey, inView }: { cats: typeof driftCats; weekKey: "thisWeek" | "lastWeek"; inView: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {cats.map((cat) => {
        const val = cat[weekKey];
        return (
          <div key={cat.label}>
            <div className="flex justify-between text-[11px] text-text-secondary mb-1.5 tracking-[0.03em]">
              <span>{cat.label}</span>
              <span>{val}%</span>
            </div>
            <div className="h-px overflow-hidden" style={{ background: "var(--border)" }}>
              <motion.div
                className="h-px opacity-70"
                initial={{ width: "0%" }}
                animate={inView ? { width: `${val}%` } : {}}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                style={{ background: cat.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DriftWatch() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section className="px-6 md:px-15 py-16 md:py-25" ref={ref}>
      <div className="max-w-300 mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          <motion.div variants={reveal} className="text-[10px] tracking-[0.15em] uppercase text-text-secondary mb-4">
            Strategic clarity
          </motion.div>
          <motion.h2
            variants={reveal}
            className="font-display font-bold tracking-[-0.03em] leading-[1.15] mb-4 text-text-primary"
            style={{ fontSize: "clamp(28px, 5vw, 52px)" }}
          >
            See drift
            <br />
            before it costs you.
          </motion.h2>
          <motion.p variants={reveal} className="text-[13px] text-text-secondary leading-[1.9] max-w-120 tracking-[0.02em]">
            Every task is tagged by category. The dashboard shows exactly where your time went
            this week — not by feel, by data. Infra-tweaking that feels like work shows up immediately.
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10 md:mt-12"
        >
          <motion.div
            variants={reveal}
            className="rounded-[10px] p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="font-display font-semibold text-[13px] tracking-[-0.01em] mb-4.5 text-text-primary">
              This Week
            </div>
            <DriftBars cats={driftCats} weekKey="thisWeek" inView={inView} />
          </motion.div>

          <motion.div
            variants={reveal}
            className="rounded-[10px] p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="font-display font-semibold text-[13px] tracking-[-0.01em] mb-4.5 text-text-primary">
              Last Week
            </div>
            <DriftBars cats={driftCats} weekKey="lastWeek" inView={inView} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
