"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { rules, compliance, heatmapLevels } from "@/lib/constants";
import { reveal, staggerContainer } from "@/lib/animations";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const heatmapColors = [
  "var(--surface)",
  "rgba(200,200,210,0.14)",
  "rgba(200,200,210,0.32)",
  "rgba(200,200,210,0.56)",
  "rgba(200,200,210,0.80)",
];

export default function CompliancePreview() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section id="compliance" className="px-6 md:px-15 py-16 md:py-25" ref={ref}>
      <div className="max-w-300 mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
        {/* Left */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          <motion.div
            variants={reveal}
            className="text-[10px] tracking-[0.15em] uppercase text-text-secondary mb-4"
          >
            Self-control made measurable
          </motion.div>
          <motion.h2
            variants={reveal}
            className="font-display font-bold tracking-[-0.03em] leading-[1.15] mb-4 text-text-primary"
            style={{ fontSize: "clamp(28px, 5vw, 52px)" }}
          >
            It&apos;s not
            <br />
            &ldquo;I slipped.&rdquo;
            <br />
            It&apos;s{" "}
            <em
              style={{
                fontFamily: "var(--font-fraunces), serif",
                fontStyle: "italic",
                fontWeight: 300,
              }}
            >
              83%.
            </em>
          </motion.h2>
          <motion.p
            variants={reveal}
            className="text-[13px] text-text-secondary leading-[1.9] max-w-120 tracking-[0.02em] mt-5"
          >
            Three rules. Seven days. Every day is binary — you either held the
            line or you didn&apos;t. The number removes the emotional fog and
            gives you something to improve.
          </motion.p>

          <motion.div variants={reveal} className="mt-8">
            <div className="flex flex-wrap gap-0.75">
              {heatmapLevels.map((level, i) => (
                <div
                  key={i}
                  className="w-3.5 h-3.5 rounded-xs"
                  style={{
                    background: heatmapColors[level],
                    border: "1px solid var(--border)",
                  }}
                />
              ))}
            </div>
            <div className="text-[10px] text-text-secondary mt-2 tracking-[0.04em]">
              30-day compliance heatmap
            </div>
          </motion.div>
        </motion.div>

        {/* Right */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="rounded-xl p-5 md:p-8 overflow-x-auto"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex justify-between items-end mb-7">
            <div className="text-[11px] text-text-secondary tracking-[0.04em]">
              Week of Mar 16 – Mar 22
            </div>
            <div className="font-display font-bold text-[32px] tracking-[-0.03em] text-text-primary">
              83%
            </div>
          </div>

          <table className="w-full border-collapse min-w-85">
            <thead>
              <tr>
                <th className="text-left text-[9px] tracking-[0.08em] uppercase text-text-secondary pb-3 font-normal">
                  Rule
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    className="text-center text-[9px] tracking-[0.08em] uppercase text-text-secondary pb-3 font-normal"
                  >
                    {d}
                  </th>
                ))}
                <th className="text-right text-[9px] tracking-[0.08em] uppercase text-text-secondary pb-3 font-normal">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, ri) => {
                const row = compliance[ri];
                const pct = Math.round(
                  (row.reduce((a, b) => a + b, 0) / 7) * 100,
                );
                return (
                  <tr key={rule}>
                    <td className="text-[11px] text-text-mid tracking-[0.02em] py-2 pr-2 whitespace-nowrap">
                      {rule}
                    </td>
                    {row.map((val, di) => (
                      <td key={di} className="text-center py-2">
                        <span
                          className="inline-block w-5.5 h-5.5 rounded-sm"
                          style={{
                            background: val
                              ? "rgba(200,200,210,0.18)"
                              : "transparent",
                            border: `1px solid ${val ? "rgba(200,200,210,0.25)" : "var(--border)"}`,
                          }}
                        />
                      </td>
                    ))}
                    <td className="text-right text-[11px] text-text-mid tracking-[0.03em] py-2">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
