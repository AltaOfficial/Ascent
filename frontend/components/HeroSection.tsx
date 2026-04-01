"use client";

import { motion } from "framer-motion";

const ease = "easeOut" as const;

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease, delay },
  };
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 md:px-15 pt-30 pb-20 relative text-center overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      {/* Momentum pill */}
      <motion.div
        {...fadeUp(0.05)}
        className="inline-flex items-center gap-2 border rounded-[20px] px-3.5 py-1.5 text-[11px] text-text-secondary tracking-[0.04em] mb-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <span
          className="w-1.25 h-1.25 rounded-full shrink-0"
          style={{
            background: "rgba(107,187,138,0.7)",
            animation: "blink 1.4s infinite",
          }}
        />
        Now in development · MVP shipping Q2 2026
      </motion.div>

      {/* Eyebrow */}
      <motion.div
        {...fadeUp(0)}
        className="text-[10px] tracking-[0.2em] uppercase text-text-secondary mb-7"
      >
        Personal Operating System
      </motion.div>

      {/* Headline */}
      <motion.h1
        {...fadeUp(0.1)}
        className="font-display font-extrabold leading-[1.1] tracking-[-0.04em] mb-3"
        style={{ fontSize: "clamp(48px, 8vw, 96px)" }}
      >
        No fog.
        <br />
        Just{" "}
        <em
          style={{
            fontFamily: "var(--font-fraunces), serif",
            fontStyle: "italic",
            fontWeight: 300,
            color: "var(--text-mid)",
          }}
        >
          clarity.
        </em>
      </motion.h1>

      {/* Sub */}
      <motion.p
        {...fadeUp(0.2)}
        className="text-[13px] md:text-[14px] text-text-secondary tracking-[0.02em] leading-[1.8] max-w-120 mx-auto mt-5 mb-12 px-2"
      >
        Every session logged, every rule held or broken, every hour allocated —
        Ascent turns your daily behavior into a record of the person you&apos;re
        building toward.
      </motion.p>

      {/* CTAs */}
      <motion.div
        {...fadeUp(0.3)}
        className="flex flex-col sm:flex-row items-center gap-3 justify-center w-full max-w-xs sm:max-w-none"
      >
        <button
          onClick={() => scrollTo("waitlist")}
          className="w-full sm:w-auto bg-text-primary text-bg font-mono text-[12px] font-medium px-7 py-3 rounded-[7px] border-none cursor-pointer tracking-[0.04em] hover:opacity-90 transition-opacity"
        >
          Join the Waitlist
        </button>
        <button
          onClick={() => scrollTo("features")}
          className="w-full sm:w-auto bg-transparent text-text-secondary font-mono text-[12px] px-6 py-3 rounded-[7px] cursor-pointer tracking-[0.04em] hover:text-text-mid transition-colors duration-150"
          style={{ border: "1px solid var(--border)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-mid)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = "var(--border)")
          }
        >
          See How It Works
        </button>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        {...fadeUp(0.5)}
        className="mt-16 text-[10px] tracking-widest uppercase text-text-secondary flex flex-col items-center gap-2"
      >
        <div
          className="w-px h-10"
          style={{
            background:
              "linear-gradient(to bottom, var(--text-secondary), transparent)",
            animation: "scrollPulse 2s infinite",
          }}
        />
        <span>Scroll</span>
      </motion.div>
    </section>
  );
}
