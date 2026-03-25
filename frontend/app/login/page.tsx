"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;

    setTimeout(() => {
      setLoading(false);
      if (email !== "demo@ascent.app") {
        setError("Incorrect email or password. Try again.");
      } else {
        window.location.href = "/";
      }
    }, 1200);
  }

  return (
    <div className="min-h-screen flex flex-col relative" style={{ zIndex: 1 }}>
      {/* grid bg */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%,black,transparent)",
          zIndex: 0,
        }}
      />

      <nav
        className="px-6 md:px-10 py-5 flex items-center justify-between border-b relative"
        style={{ borderColor: "var(--border)", zIndex: 1 }}
      >
        <Link
          href="/"
          className="font-display text-[15px] font-bold tracking-[0.01em] text-text-primary no-underline flex items-center gap-2.5"
        >
          <img src="/logo.svg" alt="Ascent" className="w-5 h-5" />
          Ascent
        </Link>
        <div className="text-[12px] text-text-secondary tracking-[0.03em] hidden sm:block">
          No account?{" "}
          <Link
            href="/signup"
            className="text-text-mid no-underline border-b hover:text-text-primary transition-colors"
            style={{ borderColor: "var(--border)" }}
          >
            Request access
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12 relative" style={{ zIndex: 1 }}>
        <div className="w-full max-w-[400px]">
          <div className="text-[10px] tracking-[0.15em] uppercase text-text-secondary mb-3.5 flex items-center gap-2.5">
            <span className="w-5 h-px opacity-40" style={{ background: "var(--text-secondary)" }} />
            Welcome back
          </div>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.03em] mb-1.5">
            Sign <em className="font-serif font-light not-italic text-text-mid">in.</em>
          </h1>
          <p className="text-[12px] text-text-secondary tracking-[0.03em] mb-9 leading-[1.6]">
            Enter your credentials to access your dashboard.
          </p>

          {error && (
            <div
              className="rounded-md px-3.5 py-2.5 text-[12px] tracking-[0.02em] mb-4"
              style={{
                background: "rgba(217,107,107,0.08)",
                border: "1px solid rgba(217,107,107,0.2)",
                color: "rgba(217,107,107,0.9)",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-[0.1em] uppercase text-text-secondary">
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="rounded-[7px] px-3.5 py-[11px] text-[13px] text-text-primary outline-none transition-colors"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-mid)",
                  fontFamily: "var(--font-mono)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.22)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.13)")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-1.5">
                <label className="text-[10px] tracking-[0.1em] uppercase text-text-secondary">
                  Password
                </label>
                <a
                  href="#"
                  className="text-[11px] text-text-secondary tracking-[0.03em] no-underline hover:text-text-mid transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="rounded-[7px] px-3.5 py-[11px] text-[13px] text-text-primary outline-none transition-colors"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-mid)",
                  fontFamily: "var(--font-mono)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.22)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.13)")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full py-[13px] rounded-[7px] text-[13px] font-medium tracking-[0.04em] cursor-pointer transition-opacity disabled:opacity-40"
              style={{
                background: "var(--text-primary)",
                color: "var(--bg)",
                fontFamily: "var(--font-mono)",
                border: "none",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-1">
            <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-[10px] text-text-secondary tracking-[0.06em]">or</span>
            <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <button
            onClick={() => alert("Google OAuth — wire up in production")}
            className="w-full py-[11px] rounded-[7px] text-[12px] tracking-[0.04em] cursor-pointer flex items-center justify-center gap-2 transition-colors"
            style={{
              background: "none",
              border: "1px solid var(--border-mid)",
              color: "var(--text-mid)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span className="text-[15px]">G</span>
            Continue with Google
          </button>

          <div className="mt-6 text-center text-[12px] text-text-secondary tracking-[0.03em]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-text-mid no-underline border-b hover:text-text-primary transition-colors"
              style={{ borderColor: "var(--border)" }}
            >
              Sign up here
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
