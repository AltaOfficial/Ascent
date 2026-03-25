"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { RANKS } from "@/lib/constants";
import { reveal, staggerContainer } from "@/lib/animations";

export default function RanksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section id="ranks" className="px-6 md:px-15 py-16 md:py-25" ref={ref}>
      <div className="max-w-300 mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          <motion.div variants={reveal} className="text-[10px] tracking-[0.15em] uppercase text-text-secondary mb-4">
            Identity-based progress
          </motion.div>
          <motion.h2
            variants={reveal}
            className="font-display font-bold tracking-[-0.03em] leading-[1.15] mb-4 text-text-primary"
            style={{ fontSize: "clamp(28px, 5vw, 52px)" }}
          >
            Your rank reflects
            <br />
            who you are now.
          </motion.h2>
          <motion.p variants={reveal} className="text-[13px] text-text-secondary leading-[1.9] max-w-120 tracking-[0.02em]">
            Based on your rolling 7-day average of deep work hours. No shame at any level —
            just honest classification. Identity-based dopamine beats point-based dopamine.
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mt-10 md:mt-14"
        >
          {RANKS.map((rank) => (
            <motion.div
              key={rank.name}
              variants={reveal}
              className="relative overflow-hidden rounded-[10px] px-4 md:px-5 py-5 md:py-6 transition-colors duration-200 cursor-default"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-mid)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              }}
            >
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                initial={{ scaleX: 0 }}
                animate={inView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                style={{ background: rank.color, transformOrigin: "left" }}
              />
              <span className="block text-xl mb-3.5 opacity-65">{rank.icon}</span>
              <div className="font-display font-bold text-[14px] tracking-[-0.01em] mb-1 text-text-primary">
                {rank.name}
              </div>
              <div className="text-[10px] text-text-secondary tracking-[0.04em] mb-3">
                {rank.range}
              </div>
              <div className="text-[10px] text-text-secondary leading-[1.7] tracking-[0.02em]">
                {rank.desc}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
