"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  projectId: string | null;
};

type ActiveEntry = { id: string; taskId: string } | null;

const STATUS_COLORS: Record<string, string> = {
  in_progress: "rgba(91,141,217,0.8)",
  todo:        "rgba(200,200,210,0.4)",
  blocked:     "rgba(217,107,107,0.6)",
  done:        "rgba(107,187,138,0.6)",
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   "rgba(217,107,107,0.8)",
  medium: "var(--text-secondary)",
  low:    "var(--text-secondary)",
};

function statusLabel(status: string) {
  return { todo: "Todo", in_progress: "In Progress", blocked: "Blocked", done: "Done" }[status] ?? status;
}

export default function TaskInbox() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeEntry, setActiveEntry] = useState<ActiveEntry>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch<Task[]>("/tasks/list", {
      method: "POST",
      body: JSON.stringify({ projectId: null }),
    }).then(setTasks).catch(() => {});

    apiFetch<ActiveEntry>("/time-entries/active")
      .then(setActiveEntry)
      .catch(() => {});
  }, []);

  async function handleStartTimer(taskId: string) {
    try {
      const entry = await apiFetch<{ id: string; taskId: string }>("/time-entries/start", {
        method: "POST",
        body: JSON.stringify({ taskId }),
      });
      setActiveEntry(entry);
      setTasks((prev) =>
        prev.map((task) => task.id === taskId ? { ...task, status: "in_progress" } : task)
      );
    } catch {}
  }

  async function handleStopTimer() {
    if (!activeEntry) return;
    try {
      await apiFetch("/time-entries/stop", {
        method: "POST",
        body: JSON.stringify({ timeEntryId: activeEntry.id }),
      });
      setActiveEntry(null);
    } catch {}
  }

  function toggleChecked(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div
      className="rounded-[10px] border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-[18px] border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="text-sm font-semibold tracking-[-0.01em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Inbox
        </span>
        <div className="flex gap-2">
          <button
            className="border rounded-md px-3 py-1.5 text-[10px] tracking-[0.04em] transition-colors"
            style={{
              background: "transparent",
              borderColor: "var(--border-mid)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            + Add Task
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow style={{ borderColor: "var(--border)" }}>
              <TableHead className="w-7 pr-0" style={{ color: "var(--text-secondary)", fontSize: 10, letterSpacing: "0.07em" }} />
              <TableHead style={{ color: "var(--text-secondary)", fontSize: 10, letterSpacing: "0.07em" }}>Title</TableHead>
              <TableHead className="hidden sm:table-cell" style={{ color: "var(--text-secondary)", fontSize: 10, letterSpacing: "0.07em" }}>Status</TableHead>
              <TableHead className="hidden md:table-cell" style={{ color: "var(--text-secondary)", fontSize: 10, letterSpacing: "0.07em" }}>Priority</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow style={{ borderColor: "var(--border)" }}>
                <TableCell colSpan={5} className="text-center py-10 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  No tasks in inbox.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className="group transition-colors"
                  style={{ borderColor: "var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  {/* Checkbox */}
                  <TableCell className="pr-0">
                    <button
                      onClick={() => toggleChecked(task.id)}
                      className="w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center transition-colors"
                      style={{
                        borderColor: checked.has(task.id) ? "rgba(200,200,210,0.35)" : "var(--border-mid)",
                        background:  checked.has(task.id) ? "rgba(200,200,210,0.2)" : "transparent",
                      }}
                    >
                      {checked.has(task.id) && (
                        <span style={{ fontSize: 8, color: "var(--text-primary)", lineHeight: 1 }}>✓</span>
                      )}
                    </button>
                  </TableCell>

                  {/* Title */}
                  <TableCell
                    className="max-w-[380px] truncate text-[12px] tracking-[0.01em]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {task.title}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="hidden sm:table-cell">
                    <span className="flex items-center gap-1.5 text-[10px] tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
                      <span className="w-1 h-1 rounded-full" style={{ background: STATUS_COLORS[task.status] ?? "var(--border)" }} />
                      {statusLabel(task.status)}
                    </span>
                  </TableCell>

                  {/* Priority */}
                  <TableCell
                    className="hidden md:table-cell text-[10px] tracking-[0.04em]"
                    style={{ color: task.priority ? PRIORITY_COLORS[task.priority] : "var(--text-secondary)" }}
                  >
                    {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : "—"}
                  </TableCell>

                  {/* Timer */}
                  <TableCell>
                    {activeEntry?.taskId === task.id ? (
                      <button
                        onClick={handleStopTimer}
                        className="text-[10px] px-2 py-1 rounded-[4px] border tracking-[0.03em] transition-opacity hover:opacity-80"
                        style={{
                          borderColor: "rgba(217,107,107,0.3)",
                          color: "rgba(217,107,107,0.8)",
                          background: "rgba(217,107,107,0.06)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartTimer(task.id)}
                        disabled={!!activeEntry}
                        className="text-[10px] px-2 py-1 rounded-[4px] border tracking-[0.03em] transition-opacity hover:opacity-80 disabled:opacity-25"
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--text-secondary)",
                          background: "transparent",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        Start
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-3 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-[11px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
          {checked.size} of {tasks.length} selected
        </span>
        {activeEntry && (
          <span className="text-[10px] tracking-[0.03em]" style={{ color: "rgba(91,141,217,0.8)", fontFamily: "var(--font-mono)" }}>
            ● Timer running
          </span>
        )}
      </div>
    </div>
  );
}
