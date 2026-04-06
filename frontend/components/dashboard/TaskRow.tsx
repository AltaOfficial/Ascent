"use client";

import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { TagBadge } from "@/components/dashboard/TagBadge";

type Status = "todo" | "in_progress" | "blocked" | "done";
type Priority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority | null;
  projectId: string | null;
  categoryTag: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  actualMinutes?: number | null;
  isHighValue: boolean;
  isRevenueImpact: boolean;
};

export function formatDueDate(
  dateStr: string | null,
): { label: string; urgency: "overdue" | "today" | "tomorrow" | "week" | "future" } | null {
  if (!dateStr) return null;
  const date = parseISO(dateStr);
  const diff = differenceInCalendarDays(date, new Date());
  let label: string;
  if (diff < 0) label = format(date, "MMM d");
  else if (diff === 0) label = "Today";
  else if (diff === 1) label = "Tomorrow";
  else if (diff <= 6) label = format(date, "EEEE");
  else label = format(date, "MMM d");
  if (diff < 0) return { label, urgency: "overdue" };
  if (diff === 0) return { label, urgency: "today" };
  if (diff === 1) return { label, urgency: "tomorrow" };
  if (diff <= 6) return { label, urgency: "week" };
  return { label, urgency: "future" };
}

function formatEstimatedMinutes(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function TaskRow({
  task,
  project,
  isTimerRunning,
  onMarkDone,
  onStartTimer,
  onEdit,
}: {
  task: Task;
  project?: { name: string; color: string | null } | null;
  isTimerRunning: boolean;
  onMarkDone: (id: string) => void;
  onStartTimer: (id: string) => void;
  onEdit: (task: Task) => void;
}) {
  const dueInfo = formatDueDate(task.dueDate);
  const isDone = task.status === "done";

  return (
    <div
      className="flex items-center border-b min-h-[46px] group cursor-pointer transition-colors"
      style={{ borderColor: "var(--border)", opacity: isDone ? 0.45 : 1 }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--surface-2)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
      onClick={() => onEdit(task)}
    >
      {/* Checkbox */}
      <div className="w-9 shrink-0 flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkDone(task.id);
          }}
          className="w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center transition-colors shrink-0"
          style={{
            borderColor: isDone
              ? "rgba(107,187,138,0.35)"
              : "var(--border-mid)",
            background: isDone ? "rgba(107,187,138,0.12)" : "transparent",
          }}
        >
          {isDone && (
            <span
              style={{
                fontSize: 8,
                color: "rgba(107,187,138,0.9)",
                lineHeight: 1,
              }}
            >
              ✓
            </span>
          )}
        </button>
      </div>

      {/* Title + tag */}
      <div className="flex-1 min-w-0 flex items-center gap-2 py-2.5 pr-3">
        {task.categoryTag && <TagBadge tag={task.categoryTag} />}
        <span
          className="text-[12px] tracking-[0.01em] truncate"
          style={{
            color: "var(--text-primary)",
            textDecoration: isDone ? "line-through" : "none",
          }}
        >
          {task.title}
        </span>
        {task.description && (
          <span
            className="text-[10px] shrink-0 opacity-40"
            style={{ color: "var(--text-secondary)" }}
          >
            ≡
          </span>
        )}
      </div>

      {/* Project */}
      <div className="hidden sm:flex items-center gap-1.5 w-28 shrink-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: project?.color ?? "var(--border-mid)" }}
        />
        <span
          className="text-[10px] tracking-[0.03em] truncate"
          style={{ color: "var(--text-secondary)" }}
        >
          {project?.name ?? "None"}
        </span>
      </div>

      {/* Priority */}
      <div
        className="hidden sm:block w-25 shrink-0 text-[10px] tracking-[0.04em]"
        style={{
          color:
            task.priority === "high"
              ? "rgba(217,107,107,0.75)"
              : "var(--text-secondary)",
          opacity: task.priority === "low" ? 0.5 : 1,
        }}
      >
        {task.priority
          ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
          : "—"}
      </div>

      {/* Due */}
      <div
        className="hidden md:block w-19 shrink-0 text-[10px] tracking-[0.03em]"
        style={{
          color: dueInfo
            ? dueInfo.urgency === "overdue"
              ? "rgba(217,107,107,0.8)"
              : dueInfo.urgency === "today"
                ? "rgba(107,187,138,0.9)"
                : dueInfo.urgency === "tomorrow"
                  ? "rgba(230,180,70,0.9)"
                  : dueInfo.urgency === "week"
                    ? "rgba(147,107,200,0.85)"
                    : "rgba(150,150,160,0.7)"
            : "var(--text-secondary)",
        }}
      >
        {dueInfo ? dueInfo.label : "—"}
      </div>

      {/* Est */}
      <div
        className="hidden md:block w-12.5 shrink-0 text-[10px] tracking-[0.02em]"
        style={{ color: "var(--text-secondary)" }}
      >
        {formatEstimatedMinutes(task.estimatedMinutes)}
      </div>

      {/* Hover actions */}
      <div className="w-29 shrink-0 flex items-center gap-1.5 justify-end pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartTimer(task.id);
          }}
          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-[5px] border tracking-[0.04em] transition-colors"
          style={
            isTimerRunning
              ? {
                  borderColor: "rgba(107,187,138,0.4)",
                  color: "rgba(107,187,138,0.9)",
                  background: "rgba(107,187,138,0.07)",
                  fontFamily: "var(--font-mono)",
                }
              : {
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                  background: "transparent",
                  fontFamily: "var(--font-mono)",
                }
          }
          onMouseEnter={(e) => {
            if (!isTimerRunning) {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(107,187,138,0.35)";
              (e.currentTarget as HTMLElement).style.color =
                "rgba(107,187,138,0.85)";
              (e.currentTarget as HTMLElement).style.background =
                "rgba(107,187,138,0.06)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isTimerRunning) {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--border)";
              (e.currentTarget as HTMLElement).style.color =
                "var(--text-secondary)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }
          }}
        >
          {isTimerRunning ? (
            <>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "rgba(107,187,138,0.8)" }}
              />
              Running
            </>
          ) : (
            "▶ Start"
          )}
        </button>
      </div>
    </div>
  );
}
