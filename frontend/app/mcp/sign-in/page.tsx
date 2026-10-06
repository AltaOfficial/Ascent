"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { apiFetch, clearTokenCookie } from "@/lib/api";

// Sign-in step of the MCP OAuth flow (run by @rekog/mcp-nest on the backend).
// The backend sends the browser here with ?callback=<backend>/callback; after
// the user confirms, we return there with a short-lived handoff token.

type Me = { firstName: string; lastName: string; email: string };

const API_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").origin;

const CAPABILITIES = [
  "See your tasks, projects, milestones and rank",
  "Create and update tasks, subtasks and milestones",
  "Start and stop timers and log time",
  "Mark compliance and log urges",
];

function hasSession(): boolean {
  return /(?:^|;\s*)access_token=/.test(document.cookie);
}

/** Only ever hand the token back to our own backend. */
function safeCallback(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.origin === API_ORIGIN ? url.toString() : null;
  } catch {
    return null;
  }
}

function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callback = safeCallback(searchParams.get("callback"));
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(
    callback ? null : "This sign-in link is invalid. Start again from Claude.",
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!callback) return;
    const here = `/mcp/sign-in?${searchParams.toString()}`;
    const toLogin = () => router.replace(`/login?next=${encodeURIComponent(here)}`);
    if (!hasSession()) {
      toLogin();
      return;
    }
    apiFetch<Me>("/users/me")
      .then(setMe)
      .catch(() => {
        // Expired session: sign in again, then come back here
        clearTokenCookie();
        toLogin();
      });
  }, [callback, searchParams, router]);

  async function connect() {
    if (!callback) return;
    setSubmitting(true);
    try {
      const { handoff } = await apiFetch<{ handoff: string }>("/auth/mcp-handoff", { method: "POST" });
      const url = new URL(callback);
      url.searchParams.set("handoff", handoff);
      window.location.href = url.toString();
    } catch {
      setError("Something went wrong. Try connecting again from Claude.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-105 rounded-xl border p-7"
        style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
      >
        <div className="flex items-center gap-2.5 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="w-5 h-5" />
          <span
            className="text-[15px] font-semibold tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Ascent
          </span>
        </div>

        {error ? (
          <p className="text-[13px] leading-relaxed" style={{ color: "rgba(217,107,107,0.9)" }}>
            {error}
          </p>
        ) : !me ? (
          <div className="flex gap-1 py-10 justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--border-mid)", animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        ) : (
          <>
            <div
              className="w-10 h-10 rounded-lg border flex items-center justify-center mb-4"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-mid)", color: "var(--text-mid)" }}
            >
              <ShieldCheck size={18} strokeWidth={1.75} />
            </div>
            <h1
              className="text-[18px] font-semibold tracking-[-0.02em] leading-snug"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Connect Claude to your Ascent account?
            </h1>
            <p className="text-[12px] mt-1.5" style={{ color: "var(--text-secondary)" }}>
              Signed in as {me.firstName} {me.lastName} ({me.email})
            </p>
            <ul className="flex flex-col gap-2.5 mt-6">
              {CAPABILITIES.map((capability) => (
                <li key={capability} className="flex items-start gap-2.5 text-[12px] leading-snug" style={{ color: "var(--text-mid)" }}>
                  <Check size={13} className="shrink-0 mt-0.5" style={{ color: "rgba(107,187,138,0.9)" }} />
                  {capability}
                </li>
              ))}
            </ul>
            <p className="text-[11px] mt-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              It can&apos;t delete anything.
            </p>
            <div className="flex gap-2 mt-7">
              <button
                onClick={() => window.history.back()}
                disabled={submitting}
                className="flex-1 h-10 rounded-lg border text-[12px] transition-colors disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "none", fontFamily: "var(--font-mono)" }}
              >
                Cancel
              </button>
              <button
                onClick={connect}
                disabled={submitting}
                className="flex-1 h-10 rounded-lg text-[12px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)", border: "none" }}
              >
                {submitting ? "Connecting…" : "Connect"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function McpSignInPage() {
  return (
    <Suspense fallback={null}>
      <SignIn />
    </Suspense>
  );
}
