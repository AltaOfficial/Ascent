import Link from "next/link";
import Footer from "@/components/Footer";
import { RANKS, RANKING_CONFIG } from "@/lib/constants";

export const metadata = { title: "How Ranking Works — Ascent" };

const STEPS = [
  {
    num: "1",
    title: "Log a session",
    desc: "Start the timer on any task. Your first logged session starts the 90-day cycle clock. Before that, no cycle is active.",
  },
  {
    num: "2",
    title: "Daily score is computed",
    desc: `Hours are capped at ${RANKING_CONFIG.MAX_DAILY_HOURS}h, then scaled nonlinearly — (hours / ${RANKING_CONFIG.MAX_DAILY_HOURS})^${RANKING_CONFIG.HOUR_EXPONENT} — and multiplied by your compliance score for that day. Compliance is based on locked cycle rules only.`,
  },
  {
    num: "3",
    title: "Time-weighted average is updated",
    desc: `Each daily score is weighted by how recent it is. Entries decay with a half-life of ${RANKING_CONFIG.HALF_LIFE} days. The result: last month matters most, but the full 90 days still counts.`,
  },
  {
    num: "4",
    title: "Consistency gate is applied",
    desc: `If fewer than ${(RANKING_CONFIG.CONSISTENCY_THRESHOLD * 100).toFixed(0)}% of the last 30 days had ≥${RANKING_CONFIG.CONSISTENCY_MIN_HOURS}h logged, your rank score is halved. Consistency is measured on recent behavior, not full history.`,
  },
  {
    num: "5",
    title: "Rank is assigned",
    desc: "Your weighted score maps to a rank. Apex has an additional hard gate: you must currently be averaging the required hours and compliance — no coasting on old scores.",
  },
];

const PHIL = [
  {
    pill: "Weighted 90-day window",
    good: true,
    title: "Memory with recency bias",
    body: "Your full 90-day history counts, but recent weeks dominate. A bad start doesn't trap you — exponential decay lets you recover without erasing what you did.",
  },
  {
    pill: "Streaks",
    good: false,
    title: "Binary and fragile",
    body: "Streak systems collapse on one missed day. They create all-or-nothing psychology that triggers abandonment at the worst moment. That's a design flaw, not a motivation tool.",
  },
  {
    pill: "Compliance locked per cycle",
    good: true,
    title: "Fair scoring",
    body: "Rules you set mid-cycle don't change your current ranking score. Compliance is measured against the ruleset that was active when the cycle started — no retroactive punishment.",
  },
  {
    pill: "Leaderboards",
    good: false,
    title: "External validation dependency",
    body: "Leaderboards tie your sense of progress to other people's behavior. Ascent's system is self-referential — your rank only reflects you, not the distribution of everyone else.",
  },
  {
    pill: "Apex hard gate",
    good: true,
    title: "Can't be inherited, only earned",
    body: `Apex requires a current 14-day average of ≥${RANKING_CONFIG.APEX_HOURS}h and ≥${(RANKING_CONFIG.APEX_COMPLIANCE * 100).toFixed(0)}% compliance. Weighted history can get you close, but the gate confirms you're performing right now.`,
  },
  {
    pill: "90-day cycle reset",
    good: true,
    title: "Prevents stagnation",
    body: "Every cycle starts fresh. You can't coast on a high rank forever. The reset forces re-qualification — but your history is preserved in analytics so no data is lost.",
  },
];

export default function RankingPage() {
  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-100 px-6 md:px-15 py-4.5 flex items-center justify-between border-b"
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
      <div className="pt-25 md:pt-35 pb-12 md:pb-20 px-6 md:px-15 max-w-200 mx-auto text-center">
        <div className="text-[10px] tracking-[0.15em] uppercase text-text-secondary mb-4.5">
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
        <p className="text-[13px] text-text-secondary leading-[1.9] tracking-[0.02em] max-w-130 mx-auto">
          Your Ascent rank is a weighted reflection of the last 90 days — with
          recent weeks carrying the most weight. You can recover from a bad start.
          You cannot fake a current performance.
        </p>
      </div>

      <div className="max-w-225 mx-auto px-6 md:px-15 pb-16 md:pb-25">

        {/* Tiers */}
        <div
          className="flex flex-col border rounded-xl overflow-hidden mb-16"
          style={{ borderColor: "var(--border)" }}
        >
          {RANKS.map((rank) => (
            <div
              key={rank.name}
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
                <div
                  className="text-[18px] md:text-[22px] leading-none"
                  style={{ color: rank.color, opacity: 0.8 }}
                >
                  {rank.icon}
                </div>
                <div className="font-display text-[15px] md:text-[16px] font-bold tracking-[-0.01em]">
                  {rank.name}
                </div>
                <div
                  className="h-0.5 w-8 md:w-12 rounded-[1px] md:mt-1 ml-auto md:ml-0"
                  style={{ background: rank.color }}
                />
              </div>
              {/* Threshold */}
              <div
                className="px-5 py-4 md:p-7 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center md:border-r border-b md:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="font-display text-[16px] md:text-[18px] font-semibold tracking-[-0.02em] md:mb-1">
                  {rank.min === 0 ? "—" : `≥ ${(rank.min * 100).toFixed(0)}`}
                </div>
                <div className="text-[10px] text-text-secondary tracking-[0.06em] uppercase">
                  {rank.min === 0 ? "no threshold" : "rank score"}
                </div>
              </div>
              {/* Desc */}
              <div className="px-5 py-4 md:p-7 flex flex-col justify-center">
                <div className="text-[12px] text-text-secondary leading-[1.8] tracking-[0.02em]">
                  {rank.desc}
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
            Your rank is derived from a weighted score across a 90-day cycle.
            Recent days dominate, but the full window counts. Compliance and hours
            both factor in — neither alone is sufficient.
          </p>

          {/* Formula block */}
          <div
            className="rounded-[10px] p-7 mb-5 border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="text-[9px] tracking-[0.12em] uppercase text-text-secondary mb-4">
              Core Formula
            </div>
            <div className="flex flex-col gap-2.5 font-mono text-[12px]" style={{ color: "var(--text-mid)" }}>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>// step 1 — daily score</span>
              </div>
              <div>
                effectiveHours = min(hoursWorked,{" "}
                <span style={{ color: "var(--text-primary)" }}>{RANKING_CONFIG.MAX_DAILY_HOURS}</span>)
              </div>
              <div>
                hourFactor = (effectiveHours /{" "}
                <span style={{ color: "var(--text-primary)" }}>{RANKING_CONFIG.MAX_DAILY_HOURS}</span>)
                <span style={{ color: "var(--text-primary)" }}>^{RANKING_CONFIG.HOUR_EXPONENT}</span>
              </div>
              <div>dailyScore = hourFactor × complianceScore</div>
              <div className="mt-2">
                <span style={{ color: "var(--text-secondary)" }}>// step 2 — time weight</span>
              </div>
              <div>
                weight = 0.5 ^ (daysSinceEntry /{" "}
                <span style={{ color: "var(--text-primary)" }}>{RANKING_CONFIG.HALF_LIFE}</span>)
              </div>
              <div className="mt-2">
                <span style={{ color: "var(--text-secondary)" }}>// step 3 — weighted average</span>
              </div>
              <div>rankScore = Σ(dailyScore × weight) / Σ(weight)</div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className="flex gap-5 items-start rounded-lg p-5 border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="font-display text-[20px] font-bold text-text-secondary w-6 leading-none shrink-0">
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

        {/* Apex gate callout */}
        <div
          className="rounded-[10px] p-7 border mb-16"
          style={{
            background: "var(--surface)",
            borderColor: "rgba(232,210,120,0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: "rgba(232,210,120,0.8)", fontSize: 18 }}>◆</span>
            <div className="font-display text-[14px] font-semibold tracking-[-0.01em]">
              Apex Hard Gate
            </div>
          </div>
          <p className="text-[12px] text-text-secondary leading-[1.8] tracking-[0.02em] mb-3">
            Even if your weighted score reaches {(RANKS[RANKS.length - 1].min * 100).toFixed(0)}, Apex is
            only assigned if your <strong className="text-text-primary font-medium">last 14 days</strong> average
            ≥{RANKING_CONFIG.APEX_HOURS}h/day and ≥{(RANKING_CONFIG.APEX_COMPLIANCE * 100).toFixed(0)}%
            compliance. Below either threshold, you're placed at Elite.
          </p>
          <p className="text-[11px] text-text-secondary leading-[1.7] tracking-[0.02em] opacity-75">
            This prevents gaming the system with strong early history and recent coasting.
            Apex is earned daily, not inherited.
          </p>
        </div>

        <div className="h-px mb-16" style={{ background: "var(--border)" }} />

        {/* Philosophy */}
        <div className="mb-16">
          <div className="font-display text-[22px] font-bold tracking-[-0.02em] mb-2">
            Why It Works This Way
          </div>
          <p className="text-[12px] text-text-secondary leading-[1.8] tracking-[0.02em] mb-7">
            Every design decision was made deliberately. Here's the reasoning.
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

        {/* Cycle reset */}
        <div
          className="rounded-[10px] p-8 border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="font-display text-[15px] font-semibold mb-2.5 tracking-[-0.01em]">
            The {RANKING_CONFIG.CYCLE_DAYS}-Day Cycle
          </div>
          <p className="text-[13px] text-text-secondary leading-[1.9] tracking-[0.02em] mb-2.5">
            The cycle timer starts on your first logged session — not on signup.
            Every {RANKING_CONFIG.CYCLE_DAYS} days after that, all ranking data resets and the next
            cycle begins on your next activity.
          </p>
          <p className="text-[13px] text-text-secondary leading-[1.9] tracking-[0.02em] mb-2.5">
            Compliance rules are snapshotted at cycle start. Any rules added
            mid-cycle only take effect in the next cycle. This keeps scoring
            consistent and fair across the full window.
          </p>
          <p className="text-[13px] text-text-secondary leading-[1.9] tracking-[0.02em]">
            Historical rank data is preserved in analytics. The reset affects
            only the live rank display and active cycle scoring.
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
}
