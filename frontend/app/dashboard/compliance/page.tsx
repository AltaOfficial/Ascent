"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { format, startOfWeek, addDays, subDays, parseISO } from "date-fns";
import { apiFetch } from "@/lib/api";

const WEEK_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Rule {
  id: string;
  name: string;
}

interface Entry {
  ruleId: string;
  date: string;
  checked: boolean;
}

function getCurrentDayIndex(): number {
  const dayOfWeek = new Date().getDay();
  // Convert Sunday=0 … Saturday=6 to Monday=0 … Sunday=6
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

function getWeekDates(): string[] {
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(monday, index), "yyyy-MM-dd"),
  );
}

function formatWeekRange(weekDates: string[]): string {
  const formatDate = (dateStr: string) => format(parseISO(dateStr), "MMMM d");
  return `${formatDate(weekDates[0])} – ${formatDate(weekDates[6])}`;
}

function formatHeatmapRange(dates: string[]): string {
  const formatDate = (dateStr: string) => format(parseISO(dateStr), "MMM d");
  return `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`;
}

function get90DayDates(): string[] {
  const today = new Date();
  return Array.from({ length: 90 }, (_, index) =>
    format(subDays(today, 89 - index), "yyyy-MM-dd"),
  );
}

const HEATMAP_BG: Record<number, string> = {
  0: "var(--surface)",
  1: "rgba(200,200,210,0.12)",
  2: "rgba(200,200,210,0.28)",
  3: "rgba(200,200,210,0.5)",
  4: "rgba(200,200,210,0.75)",
};

const HEATMAP_BORDER: Record<number, string> = {
  0: "var(--border)",
  1: "rgba(200,200,210,0.1)",
  2: "rgba(200,200,210,0.2)",
  3: "rgba(200,200,210,0.3)",
  4: "rgba(200,200,210,0.4)",
};

export default function CompliancePage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [newRuleName, setNewRuleName] = useState("");
  const [addingRule, setAddingRule] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const weekDates = useMemo(() => getWeekDates(), []);
  const heatmapDates = useMemo(() => get90DayDates(), []);
  const currentDayIndex = getCurrentDayIndex();
  const todayDate = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedRules, fetchedEntries] = await Promise.all([
          apiFetch<Rule[]>("/compliance/rules"),
          apiFetch<Entry[]>(
            `/compliance/entries?start=${heatmapDates[0]}&end=${heatmapDates[89]}`,
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
    loadData();
  }, [heatmapDates]);

  useEffect(() => {
    if (addingRule) inputRef.current?.focus();
  }, [addingRule]);

  function isEntryChecked(ruleId: string, date: string): boolean {
    return entries.some(
      (entry) =>
        entry.ruleId === ruleId && entry.date === date && entry.checked,
    );
  }

  async function toggleEntry(ruleId: string, date: string) {
    const wasChecked = isEntryChecked(ruleId, date);
    const nowChecked = !wasChecked;

    // Optimistic update
    setEntries((prev) => {
      const withoutEntry = prev.filter(
        (entry) => !(entry.ruleId === ruleId && entry.date === date),
      );
      return [...withoutEntry, { ruleId, date, checked: nowChecked }];
    });

    try {
      await apiFetch("/compliance/entries", {
        method: "POST",
        body: JSON.stringify({ ruleId, date, checked: nowChecked }),
      });
    } catch {
      // Revert on failure
      setEntries((prev) => {
        const withoutEntry = prev.filter(
          (entry) => !(entry.ruleId === ruleId && entry.date === date),
        );
        return [...withoutEntry, { ruleId, date, checked: wasChecked }];
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
    setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
    setEntries((prev) => prev.filter((entry) => entry.ruleId !== ruleId));
    try {
      await apiFetch(`/compliance/rules/${ruleId}/delete`, { method: "POST" });
    } catch {}
  }

  const rulePcts = useMemo(() => {
    const daysElapsed = currentDayIndex + 1;
    return rules.map((rule) => {
      if (daysElapsed === 0) return 0;
      const checkedCount = weekDates
        .slice(0, daysElapsed)
        .filter((date) => isEntryChecked(rule.id, date)).length;
      return Math.round((checkedCount / daysElapsed) * 100);
    });
  }, [rules, entries, weekDates, currentDayIndex]);

  const overallPct = useMemo(() => {
    const daysElapsed = currentDayIndex + 1;
    if (daysElapsed === 0 || rules.length === 0) return 0;
    const totalPossible = rules.length * daysElapsed;
    const totalChecked = rules.reduce(
      (sum, rule) =>
        sum +
        weekDates
          .slice(0, daysElapsed)
          .filter((date) => isEntryChecked(rule.id, date)).length,
      0,
    );
    return Math.round((totalChecked / totalPossible) * 100);
  }, [rules, entries, weekDates, currentDayIndex]);

  const heatmapLevels = useMemo(() => {
    if (rules.length === 0) return heatmapDates.map(() => 0);
    return heatmapDates.map((date) => {
      const checkedCount = rules.filter((rule) =>
        isEntryChecked(rule.id, date),
      ).length;
      return Math.min(4, checkedCount);
    });
  }, [rules, entries, heatmapDates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span
          className="text-[12px] tracking-[0.06em] uppercase"
          style={{ color: "var(--text-secondary)" }}
        >
          Loading...
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "var(--border) transparent",
      }}
    >
      <div className="max-w-185 mx-auto px-8 py-13">
        {/* Header */}
        <div className="flex justify-between items-end mb-13">
          <div>
            <div
              className="text-[13px] tracking-[0.04em] uppercase mb-1"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--text-secondary)",
              }}
            >
              Current week
            </div>
            <div
              className="text-[22px] font-semibold tracking-[-0.02em]"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--text-primary)",
              }}
            >
              {formatWeekRange(weekDates)}
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-[11px] tracking-[0.06em] uppercase mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Weekly Compliance
            </div>
            <div
              className="text-[28px] font-semibold tracking-[-0.03em]"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--text-primary)",
              }}
            >
              {rules.length === 0 ? "—" : `${overallPct}%`}
            </div>
          </div>
        </div>

        {/* Weekly Rule Grid */}
        <div className="mb-13">
          <div className="flex items-center justify-between mb-4">
            <div
              className="text-[10px] tracking-widest uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              Weekly Rule Grid
            </div>
            <button
              type="button"
              onClick={() => setAddingRule(true)}
              className="text-[10px] tracking-[0.06em] uppercase px-2.5 py-1 rounded-sm transition-colors cursor-pointer"
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                background: "none",
              }}
            >
              + Add rule
            </button>
          </div>

          {rules.length === 0 && !addingRule ? (
            <div
              className="py-10 text-center text-[12px] tracking-[0.04em] rounded-md border"
              style={{
                color: "var(--text-secondary)",
                borderColor: "var(--border)",
              }}
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
                  {WEEK_DAY_LABELS.map((dayLabel) => (
                    <th
                      key={dayLabel}
                      className="text-center pb-3.5 text-[11px] tracking-[0.04em] font-normal"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {dayLabel}
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
                    {weekDates.map((date, dayIndex) => {
                      const isFuture = dayIndex > currentDayIndex;
                      const checked = isEntryChecked(rule.id, date);
                      return (
                        <td key={date} className="text-center py-2.5">
                          <button
                            type="button"
                            disabled={isFuture}
                            onClick={() => toggleEntry(rule.id, date)}
                            className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-sm transition-all duration-150"
                            style={{
                              border: `1px solid ${checked ? "rgba(200,200,210,0.35)" : "var(--border-mid)"}`,
                              background: checked
                                ? "rgba(200,200,210,0.15)"
                                : "transparent",
                              opacity: isFuture ? 0.25 : 1,
                              cursor: isFuture ? "default" : "pointer",
                            }}
                          >
                            {checked && (
                              <span
                                className="w-2 h-2 rounded-xs"
                                style={{ background: "rgba(200,200,210,0.9)" }}
                              />
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
                        style={{
                          color: "var(--text-secondary)",
                          background: "none",
                          border: "none",
                        }}
                        title="Delete rule"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}

                {addingRule && (
                  <tr
                    className="border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td colSpan={9} className="py-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          addRule();
                        }}
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
                          style={{
                            background: "var(--text-primary)",
                            color: "var(--bg)",
                            border: "none",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingRule(false);
                            setNewRuleName("");
                          }}
                          className="px-2 py-1.5 text-[11px] cursor-pointer"
                          style={{
                            color: "var(--text-secondary)",
                            background: "none",
                            border: "none",
                          }}
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

        {/* 90-day heatmap */}
        <div>
          <div
            className="text-[10px] tracking-widest uppercase mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            90-Day Context
          </div>
          <div className="flex flex-wrap gap-0.75">
            {heatmapLevels.map((level, index) => {
              const isToday = heatmapDates[index] === todayDate;
              return (
                <div
                  key={heatmapDates[index]}
                  className="w-3.5 h-3.5 rounded-xs"
                  style={{
                    background: HEATMAP_BG[level] ?? HEATMAP_BG[0],
                    border: `1px solid ${HEATMAP_BORDER[level] ?? HEATMAP_BORDER[0]}`,
                    boxShadow: isToday
                      ? "0 0 0 1px rgba(200,200,210,0.5)"
                      : undefined,
                  }}
                  title={`${heatmapDates[index]} — ${level > 0 ? Math.round((level / Math.max(rules.length, 1)) * 100) : 0}% compliance`}
                />
              );
            })}
          </div>
          <div className="flex justify-between items-center mt-2.5">
            <span
              className="text-[10px] tracking-[0.04em]"
              style={{ color: "var(--text-secondary)" }}
            >
              {formatHeatmapRange(heatmapDates)}
            </span>
            <div className="flex items-center gap-1">
              <span
                className="text-[10px] tracking-[0.04em] mr-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                less
              </span>
              {Object.values(HEATMAP_BG).map((bg, index) => (
                <div
                  key={index}
                  className="w-2.5 h-2.5 rounded-xs"
                  style={{ background: bg, border: "1px solid var(--border)" }}
                />
              ))}
              <span
                className="text-[10px] tracking-[0.04em] ml-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                more
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
