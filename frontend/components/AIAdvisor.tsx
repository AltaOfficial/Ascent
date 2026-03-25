"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { reveal, staggerContainer } from "@/lib/animations";

const advisorPoints = [
  {
    icon: "■",
    title: "Allocation Check",
    desc: "Cross-references your declared priority order against actual time data. Flags misalignment without drama.",
  },
  {
    icon: "▲",
    title: "Leverage Evaluation",
    desc: "Paste any task. It evaluates against your project stage, revenue status, and current bottleneck.",
  },
  {
    icon: "◇",
    title: "Weekly Brief",
    desc: "One tap generates: execution summary, allocation shift, misalignment, and 2–3 specific adjustments. Operator tone. No fluff.",
  },
  {
    icon: "◆",
    title: "Persistent Memory",
    desc: "Stores your stage, bottleneck, constraints, and priorities. Every response is grounded in your actual context.",
  },
];

export default function AIAdvisor() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section id="advisor" className="px-6 md:px-15 py-16 md:py-25" ref={ref}>
      <div className="max-w-300 mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          <motion.div variants={reveal} className="text-[10px] tracking-[0.15em] uppercase text-text-secondary mb-4">
            AI Advisory Layer
          </motion.div>
          <motion.h2
            variants={reveal}
            className="font-display font-bold tracking-[-0.03em] leading-[1.15] mb-4 text-text-primary"
            style={{ fontSize: "clamp(28px, 5vw, 52px)" }}
          >
            Externalized
            <br />
            executive clarity.
          </motion.h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-start mt-12 md:mt-16"
        >
          {/* Chat preview */}
          <motion.div
            variants={reveal}
            className="rounded-xl p-6 flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="self-end max-w-[85%]">
              <div className="text-[9px] tracking-[0.1em] uppercase text-text-secondary mb-1.5 text-right">
                You
              </div>
              <div
                className="rounded-lg px-3.5 py-2.5 text-[12px] text-text-mid tracking-[0.01em] text-right"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                Am I allocating correctly this week?
              </div>
            </div>

            <div className="max-w-[85%]">
              <div className="text-[9px] tracking-[0.1em] uppercase text-text-secondary mb-1.5">
                Advisor
              </div>
              <div className="text-[12px] text-text-primary leading-[1.75] tracking-[0.01em]">
                Revenue allocation is at 12% this week. Your declared priority is SaaS.
                <br /><br />
                School is at 44%. That&apos;s appropriate given the exam on Mar 28.
                <br /><br />
                After the exam: shift revenue allocation to at least 30% before expanding scope on infra.
              </div>
            </div>

            <div className="self-end max-w-[85%]">
              <div
                className="rounded-lg px-3.5 py-2.5 text-[12px] text-text-mid tracking-[0.01em] text-right"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                Is adding Sentry error monitoring high leverage right now?
              </div>
            </div>

            <div className="max-w-[85%]">
              <div className="text-[12px] text-text-primary leading-[1.75] tracking-[0.01em]">
                Premature.
                <br /><br />
                No paying users yet. Sentry solves a production-scale problem you don&apos;t have.
                <br /><br />
                Ship core onboarding first.
              </div>
            </div>
          </motion.div>

          {/* Feature points */}
          <motion.div variants={staggerContainer} className="flex flex-col gap-4">
            {advisorPoints.map((point) => (
              <motion.div key={point.title} variants={reveal} className="flex gap-3.5 items-start">
                <div
                  className="w-7 h-7 border rounded-md flex items-center justify-center text-[11px] shrink-0 mt-0.5 text-text-mid"
                  style={{ borderColor: "var(--border)" }}
                >
                  {point.icon}
                </div>
                <div>
                  <div className="font-display font-semibold text-[13px] tracking-[-0.01em] mb-1 text-text-primary">
                    {point.title}
                  </div>
                  <div className="text-[11px] text-text-secondary leading-[1.7] tracking-[0.02em]">
                    {point.desc}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
