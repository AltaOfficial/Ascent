"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { apiFetch } from "@/lib/api";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Rule {
  id: string;
  name: string;
}

interface Entry {
  ruleId: string;
  date: string;
  checked: boolean;
}

function getCurrentDayIndex() {
  const dow = new Date().getDay();
  return dow === 0 ? 6 : dow - 1;
}

function getWeekDates(): string[] {
  const today = new Date();
  const dow = today.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + diffToMonday + i);
    return d.toISOString().split("T")[0];
  });
}

function getWeekRange(weekDates: string[]) {
  const fmt = (s: string) =>
    new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${fmt(weekDates[0])} – ${fmt(weekDates[6])}`;
}

function getHeatmapRange(dates: string[]) {
  const fmt = (s: string) =>
    new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
}

function get30DayDates(): string[] {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 29 + i);
    return d.toISOString().split("T")[0];
  });
}

export default function CompliancePage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [newRuleName, setNewRuleName] = useState("");
  const [addingRule, setAddingRule] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const weekDates = useMemo(() => getWeekDates(), []);
  const heatmapDates = useMemo(() => get30DayDates(), []);
  const currentDayIndex = getCurrentDayIndex();
  const todayDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      try {
        const [fetchedRules, fetchedEntries] = await Promise.all([
          apiFetch<Rule[]>("/compliance/rules"),
          apiFetch<Entry[]>(
            `/compliance/entries?start=${heatmapDates[0]}&end=${heatmapDates[29]}`
          ),
        ]);
        setRules(fetchedRules);
        setEntries(fetchedEntries);
      } catch {
        // not logged in or network error — show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [heatmapDates]);

  useEffect(() => {
    if (addingRule) inputRef.current?.focus();
  }, [addingRule]);

  function isChecked(ruleId: string, date: string) {
    return entries.some((e) => e.ruleId === ruleId && e.date === date && e.checked);
  }

  async function toggle(ruleId: string, date: string) {
    const currentlyChecked = isChecked(ruleId, date);
    const newChecked = !currentlyChecked;

    // Optimistic update
    setEntries((prev) => {
      const withoutThis = prev.filter((e) => !(e.ruleId === ruleId && e.date === date));
      return [...withoutThis, { ruleId, date, checked: newChecked }];
    });

    try {
      await apiFetch("/compliance/entries", {
        method: "POST",
        body: JSON.stringify({ ruleId, date, checked: newChecked }),
      });
    } catch {
      // Revert on failure
      setEntries((prev) => {
        const withoutThis = prev.filter((e) => !(e.ruleId === ruleId && e.date === date));
        return [...withoutThis, { ruleId, date, checked: currentlyChecked }];
      });
    }
  }

  async function addRule() {
    const name = newRuleName.trim();
    if (!name) return;
    try {
      const rule = await apiFetch<Rule>("/compliance/rules", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setRules((prev) => [...prev, rule]);
      setNewRuleName("");
      setAddingRule(false);
    } catch {}
  }

  async function deleteRule(ruleId: string) {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    setEntries((prev) => prev.filter((e) => e.ruleId !== ruleId));
    try {
      await apiFetch(`/compliance/rules/${ruleId}`, { method: "DELETE" });
    } catch {}
  }

  const rulePcts = useMemo(() => {
    const days = currentDayIndex + 1;
    return rules.map((rule) => {
      if (days === 0) return 0;
      const checked = weekDates.slice(0, days).filter((d) => isChecked(rule.id, d)).length;
      return Math.round((checked / days) * 100);
    });
  }, [rules, entries, weekDates, currentDayIndex]);

  const overallPct = useMemo(() => {
    const days = currentDayIndex + 1;
    if (days === 0 || rules.length === 0) return 0;
    const total = rules.length * days;
    const checked = rules.reduce(
      (acc, rule) =>
        acc + weekDates.slice(0, days).filter((d) => isChecked(rule.id, d)).length,
      0
    );
    return Math.round((checked / total) * 100);
  }, [rules, entries, weekDates, currentDayIndex]);

  const heatmapLevels = useMemo(() => {
    if (rules.length === 0) return heatmapDates.map(() => 0);
    return heatmapDates.map((date) => {
      const checkedCount = rules.filter((r) => isChecked(r.id, date)).length;
      return Math.min(4, checkedCount);
    });
  }, [rules, entries, heatmapDates]);

  const bgMap: Record<number, string> = {
    0: "var(--surface)",
    1: "rgba(200,200,210,0.12)",
    2: "rgba(200,200,210,0.28)",
    3: "rgba(200,200,210,0.5)",
    4: "rgba(200,200,210,0.75)",
  };
  const borderMap: Record<number, string> = {
    0: "var(--border)",
    1: "rgba(200,200,210,0.1)",
    2: "rgba(200,200,210,0.2)",
    3: "rgba(200,200,210,0.3)",
    4: "rgba(200,200,210,0.4)",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-[12px] tracking-[0.06em] uppercase" style={{ color: "var(--text-secondary)" }}>
          Loading...
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}>
    <div className="max-w-185 mx-auto px-8 py-13">

      {/* Header */}
      <div className="flex justify-between items-end mb-13">
        <div>
          <div
            className="text-[13px] tracking-[0.04em] uppercase mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-secondary)" }}
          >
            Current week
          </div>
          <div
            className="text-[22px] font-semibold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {getWeekRange(weekDates)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] tracking-[0.06em] uppercase mb-1" style={{ color: "var(--text-secondary)" }}>
            Weekly Compliance
          </div>
          <div
            className="text-[28px] font-semibold tracking-[-0.03em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {rules.length === 0 ? "—" : `${overallPct}%`}
          </div>
        </div>
      </div>

      {/* Weekly Rule Grid */}
      <div className="mb-13">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>
            Weekly Rule Grid
          </div>
          <button
            type="button"
            onClick={() => setAddingRule(true)}
            className="text-[10px] tracking-[0.06em] uppercase px-2.5 py-1 rounded-sm transition-colors cursor-pointer"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", background: "none" }}
          >
            + Add rule
          </button>
        </div>

        {rules.length === 0 && !addingRule ? (
          <div
            className="py-10 text-center text-[12px] tracking-[0.04em] rounded-md border"
            style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
          >
            No rules yet. Add one to start tracking.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th
                  className="text-left pb-3.5 text-[10px] tracking-[0.06em] uppercase font-normal"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Rule
                </th>
                {DAYS.map((d) => (
                  <th
                    key={d}
                    className="text-center pb-3.5 text-[11px] tracking-[0.04em] font-normal"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {d}
                  </th>
                ))}
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-t last:border-b group"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td
                    className="py-4.5 pr-5 text-[13px] whitespace-nowrap tracking-[0.01em]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {rule.name}
                  </td>
                  {weekDates.map((date, i) => {
                    const future = i > currentDayIndex;
                    const checked = isChecked(rule.id, date);
                    return (
                      <td key={date} className="text-center py-2.5">
                        <button
                          type="button"
                          disabled={future}
                          onClick={() => toggle(rule.id, date)}
                          className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-sm transition-all duration-150"
                          style={{
                            border: `1px solid ${checked ? "rgba(200,200,210,0.35)" : "var(--border-mid)"}`,
                            background: checked ? "rgba(200,200,210,0.15)" : "transparent",
                            opacity: future ? 0.25 : 1,
                            cursor: future ? "default" : "pointer",
                          }}
                        >
                          {checked && (
                            <span className="w-2 h-2 rounded-xs" style={{ background: "rgba(200,200,210,0.9)" }} />
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className="pl-2">
                    <button
                      type="button"
                      onClick={() => deleteRule(rule.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] cursor-pointer"
                      style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                      title="Delete rule"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}

              {addingRule && (
                <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td colSpan={9} className="py-3">
                    <form
                      onSubmit={(e) => { e.preventDefault(); addRule(); }}
                      className="flex items-center gap-2"
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Rule name…"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                        className="flex-1 rounded-[5px] px-3 py-1.5 text-[12px] outline-none"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border-mid)",
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-[5px] text-[11px] tracking-[0.04em] cursor-pointer transition-opacity"
                        style={{ background: "var(--text-primary)", color: "var(--bg)", border: "none", fontFamily: "var(--font-mono)" }}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingRule(false); setNewRuleName(""); }}
                        className="px-2 py-1.5 text-[11px] cursor-pointer"
                        style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                      >
                        Cancel
                      </button>
                    </form>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="h-px mb-10" style={{ background: "var(--border)" }} />

      {/* Stats */}
      <div className="mb-13">
        <div className="text-[10px] tracking-widest uppercase mb-4" style={{ color: "var(--text-secondary)" }}>
          This Week
        </div>
        {rules.length === 0 ? (
          <div className="text-[12px] tracking-[0.04em]" style={{ color: "var(--text-secondary)" }}>
            No rules to display.
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {rules.map((rule, i) => (
                <div
                  key={rule.id}
                  className="flex items-center gap-3.5 py-2.5 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span
                    className="text-[12px] tracking-[0.02em] whitespace-nowrap shrink-0"
                    style={{ width: 160, color: "var(--text-secondary)" }}
                  >
                    {rule.name}
                  </span>
                  <div className="flex-1 h-px rounded-[1px] overflow-hidden" style={{ background: "var(--border)" }}>
                    <div
                      className="h-full rounded-[1px] transition-all duration-500"
                      style={{ width: `${rulePcts[i]}%`, background: "rgba(200,200,210,0.4)" }}
                    />
                  </div>
                  <span className="text-[12px] w-9 text-right shrink-0" style={{ color: "var(--text-primary)" }}>
                    {rulePcts[i]}%
                  </span>
                </div>
              ))}
            </div>
            <div
              className="flex items-center justify-between pt-4 mt-1 border-t"
              style={{ borderColor: "var(--border-mid)" }}
            >
              <span className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
                Overall
              </span>
              <span
                className="text-[20px] font-semibold tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                {overallPct}%
              </span>
            </div>
          </>
        )}
      </div>

      <div className="h-px mb-10" style={{ background: "var(--border)" }} />

      {/* Heatmap */}
      <div>
        <div className="text-[10px] tracking-widest uppercase mb-4" style={{ color: "var(--text-secondary)" }}>
          30-Day Context
        </div>
        <div className="flex flex-wrap gap-0.75">
          {heatmapLevels.map((lvl, i) => {
            const isToday = heatmapDates[i] === todayDate;
            return (
              <div
                key={heatmapDates[i]}
                className="w-3.5 h-3.5 rounded-xs"
                style={{
                  background: bgMap[lvl] ?? bgMap[0],
                  border: `1px solid ${borderMap[lvl] ?? borderMap[0]}`,
                  boxShadow: isToday ? "0 0 0 1px rgba(200,200,210,0.5)" : undefined,
                }}
                title={`${heatmapDates[i]} — ${lvl > 0 ? Math.round((lvl / Math.max(rules.length, 1)) * 100) : 0}% compliance`}
              />
            );
          })}
        </div>
        <div className="flex justify-between items-center mt-2.5">
          <span className="text-[10px] tracking-[0.04em]" style={{ color: "var(--text-secondary)" }}>
            {getHeatmapRange(heatmapDates)}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] tracking-[0.04em] mr-0.5" style={{ color: "var(--text-secondary)" }}>less</span>
            {Object.values(bgMap).map((bg, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-xs"
                style={{ background: bg, border: "1px solid var(--border)" }}
              />
            ))}
            <span className="text-[10px] tracking-[0.04em] ml-0.5" style={{ color: "var(--text-secondary)" }}>more</span>
          </div>
        </div>
      </div>

    </div>
    </div>
  );
}
