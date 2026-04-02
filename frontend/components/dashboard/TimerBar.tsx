"use client";

import { useState, useEffect } from "react";

type Task = {
  id: string;
  title: string;
  estimatedMinutes: number | null;
};

type ActiveEntry = { id: string; taskId: string; startedAt: string } | null;

function parseStartMs(startedAt: string): number {
  // If the string has no timezone indicator, treat it as UTC (server stores in UTC)
  if (!startedAt.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(startedAt)) {
    return new Date(startedAt + "Z").getTime();
  }
  return new Date(startedAt).getTime();
}

function formatElapsedTime(startedAt: string): string {
  const totalSeconds = Math.max(0, Math.floor((Date.now() - parseStartMs(startedAt)) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatEstimatedMinutes(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function TimerBar({
  activeEntry,
  activeTask,
  onStop,
}: {
  activeEntry: ActiveEntry;
  activeTask: Task | null;
  onStop: () => void;
}) {
  const [elapsedDisplay, setElapsedDisplay] = useState("0:00");

  useEffect(() => {
    if (!activeEntry) return;
    const tick = () => setElapsedDisplay(formatElapsedTime(activeEntry.startedAt));
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [activeEntry]);

  if (!activeEntry || !activeTask) return null;

  return (
    <div
      className="fixed bottom-0 right-0 left-[188px] flex items-center justify-between px-7 py-3 border-t z-40"
      style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
    >
      <div className="flex items-center gap-3.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: "rgba(107,187,138,0.8)",
            boxShadow: "0 0 6px rgba(107,187,138,0.5)",
            animation: "pulse 1.2s infinite",
          }}
        />
        <div
          className="text-[12px] tracking-[0.01em] max-w-[320px] truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {activeTask.title}
        </div>
      </div>

      <div
        className="text-[18px] font-semibold tracking-[0.03em] min-w-[60px] text-center"
        style={{ fontFamily: "var(--font-display)", color: "rgba(107,187,138,0.9)" }}
      >
        {elapsedDisplay}
      </div>

      <div className="flex items-center gap-3">
        {activeTask.estimatedMinutes && (
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Est: {formatEstimatedMinutes(activeTask.estimatedMinutes)}
          </span>
        )}
        <button
          onClick={onStop}
          className="text-[10px] px-3.5 py-1.5 rounded-md border tracking-[0.04em] transition-colors"
          style={{ borderColor: "rgba(217,107,107,0.25)", color: "rgba(217,107,107,0.7)", fontFamily: "var(--font-mono)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(217,107,107,0.5)";
            (e.currentTarget as HTMLElement).style.color = "rgba(217,107,107,0.95)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(217,107,107,0.25)";
            (e.currentTarget as HTMLElement).style.color = "rgba(217,107,107,0.7)";
          }}
        >
          Stop
        </button>
      </div>
    </div>
  );
}
