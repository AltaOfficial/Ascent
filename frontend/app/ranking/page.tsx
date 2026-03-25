import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata = { title: "How Ranking Works — Ascent" };

const TIERS = [
  {
    name: "Foundation",
    range: "0 – 1.5h",
    unit: "per day",
    desc: "Establishing the baseline. The act of logging consistently is the work at this stage.",
    trait: "Starting point",
    color: "rgba(200,200,210,0.35)",
  },
  {
    name: "Builder",
    range: "1.5 – 3h",
    unit: "per day",
    desc: "Consistent output forming. A pattern is visible in your data. Momentum is accumulating.",
    trait: "Pattern forming",
    color: "rgba(107,187,138,0.55)",
  },
  {
    name: "Operator",
    range: "3 – 4.5h",
    unit: "per day",
    desc: "Reliable execution. You show up regardless of motivation. No filler days at this level.",
    trait: "Reliable execution",
    color: "rgba(91,141,217,0.65)",
  },
  {
    name: "Architect",
    range: "4.5 – 6h",
    unit: "per day",
    desc: "High-leverage output. Decisions are compounding. You are in the building phase of long-term work.",
    trait: "Decisions compound",
    color: "rgba(196,127,212,0.65)",
  },
  {
    name: "Apex",
    range: "6h+",
    unit: "sustained",
    desc: "Elite sustained output. This is not a sprint — it is a stable operating level. Identity is locked at this tier.",
    trait: "Identity locked",
    color: "rgba(217,167,91,0.7)",
  },
];

const STEPS = [
  {
    num: "1",
    title: "Log a session",
    desc: "Start the timer on any task. When you stop, that session is recorded with its actual duration. Sessions are tagged to a category automatically based on the project.",
  },
  {
    num: "2",
    title: "Daily total is computed",
    desc: "At midnight, all sessions for that day are summed into your daily output figure. Rest days register as 0 — no penalty, just data.",
  },
  {
    num: "3",
    title: "7-day weighted average is updated",
    desc: "Your rolling average updates daily. The weighting formula applies a decay coefficient — recent output counts more. This is the single number your rank is derived from.",
  },
  {
    num: "4",
    title: "Rank is assigned",
    desc: "Your rolling average is compared against the five tier thresholds. The result is your current rank. It can move up or down daily as your average shifts.",
  },
];

const PHIL = [
  {
    pill: "Rolling average",
    good: true,
    title: "Rewards trajectory, not perfection",
    body: "A streak breaks the moment you miss a day. A rolling average absorbs one bad day without catastrophe. What matters is the direction of the line — not whether it's unbroken.",
  },
  {
    pill: "Streaks",
    good: false,
    title: "Punish recovery",
    body: "Streak systems create an all-or-nothing psychology. One missed day can erase weeks of progress visually, which often triggers complete abandonment. That's a design flaw, not a motivation tool.",
  },
  {
    pill: "Identity-based ranks",
    good: true,
    title: "Classification over competition",
    body: "You are not competing against other users. You are classified by your own output. \"Architect\" means you are operating at Architect level — that's a fact about you, not a trophy.",
  },
  {
    pill: "Leaderboards",
    good: false,
    title: "External validation dependency",
    body: "Leaderboards tie your sense of progress to other people's behavior. If everyone improves, your rank drops. Ascent's system is self-referential — your rank only reflects you.",
  },
  {
    pill: "No shame at any level",
    good: true,
    title: "Foundation is a valid operating state",
    body: "If you're averaging 0.8h of deep work per day, Foundation is your current reality. That's the starting point, not a failure state. The rank names are descriptive, not judgmental.",
  },
  {
    pill: "Resets every 90 days",
    good: true,
    title: "Prevents stagnation",
    body: "Ranks reset on a 90-day cycle. This keeps the system forward-looking — you can't coast on past output indefinitely. Each cycle is a fresh classification based on recent behavior.",
  },
];

export default function RankingPage() {
  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-100 px-6 md:px-15 py-[18px] flex items-center justify-between border-b"
        style={{
          borderColor: "var(--border)",
          background: "rgba(10,10,12,0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display text-[15px] font-bold tracking-[0.01em] text-text-primary no-underline"
        >
          <img src="/logo.svg" alt="Ascent" className="w-5 h-5" />
          Ascent
        </Link>
        <Link
          href="/"
          className="text-[11px] text-text-secondary tracking-[0.05em] no-underline hover:text-text-mid transition-colors duration-150"
        >
          ← Back to Ascent
        </Link>
      </nav>

      {/* Hero */}
      <div className="pt-[100px] md:pt-[140px] pb-12 md:pb-20 px-6 md:px-15 max-w-[800px] mx-auto text-center">
        <div className="text-[10px] tracking-[0.15em] uppercase text-text-secondary mb-[18px]">
          The Rank System
        </div>
        <h1
          className="font-display font-bold tracking-[-0.04em] leading-none mb-5"
          style={{ fontSize: "clamp(40px,6vw,68px)" }}
        >
          Classification,
          <br />
          not{" "}
          <em className="font-serif font-light not-italic text-text-mid">
            competition.
          </em>
        </h1>
        <p className="text-[13px] text-text-secondary leading-[1.9] tracking-[0.02em] max-w-[520px] mx-auto">
          Your Ascent rank is a mirror, not a scoreboard. It reflects where you
          are operating right now — based on what you actually did, not what you
          planned.
        </p>
      </div>

      <div className="max-w-[900px] mx-auto px-6 md:px-15 pb-16 md:pb-[100px]">

        {/* Tiers */}
        <div
          className="flex flex-col border rounded-xl overflow-hidden mb-16"
          style={{ borderColor: "var(--border)" }}
        >
          {TIERS.map((t, i) => (
            <div
              key={t.name}
              className="flex flex-col md:grid border-b last:border-b-0 hover:bg-surface transition-colors duration-150"
              style={{
                gridTemplateColumns: "200px 1fr 1fr",
                borderColor: "var(--border)",
              }}
            >
              {/* Identity */}
              <div
                className="px-5 py-5 md:p-7 flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-2 md:border-r border-b md:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="text-[18px] md:text-[22px] opacity-65 leading-none">▲</div>
                <div className="font-display text-[15px] md:text-[16px] font-bold tracking-[-0.01em]">
                  {t.name}
                </div>
                <div
                  className="h-[2px] w-8 md:w-12 rounded-[1px] md:mt-1 ml-auto md:ml-0"
                  style={{ background: t.color }}
                />
              </div>
              {/* Range */}
              <div
                className="px-5 py-4 md:p-7 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center md:border-r border-b md:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="font-display text-[16px] md:text-[18px] font-semibold tracking-[-0.02em] md:mb-1">
                  {t.range}
                </div>
                <div className="text-[10px] text-text-secondary tracking-[0.06em] uppercase">
                  {t.unit}
                </div>
              </div>
              {/* Desc */}
              <div className="px-5 py-4 md:p-7 flex flex-col justify-center">
                <div className="text-[12px] text-text-secondary leading-[1.8] tracking-[0.02em]">
                  {t.desc}
                </div>
                <div className="text-[10px] text-text-secondary tracking-[0.06em] uppercase mt-2 opacity-60">
                  {t.trait}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-px mb-16" style={{ background: "var(--border)" }} />

        {/* Calculation */}
        <div className="mb-16">
          <div className="font-display text-[22px] font-bold tracking-[-0.02em] mb-2">
            How It's Calculated
          </div>
          <p className="text-[12px] text-text-secondary leading-[1.8] tracking-[0.02em] mb-8">
            Your rank is derived from a single rolling metric — your 7-day
            weighted average of deep work hours. No subjective scoring, no
            manual input beyond your sessions.
          </p>

          <div
            className="rounded-[10px] p-7 mb-5 border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="text-[9px] tracking-[0.12em] uppercase text-text-secondary mb-3">
              Core Formula
            </div>
            <div className="font-display text-[18px] font-semibold tracking-[-0.01em]">
              Rank = f(
              <em className="font-serif font-light not-italic text-text-mid">
                weighted 7-day avg
              </em>{" "}
              of logged hours)
            </div>
            <div className="text-[11px] text-text-secondary mt-2.5 leading-[1.7] tracking-[0.02em]">
              Each of the last 7 days is weighted, with more recent days
              carrying slightly more influence. This means a strong day today
              has more impact than a strong day 6 days ago — rewarding recency
              without punishing past slumps.
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className="flex gap-5 items-start rounded-lg p-5 border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="font-display text-[20px] font-bold text-text-secondary w-6 leading-none flex-shrink-0">
                  {s.num}
                </div>
                <div>
                  <div className="font-display text-[13px] font-semibold mb-1 tracking-[-0.01em]">
                    {s.title}
                  </div>
                  <div className="text-[11px] text-text-secondary leading-[1.75] tracking-[0.02em]">
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px mb-16" style={{ background: "var(--border)" }} />

        {/* Philosophy */}
        <div className="mb-16">
          <div className="font-display text-[22px] font-bold tracking-[-0.02em] mb-2">
            Why It Works This Way
          </div>
          <p className="text-[12px] text-text-secondary leading-[1.8] tracking-[0.02em] mb-7">
            Most productivity systems use streaks or point totals. Ascent
            doesn't. Here's why each design decision was made deliberately.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PHIL.map((p) => (
              <div
                key={p.title}
                className="rounded-[10px] p-6 border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div
                  className="inline-block text-[9px] tracking-[0.1em] uppercase px-2.5 py-[3px] rounded-full border mb-2"
                  style={
                    p.good
                      ? {
                          borderColor: "rgba(107,187,138,0.25)",
                          color: "rgba(107,187,138,0.7)",
                        }
                      : {
                          borderColor: "rgba(217,107,107,0.2)",
                          color: "rgba(217,107,107,0.6)",
                        }
                  }
                >
                  {p.pill}
                </div>
                <div className="font-display text-[13px] font-semibold mb-2 tracking-[-0.01em]">
                  {p.title}
                </div>
                <div className="text-[11px] text-text-secondary leading-[1.8] tracking-[0.02em]">
                  {p.body}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px mb-16" style={{ background: "var(--border)" }} />

        {/* Reset */}
        <div
          className="rounded-[10px] p-8 border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="font-display text-[15px] font-semibold mb-2.5 tracking-[-0.01em]">
            The 90-Day Reset
          </div>
          <p className="text-[13px] text-text-secondary leading-[1.9] tracking-[0.02em] mb-2.5">
            Every 90 days, your rank resets to be recalculated from scratch.
            This is intentional. It prevents a high rank from becoming a resting
            identity that requires no maintenance.
          </p>
          <p className="text-[13px] text-text-secondary leading-[1.9] tracking-[0.02em] mb-2.5">
            Your historical rank data is preserved in analytics — you can see
            what tier you held in previous cycles. The reset affects only the
            live dashboard display and the active classification.
          </p>
          <p className="text-[13px] text-text-secondary leading-[1.9] tracking-[0.02em]">
            The reset date is shown on your dashboard so you always know how far
            into the current cycle you are.
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
}
