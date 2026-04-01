"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setTokenCookie } from "@/lib/api";

function formatInvite(val: string) {
  let v = val.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
  if (v.length > 9) v = v.slice(0, 9) + "-" + v.slice(9);
  return v.slice(0, 14);
}

function getStrength(val: string) {
  if (!val) return { score: 0, label: "" };
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
  if (val.length >= 12 && /[^A-Za-z0-9]/.test(val)) score++;
  const labels = ["", "Weak", "OK", "Strong"];
  return { score, label: labels[score] };
}

export default function SignupPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLocked, setInviteLocked] = useState(false);
  const [emailLocked, setEmailLocked] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState("");
  const [hasInviteParam, setHasInviteParam] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [inviteValid, setInviteValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inv = params.get("invite");
    const em = params.get("email");
    if (inv) {
      setInviteCode(inv.toUpperCase());
      setInviteLocked(true);
      setHasInviteParam(true);
    }
    if (em) {
      setPrefillEmail(em);
      setEmailLocked(true);
    }
  }, []);

  const strength = getStrength(password);

  async function validateInvite() {
    if (inviteCode.length < 14) {
      setError("Invite code must be 12 characters.");
      return;
    }
    setError("");
    try {
      const result = await apiFetch<{ valid: boolean }>("/invite/check", {
        method: "POST",
        body: JSON.stringify({ code: inviteCode }),
      });
      if (result.valid) {
        setInviteValid(true);
      } else {
        setError("Invalid invite code.");
      }
    } catch {
      setError("Could not verify invite code.");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const firstName = (form.elements.namedItem("firstName") as HTMLInputElement).value;
    const lastName = (form.elements.namedItem("lastName") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const pw = (form.elements.namedItem("password") as HTMLInputElement).value;
    const cpw = (form.elements.namedItem("confirm") as HTMLInputElement).value;
    setError("");

    if (pw !== cpw) { setError("Passwords do not match."); return; }
    if (pw.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const result = await apiFetch<{ access_token: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, email, password: pw, inviteCode }),
      });
      setTokenCookie(result.access_token);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const barClass = (index: number) => {
    if (strength.score === 0) return "";
    if (strength.score === 1 && index === 0) return "bg-[rgba(217,107,107,0.6)]";
    if (strength.score === 2 && index <= 1) return "bg-[rgba(217,184,107,0.6)]";
    if (strength.score === 3) return "bg-[rgba(107,187,138,0.55)]";
    return "";
  };

  return (
    <div className="min-h-screen flex flex-col relative" style={{ zIndex: 1 }}>
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
          className="flex items-center gap-2.5 font-display text-[15px] font-bold tracking-[0.01em] text-text-primary no-underline"
        >
          <img src="/logo.svg" alt="Ascent" className="w-5 h-5" />
          Ascent
        </Link>
        <div className="text-[12px] text-text-secondary tracking-[0.03em] hidden sm:block">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-text-mid no-underline border-b hover:text-text-primary transition-colors"
            style={{ borderColor: "var(--border)" }}
          >
            Sign in
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12 relative" style={{ zIndex: 1 }}>
        <div className="w-full max-w-[420px]">

          {success ? (
            <div className="text-center py-4">
              <span className="text-[36px] block mb-4">✓</span>
              <div className="font-display text-[22px] font-bold tracking-[-0.02em] mb-2">
                You&apos;re in.
              </div>
              <p className="text-[13px] text-text-secondary leading-[1.7] tracking-[0.02em]">
                Redirecting to your dashboard...
              </p>
            </div>
          ) : (
            <>
              {hasInviteParam ? (
                <div
                  className="rounded-[7px] px-4 py-3 mb-7 flex items-center gap-2.5"
                  style={{ background: "rgba(107,187,138,0.1)", border: "1px solid rgba(107,187,138,0.22)" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "rgba(107,187,138,0.9)" }} />
                  <div className="text-[12px] tracking-[0.03em] leading-[1.5]" style={{ color: "rgba(107,187,138,0.9)" }}>
                    You&apos;ve been invited.{" "}
                    {prefillEmail && <strong className="font-medium">{prefillEmail}</strong>}
                    {" "}— create your account below.
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-[7px] px-4 py-3 mb-7 text-[12px] text-text-mid tracking-[0.03em] leading-[1.6]"
                  style={{ background: "rgba(200,200,215,0.04)", border: "1px solid var(--border-mid)" }}
                >
                  Ascent is currently invite-only. Enter your invite code below, or{" "}
                  <Link href="/#waitlist" className="text-text-mid no-underline border-b" style={{ borderColor: "var(--border)" }}>
                    join the waitlist
                  </Link>{" "}
                  to get access when a spot opens.
                </div>
              )}

              <div className="text-[10px] tracking-[0.15em] uppercase text-text-secondary mb-3.5 flex items-center gap-2.5">
                <span className="w-5 h-px opacity-40" style={{ background: "var(--text-secondary)" }} />
                Beta access
              </div>
              <h1 className="font-display text-[28px] font-bold tracking-[-0.03em] mb-1.5">
                Create your <em className="font-serif font-light not-italic text-text-mid">account.</em>
              </h1>
              <p className="text-[12px] text-text-secondary tracking-[0.03em] mb-8 leading-[1.6]">
                One account. Every layer of Ascent.
              </p>

              {error && (
                <div
                  className="rounded-md px-3.5 py-2.5 text-[12px] tracking-[0.02em] mb-4"
                  style={{ background: "rgba(217,107,107,0.08)", border: "1px solid rgba(217,107,107,0.2)", color: "rgba(217,107,107,0.9)" }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: "First name", name: "firstName" }, { label: "Last name", name: "lastName" }].map(({ label, name }) => (
                    <div key={name} className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-[0.1em] uppercase text-text-secondary">{label}</label>
                      <input
                        type="text"
                        name={name}
                        placeholder={name === "firstName" ? "Jaedon" : "Farr"}
                        autoComplete={name === "firstName" ? "given-name" : "family-name"}
                        required
                        className="rounded-[7px] px-3.5 py-[11px] text-[13px] text-text-primary outline-none"
                        style={{ background: "var(--surface)", border: "1px solid var(--border-mid)", fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] tracking-[0.1em] uppercase text-text-secondary">Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    defaultValue={prefillEmail}
                    disabled={emailLocked}
                    autoComplete="email"
                    required
                    className="rounded-[7px] px-3.5 py-[11px] text-[13px] text-text-primary outline-none disabled:opacity-45"
                    style={{ background: "var(--surface)", border: "1px solid var(--border-mid)", fontFamily: "var(--font-mono)" }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] tracking-[0.1em] uppercase text-text-secondary">Invite code</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="XXXX-XXXX-XXXX"
                      value={inviteCode}
                      disabled={inviteLocked}
                      onChange={(e) => setInviteCode(formatInvite(e.target.value))}
                      maxLength={14}
                      required
                      className={`w-full rounded-[7px] px-3.5 py-[11px] pr-20 text-[13px] text-text-primary outline-none tracking-[0.08em] uppercase disabled:opacity-45 ${inviteValid ? "border-[rgba(107,187,138,0.22)]" : ""}`}
                      style={{ background: "var(--surface)", border: `1px solid ${inviteValid ? "rgba(107,187,138,0.22)" : "var(--border-mid)"}`, fontFamily: "var(--font-mono)" }}
                    />
                    {!inviteLocked && (
                      <button
                        type="button"
                        onClick={validateInvite}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tracking-[0.06em] uppercase px-2.5 py-[3px] rounded-[3px] cursor-pointer transition-colors"
                        style={{ background: "var(--surface-2, #18181e)", border: "1px solid var(--border-mid)", color: "var(--text-mid)", fontFamily: "var(--font-mono)" }}
                      >
                        Verify
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] tracking-[0.1em] uppercase text-text-secondary">Password</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-[7px] px-3.5 py-[11px] text-[13px] text-text-primary outline-none"
                    style={{ background: "var(--surface)", border: "1px solid var(--border-mid)", fontFamily: "var(--font-mono)" }}
                  />
                  <div className="flex gap-1 items-center mt-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-[2px] flex-1 rounded-[1px] transition-colors duration-300 ${barClass(i) || "bg-[var(--border)]"}`}
                      />
                    ))}
                    <span className="text-[10px] text-text-secondary tracking-[0.04em] w-11 text-right">
                      {strength.label}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] tracking-[0.1em] uppercase text-text-secondary">Confirm password</label>
                  <input
                    type="password"
                    name="confirm"
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    required
                    className="rounded-[7px] px-3.5 py-[11px] text-[13px] text-text-primary outline-none"
                    style={{ background: "var(--surface)", border: "1px solid var(--border-mid)", fontFamily: "var(--font-mono)" }}
                  />
                </div>

                <div className="flex items-start gap-2.5 mt-0.5">
                  <input type="checkbox" id="terms" required className="w-3.5 h-3.5 mt-[1px] flex-shrink-0 cursor-pointer" style={{ accentColor: "var(--text-primary)" }} />
                  <label htmlFor="terms" className="text-[11px] text-text-secondary tracking-[0.02em] leading-[1.6] cursor-pointer">
                    I agree to the{" "}
                    <Link href="/terms" className="text-text-mid no-underline border-b" style={{ borderColor: "var(--border)" }}>
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-text-mid no-underline border-b" style={{ borderColor: "var(--border)" }}>
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full py-[13px] rounded-[7px] text-[13px] font-medium tracking-[0.04em] cursor-pointer transition-opacity disabled:opacity-40"
                  style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)", border: "none" }}
                >
                  {loading ? "Creating account..." : "Create account"}
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
                style={{ background: "none", border: "1px solid var(--border-mid)", color: "var(--text-mid)", fontFamily: "var(--font-mono)" }}
              >
                <span className="text-[15px]">G</span>
                Continue with Google
              </button>

              <div className="mt-6 text-center text-[12px] text-text-secondary tracking-[0.03em]">
                Already have an account?{" "}
                <Link href="/login" className="text-text-mid no-underline border-b hover:text-text-primary transition-colors" style={{ borderColor: "var(--border)" }}>
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
