"use client";

import { useState, useEffect, useRef } from "react";
import { startOfToday, endOfWeek, addWeeks, isWithinInterval, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { useTimerStore } from "@/lib/timerStore";
import { TYPE_COLOR } from "@/components/dashboard/calendarTypes";
import type { CalEvent } from "@/components/dashboard/calendarTypes";
import { formatDueDate } from "@/components/dashboard/TaskRow";

function isUpcomingOrOverdue(dateStr: string): boolean {
  const nextWeekEnd = endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
  return parseISO(dateStr) <= nextWeekEnd;
}

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  projectId: string | null;
  dueDate: string | null;
};

type Project = { id: string; name: string; color: string | null };

const PRIORITY_COLORS: Record<string, string> = {
  high: "rgba(217,107,107,0.8)",
  medium: "var(--text-secondary)",
  low: "var(--text-secondary)",
};


export default function TaskInbox() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addingTitle, setAddingTitle] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  const { activeEntry, setActive, clear } = useTimerStore();

  useEffect(() => {
    Promise.all([
      apiFetch<Task[]>("/tasks/list", { method: "POST", body: JSON.stringify({}) }),
      apiFetch<Project[]>("/projects"),
      apiFetch<CalEvent[]>("/calendar-events"),
    ])
      .then(([taskList, projectList, eventList]) => {
        setTasks(taskList);
        setProjects(projectList);
        const nextWeekEnd = endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
        setEvents(
          eventList.filter(
            (e) =>
              (e.type === "event" || e.type === "exam") &&
              !e.done &&
              isWithinInterval(parseISO(e.date), { start: startOfToday(), end: nextWeekEnd }),
          ),
        );
      })
      .catch(() => {});
  }, []);

  async function handleAddTask() {
    const title = addingTitle.trim();
    if (!title) { setShowAdd(false); setAddingTitle(""); return; }
    try {
      const created = await apiFetch<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify({ title, projectId: null }),
      });
      setTasks((prev) => [created, ...prev]);
    } catch {}
    setAddingTitle("");
    setShowAdd(false);
  }

  async function handleStartTimer(taskId: string) {
    const { activeEntry: current } = useTimerStore.getState();
    if (current) {
      try {
        await apiFetch("/time-entries/stop", {
          method: "POST",
          body: JSON.stringify({ timeEntryId: current.id }),
        });
      } catch {}
    }
    if (current?.taskId === taskId) {
      clear();
      return;
    }
    try {
      const entry = await apiFetch<{ id: string; taskId: string; startedAt: string }>(
        "/time-entries/start",
        { method: "POST", body: JSON.stringify({ taskId }) },
      );
      const task = tasks.find((t) => t.id === taskId);
      setActive(entry, { id: taskId, title: task?.title ?? "", estimatedMinutes: null });
      setTasks((prev) =>
        prev.map((t) => t.id === taskId ? { ...t, status: "in_progress" } : t),
      );
    } catch {}
  }

  async function handleStopTimer() {
    const { activeEntry: current } = useTimerStore.getState();
    if (!current) return;
    try {
      await apiFetch("/time-entries/stop", {
        method: "POST",
        body: JSON.stringify({ timeEntryId: current.id }),
      });
    } catch {}
    clear();
  }

  async function toggleChecked(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      await apiFetch(`/tasks/${id}/update`, {
        method: "POST",
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
    } catch {}
  }

  return (
    <div
      className="rounded-[10px] border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4.5 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="text-sm font-semibold tracking-[-0.01em]"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
          }}
        >
          Inbox
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAdd(true); setTimeout(() => addInputRef.current?.focus(), 0); }}
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
              <TableHead
                className="w-7 pr-0"
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 10,
                  letterSpacing: "0.07em",
                }}
              />
              <TableHead
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 10,
                  letterSpacing: "0.07em",
                }}
              >
                Title
              </TableHead>
              <TableHead
                className="hidden sm:table-cell"
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 10,
                  letterSpacing: "0.07em",
                }}
              >
                Project
              </TableHead>
              <TableHead
                className="hidden md:table-cell"
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 10,
                  letterSpacing: "0.07em",
                }}
              >
                Priority
              </TableHead>
              <TableHead
                className="hidden md:table-cell"
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 10,
                  letterSpacing: "0.07em",
                }}
              >
                Due
              </TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Inline add row */}
            {showAdd && (
              <TableRow style={{ borderColor: "var(--border-mid)", background: "var(--surface-raised)" }}>
                <TableCell colSpan={6} className="py-2 px-4">
                  <input
                    ref={addInputRef}
                    value={addingTitle}
                    onChange={(e) => setAddingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddTask();
                      if (e.key === "Escape") { setShowAdd(false); setAddingTitle(""); }
                    }}
                    onBlur={() => { if (!addingTitle.trim()) { setShowAdd(false); setAddingTitle(""); } }}
                    placeholder="Task name..."
                    className="w-full bg-transparent border-none outline-none text-[12px] tracking-[0.01em]"
                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                  />
                </TableCell>
              </TableRow>
            )}

            {(() => {
              const visibleTasks = tasks.filter(
                (t) => t.status !== "done" && (!t.projectId || (t.dueDate && isUpcomingOrOverdue(t.dueDate))),
              );
              if (visibleTasks.length === 0 && events.length === 0 && !showAdd) return (
                <TableRow style={{ borderColor: "var(--border)" }}>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-[12px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No tasks in inbox.
                  </TableCell>
                </TableRow>
              );
              return (
                <>
                  {visibleTasks.map((task) => (
                    <TableRow
                      key={`task-${task.id}`}
                      className="group transition-colors"
                      style={{ borderColor: "var(--border)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <TableCell className="pr-0">
                        <button
                          onClick={() => toggleChecked(task.id)}
                          className="w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center transition-colors"
                          style={{
                            borderColor: task.status === "done" ? "rgba(107,187,138,0.35)" : "var(--border-mid)",
                            background: task.status === "done" ? "rgba(107,187,138,0.12)" : "transparent",
                          }}
                        >
                          {task.status === "done" && (
                            <span style={{ fontSize: 8, color: "rgba(107,187,138,0.9)", lineHeight: 1 }}>✓</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="max-w-95 truncate text-[12px] tracking-[0.01em]" style={{ color: "var(--text-primary)" }}>
                        {task.title}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {(() => {
                          const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                          return (
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: project?.color ?? "var(--border-mid)" }} />
                              <span className="text-[10px] tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
                                {project?.name ?? "None"}
                              </span>
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell
                        className="hidden md:table-cell text-[10px] tracking-[0.04em]"
                        style={{ color: task.priority ? PRIORITY_COLORS[task.priority] : "var(--text-secondary)" }}
                      >
                        {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {(() => {
                          const d = formatDueDate(task.dueDate);
                          const color = d
                            ? d.urgency === "overdue" ? "rgba(217,107,107,0.8)"
                            : d.urgency === "today" ? "rgba(107,187,138,0.9)"
                            : d.urgency === "tomorrow" ? "rgba(230,180,70,0.9)"
                            : d.urgency === "week" ? "rgba(147,107,200,0.85)"
                            : "rgba(150,150,160,0.7)"
                            : "var(--text-secondary)";
                          return <span className="text-[10px] tracking-[0.03em]" style={{ color }}>{d?.label ?? "—"}</span>;
                        })()}
                      </TableCell>
                      <TableCell>
                        {activeEntry?.taskId === task.id ? (
                          <button
                            onClick={handleStopTimer}
                            className="text-[10px] px-2 py-1 rounded-sm border tracking-[0.03em] transition-opacity hover:opacity-80"
                            style={{ borderColor: "rgba(217,107,107,0.3)", color: "rgba(217,107,107,0.8)", background: "rgba(217,107,107,0.06)", fontFamily: "var(--font-mono)" }}
                          >
                            Stop
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartTimer(task.id)}
                            disabled={!!activeEntry}
                            className="text-[10px] px-2 py-1 rounded-sm border tracking-[0.03em] transition-opacity hover:opacity-80 disabled:opacity-25"
                            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "transparent", fontFamily: "var(--font-mono)" }}
                          >
                            Start
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {events.map((event) => {
                    const colors = TYPE_COLOR[event.type];
                    return (
                      <TableRow
                        key={`event-${event.id}`}
                        className="transition-colors"
                        style={{ borderColor: "var(--border)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                      >
                        <TableCell className="pr-0">
                          <span
                            className="w-3.5 h-3.5 rounded-[3px] flex items-center justify-center"
                            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                          />
                        </TableCell>
                        <TableCell className="max-w-95 truncate text-[12px] tracking-[0.01em]" style={{ color: "var(--text-primary)" }}>
                          {event.title}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-[10px] tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
                            {event.project ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell" />
                        <TableCell className="hidden md:table-cell">
                          {(() => {
                            const d = formatDueDate(event.date);
                            const color = d
                              ? d.urgency === "overdue" ? "rgba(217,107,107,0.8)"
                              : d.urgency === "today" ? "rgba(107,187,138,0.9)"
                              : d.urgency === "tomorrow" ? "rgba(230,180,70,0.9)"
                              : d.urgency === "week" ? "rgba(147,107,200,0.85)"
                              : "rgba(150,150,160,0.7)"
                              : "var(--text-secondary)";
                            return <span className="text-[10px] tracking-[0.03em]" style={{ color }}>{d?.label ?? event.date}</span>;
                          })()}
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-[10px] px-2 py-1 rounded-sm tracking-[0.03em]"
                            style={{ color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, fontFamily: "var(--font-mono)" }}
                          >
                            {event.type}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </>
              );
            })()}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-3 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="text-[11px] tracking-[0.02em]"
          style={{ color: "var(--text-secondary)" }}
        >
          {tasks.filter((t) => t.status === "done").length} of {tasks.length} done
        </span>
        {activeEntry && (
          <span
            className="text-[10px] tracking-[0.03em]"
            style={{
              color: "rgba(91,141,217,0.8)",
              fontFamily: "var(--font-mono)",
            }}
          >
            ● Timer running
          </span>
        )}
      </div>
    </div>
  );
}
