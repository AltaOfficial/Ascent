"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FEATURES } from "@/lib/constants";
import { reveal, staggerContainer } from "@/lib/animations";

export default function FeaturesGrid() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section id="features" className="px-6 md:px-15 py-16 md:py-25" ref={ref}>
      <div className="max-w-300 mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          <motion.div variants={reveal} className="text-[10px] tracking-[0.15em] uppercase text-text-secondary mb-4">
            What it does
          </motion.div>
          <motion.h2
            variants={reveal}
            className="font-display font-bold tracking-[-0.03em] leading-[1.15] mb-4 text-text-primary"
            style={{ fontSize: "clamp(28px, 5vw, 52px)" }}
          >
            Everything you need.
            <br />
            Nothing you don&apos;t.
          </motion.h2>
          <motion.p variants={reveal} className="text-[13px] text-text-secondary leading-[1.9] max-w-120 tracking-[0.02em]">
            Six layers. Each one answers a specific question you&apos;re already asking yourself.
          </motion.p>
        </motion.div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mt-12 md:mt-16 border rounded-xl overflow-hidden"
          style={{ gap: "1px", background: "var(--border)", borderColor: "var(--border)" }}
        >
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="relative overflow-hidden px-6 md:px-7 py-7 md:py-8 transition-colors duration-150 cursor-default"
              style={{ background: "var(--bg)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
            >
              <span className="block text-[10px] tracking-[0.1em] text-text-secondary mb-5">
                {feat.num}
              </span>
              <span className="block text-[18px] mb-3.5 opacity-60">{feat.icon}</span>
              <div className="font-display font-semibold text-[15px] tracking-[-0.01em] mb-2.5 text-text-primary">
                {feat.title}
              </div>
              <div className="text-[11px] text-text-secondary leading-[1.75] tracking-[0.02em]">
                {feat.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
