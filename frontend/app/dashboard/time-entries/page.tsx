"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { format, parseISO } from "date-fns";

type TimeEntry = {
  id: string;
  taskId: string;
  taskTitle: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TimeEntriesPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<TimeEntry[]>("/time-entries")
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

  return (
    <div className="flex-1 overflow-y-auto p-8" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1
              className="text-xl font-semibold tracking-[-0.02em] mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Time entries
            </h1>
            <p className="text-[12px]" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
              All logged sessions
            </p>
          </div>
          {entries.length > 0 && (
            <div
              className="text-[11px] tracking-[0.03em] px-3 py-1.5 rounded-md"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-mid)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Total: <span style={{ color: "var(--text-primary)" }}>{formatDuration(totalMinutes)}</span>
            </div>
          )}
        </div>

        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
        >
          <div
            className="grid px-5 py-2.5 border-b"
            style={{
              gridTemplateColumns: "1fr 150px 150px 80px",
              borderColor: "var(--border)",
              background: "var(--surface-2)",
            }}
          >
            {["Task", "Started", "Ended", "Duration"].map((col) => (
              <span
                key={col}
                className="text-[9px] tracking-[0.08em] uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                {col}
              </span>
            ))}
          </div>

          {loading && (
            <div className="px-5 py-8 text-center text-[12px]" style={{ color: "var(--text-secondary)", opacity: 0.4, fontFamily: "var(--font-mono)" }}>
              Loading…
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="px-5 py-8 text-center text-[12px]" style={{ color: "var(--text-secondary)", opacity: 0.4, fontFamily: "var(--font-mono)" }}>
              No time entries yet
            </div>
          )}

          {!loading && entries.map((entry) => (
            <div
              key={entry.id}
              className="grid px-5 py-3 border-b last:border-b-0 transition-colors"
              style={{
                gridTemplateColumns: "1fr 150px 150px 80px",
                borderColor: "var(--border)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              <span
                className="text-[12px] tracking-[0.01em] truncate pr-4"
                style={{
                  color: entry.taskTitle ? "var(--text-primary)" : "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                  opacity: entry.taskTitle ? 1 : 0.4,
                }}
              >
                {entry.taskTitle ?? "—"}
              </span>
              <span
                className="text-[11px] tracking-[0.01em]"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
              >
                {format(parseISO(entry.startedAt), "MMM d, h:mm a")}
              </span>
              <span
                className="text-[11px] tracking-[0.01em]"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
              >
                {entry.endedAt
                  ? format(parseISO(entry.endedAt), "MMM d, h:mm a")
                  : <span style={{ color: "rgba(107,187,138,0.7)" }}>active</span>}
              </span>
              <span
                className="text-[11px] tracking-[0.02em]"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
              >
                {formatDuration(entry.durationMinutes)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
