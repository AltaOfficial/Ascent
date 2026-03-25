export interface Rank {
  name: string;
  range: string;
  color: string;
  desc: string;
  icon: string;
}

export const RANKS: Rank[] = [
  { name: "Foundation", range: "0 – 1.5h / day",  color: "rgba(200,200,210,0.3)", desc: "Establishing the baseline. Starting is the work.", icon: "▽" },
  { name: "Builder",    range: "1.5 – 3h / day",   color: "rgba(107,187,138,0.5)", desc: "Consistent output. Pattern forming.",              icon: "△" },
  { name: "Operator",   range: "3 – 4.5h / day",   color: "rgba(91,141,217,0.6)",  desc: "Reliable execution. No filler days.",              icon: "◇" },
  { name: "Architect",  range: "4.5 – 6h / day",   color: "rgba(196,127,212,0.6)", desc: "High-leverage. Decisions compound.",               icon: "▲" },
  { name: "Apex",       range: "6h+ sustained",     color: "rgba(217,167,91,0.7)",  desc: "Sustained elite output. Identity locked.",         icon: "◆" },
];

export interface Feature {
  num: string;
  icon: string;
  title: string;
  desc: string;
}

export const FEATURES: Feature[] = [
  { num: "01", icon: "■", title: "Dashboard",    desc: "Your rank, compliance score, drift allocation, and rolling average — visible at a glance every morning." },
  { num: "02", icon: "☐", title: "Tasks + Timer", desc: "Kanban and list views. Every task has an estimated time. Start a session and the timer tracks your actual output." },
  { num: "03", icon: "□", title: "Calendar",      desc: "Tasks, exams, birthdays, events — one place. Monthly and weekly views. Click any day for a full detail panel." },
  { num: "04", icon: "◆", title: "Compliance",    desc: "Daily rule grid. You open it. You mark it. You close it. No reporting mode. Just behavior mode." },
  { num: "05", icon: "▲", title: "Analytics",     desc: "Rolling averages, volatility scores, drift watch, session length trends, and estimation accuracy — all in one page." },
  { num: "06", icon: "◇", title: "AI Advisor",    desc: "A private strategic operator. Not motivational. Not verbose. Direct, analytical, context-aware. Surgical guidance only." },
];

export const STATS = [
  { num: "5",  label: "Core Screens" },
  { num: "1",  label: "Daily Ritual" },
  { num: "0",  label: "Motivational Fluff" },
  { num: "∞",  label: "Compounding Clarity" },
];

export const rules = ["No YouTube", "No Short-Form", "Gaming After Work"];

export const compliance: number[][] = [
  [1, 1, 1, 1, 0, 1, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 1, 0, 1, 1, 1, 1],
];

export interface DriftCat {
  label: string;
  thisWeek: number;
  lastWeek: number;
  color: string;
}

export const driftCats: DriftCat[] = [
  { label: "School",    thisWeek: 44, lastWeek: 38, color: "rgba(91,141,217,0.7)"   },
  { label: "Revenue",   thisWeek: 18, lastWeek: 28, color: "rgba(107,187,138,0.7)"  },
  { label: "Interview", thisWeek: 12, lastWeek: 10, color: "rgba(196,127,212,0.7)"  },
  { label: "Infra",     thisWeek: 18, lastWeek: 12, color: "rgba(200,200,210,0.45)" },
  { label: "Personal",  thisWeek: 8,  lastWeek: 12, color: "rgba(217,167,91,0.6)"   },
];

export const heatmapLevels = [0,1,2,1,3,2,4,3,2,1,2,3,4,3,2,1,3,4,3,2,3,4,3,1,2,3,4,2,1,3];
