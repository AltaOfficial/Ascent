"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { reveal } from "@/lib/animations";

export default function WaitlistCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  function handleSubmit() {
    if (!email.includes("@")) {
      setError(true);
      return;
    }
    setError(false);
    setSubmitted(true);
  }

  return (
    <section
      id="waitlist"
      className="px-6 md:px-15 py-24 md:py-30 text-center relative overflow-hidden"
      ref={ref}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(200,200,210,0.03), transparent)",
        }}
      />

      <motion.div
        variants={reveal}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="relative z-10"
      >
        <h2
          className="font-display font-extrabold tracking-[-0.04em] leading-none mb-6 text-text-primary"
          style={{ fontSize: "clamp(32px, 6vw, 72px)" }}
        >
          Start building
          <br />
          the evidence.
        </h2>
        <p className="text-[13px] text-text-secondary tracking-[0.03em] mb-10 md:mb-12 leading-[1.8]">
          Ascent is in active development. Join the waitlist for early access.
        </p>

        {!submitted ? (
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center w-full max-w-xs sm:max-w-105 mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="flex-1 rounded-[7px] text-text-primary font-mono text-[12px] px-4 py-3 outline-none transition-colors duration-150 placeholder:text-text-secondary"
              style={{
                background: "var(--surface)",
                border: `1px solid ${error ? "rgba(217,107,107,0.4)" : "var(--border-mid)"}`,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = error ? "rgba(217,107,107,0.5)" : "rgba(200,200,210,0.3)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = error ? "rgba(217,107,107,0.4)" : "var(--border-mid)")}
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              className="bg-text-primary text-bg font-mono text-[12px] font-medium px-7 py-3 rounded-[7px] border-none cursor-pointer tracking-[0.04em] hover:opacity-90 transition-opacity"
            >
              Request Access
            </motion.button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[13px] text-text-mid tracking-[0.04em]"
          >
            You&apos;re on the list. We&apos;ll reach out when early access opens.
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
