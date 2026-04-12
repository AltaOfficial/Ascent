"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { startOfToday, endOfWeek, addWeeks, isWithinInterval, parseISO } from "date-fns";
import { apiFetch } from "@/lib/api";
import { useTimerStore } from "@/lib/timerStore";
import {
  TaskModal,
  type TaskModalState,
} from "@/components/dashboard/TaskModal";
import {
  TaskFilterBar,
  type FilterMode,
  type SortKey,
} from "@/components/dashboard/TaskFilterBar";
import { AddTaskRow } from "@/components/dashboard/AddTaskRow";
import { TaskRow, formatDueDate, type Task } from "@/components/dashboard/TaskRow";
import { TYPE_COLOR } from "@/components/dashboard/calendarTypes";
import type { CalEvent } from "@/components/dashboard/calendarTypes";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

type Project = { id: string; name: string; color: string | null };

export default function InboxPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [modalState, setModalState] = useState<TaskModalState>({
    open: false,
    task: null,
  });
  const [addingTitle, setAddingTitle] = useState("");
  const [addInputFocused, setAddInputFocused] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const { activeEntry, setActive, clear } = useTimerStore();

  const loadTasks = useCallback(async () => {
    try {
      const nextWeekEnd = endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
      const [data, projectList, eventList] = await Promise.all([
        apiFetch<Task[]>("/tasks/list", {
          method: "POST",
          body: JSON.stringify({ projectId: null }),
        }),
        apiFetch<Project[]>("/projects"),
        apiFetch<CalEvent[]>("/calendar-events"),
      ]);
      const ids = data.map((t) => t.id);
      let counts: Record<string, { total: number; completed: number }> = {};
      if (ids.length) {
        counts = await apiFetch<Record<string, { total: number; completed: number }>>("/tasks/subtask-counts", {
          method: "POST",
          body: JSON.stringify({ taskIds: ids }),
        }).catch(() => ({}));
      }
      setTasks(data.map((t) => ({ ...t, subtaskCount: counts[t.id]?.total ?? 0, subtaskCompletedCount: counts[t.id]?.completed ?? 0 })));
      setProjects(projectList);
      setEvents(
        eventList.filter(
          (e) =>
            (e.type === "event" || e.type === "exam") &&
            !e.done &&
            isWithinInterval(parseISO(e.date), { start: startOfToday(), end: nextWeekEnd }),
        ),
      );
    } catch {}
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const visibleTasks = (() => {
    const nextWeekEnd = endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
    let filtered = tasks.filter((task) => {
      const statusMatch = filterMode === "done" ? task.status === "done" : task.status !== "done";
      if (!statusMatch) return false;
      if (!task.projectId) return true;
      return task.dueDate
        ? parseISO(task.dueDate) <= nextWeekEnd
        : false;
    });
    filtered = [...filtered].sort((taskA, taskB) => {
      if (sortKey === "priority") {
        return (
          (PRIORITY_ORDER[taskA.priority ?? "low"] ?? 2) -
          (PRIORITY_ORDER[taskB.priority ?? "low"] ?? 2)
        );
      }
      if (sortKey === "due") {
        if (!taskA.dueDate && !taskB.dueDate) return 0;
        if (!taskA.dueDate) return 1;
        if (!taskB.dueDate) return -1;
        return (
          new Date(taskA.dueDate).getTime() - new Date(taskB.dueDate).getTime()
        );
      }
      return 0;
    });
    return filtered;
  })();

  async function handleAdd() {
    const title = addingTitle.trim();
    if (!title) {
      setAddInputFocused(false);
      setAddingTitle("");
      return;
    }
    try {
      const created = await apiFetch<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify({ title, projectId: null }),
      });
      setTasks((prev) => [created, ...prev]);
    } catch {}
    setAddingTitle("");
    setAddInputFocused(false);
  }

  async function handleMarkDone(taskId: string) {
    const task = tasks.find((task) => task.id === taskId);
    if (!task) return;
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      await apiFetch(`/tasks/${taskId}/update`, {
        method: "POST",
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task,
        ),
      );
    } catch {}
  }

  async function handleStartTimer(taskId: string) {
    const { activeEntry: current } = useTimerStore.getState();
    if (current) {
      await apiFetch("/time-entries/stop", {
        method: "POST",
        body: JSON.stringify({ timeEntryId: current.id }),
      });
    }
    if (current?.taskId === taskId) {
      clear();
      return;
    }
    try {
      const entry = await apiFetch<{
        id: string;
        taskId: string;
        startedAt: string;
      }>("/time-entries/start", {
        method: "POST",
        body: JSON.stringify({ taskId }),
      });
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setActive(entry, {
          id: task.id,
          title: task.title,
          estimatedMinutes: task.estimatedMinutes ?? null,
        });
      }
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: "in_progress" } : task,
        ),
      );
    } catch {}
  }

  async function handleSaveTask(id: string, updates: Partial<Task>) {
    try {
      const updated = await apiFetch<Task>(`/tasks/${id}/update`, {
        method: "POST",
        body: JSON.stringify(updates),
      });
      setTasks((prev) => prev.map((task) => task.id === id ? { ...updated, subtaskCount: task.subtaskCount, subtaskCompletedCount: task.subtaskCompletedCount } : task));
    } catch {}
  }

  async function handleDeleteTask(id: string) {
    try {
      await apiFetch(`/tasks/${id}/delete`, { method: "POST" });
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch {}
  }

  const activeTodoCount = tasks.filter((task) => task.status !== "done").length;

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ paddingBottom: activeEntry ? 52 : 0 }}
    >
      {/* Page header */}
      <div className="shrink-0 px-6 md:px-10 pt-7 pb-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-baseline gap-2.5">
            <h1
              className="text-[22px] font-semibold tracking-[-0.03em]"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--text-primary)",
              }}
            >
              Inbox
            </h1>
            <span
              className="text-[12px] tracking-[0.03em]"
              style={{ color: "var(--text-secondary)" }}
            >
              {activeTodoCount} task{activeTodoCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <TaskFilterBar
          filterMode={filterMode}
          onFilterChange={setFilterMode}
          sortKey={sortKey}
          onSortChange={setSortKey}
        />
      </div>

      {/* Scroll area */}
      <div
        className="flex-1 overflow-y-auto px-6 md:px-10 pb-8"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {/* Table header */}
        <div
          className="flex items-center py-2.5 mt-1 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="w-9 shrink-0" />
          <div
            className="flex-1 text-[9px] tracking-widest uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Title
          </div>
          <div
            className="hidden sm:block w-28 shrink-0 text-[9px] tracking-widest uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Project
          </div>
          <div
            className="hidden sm:block w-25 shrink-0 text-[9px] tracking-widest uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Priority
          </div>
          <div
            className="hidden md:block w-19 shrink-0 text-[9px] tracking-widest uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Due
          </div>
          <div
            className="hidden md:block w-12.5 shrink-0 text-[9px] tracking-widest uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Est
          </div>
          <div className="w-29 shrink-0" />
        </div>

        <AddTaskRow
          inputRef={addInputRef}
          value={addingTitle}
          focused={addInputFocused}
          onChange={setAddingTitle}
          onFocus={() => setAddInputFocused(true)}
          onBlur={() => {
            if (!addingTitle.trim()) setAddInputFocused(false);
          }}
          onAdd={handleAdd}
          onCancel={() => {
            setAddingTitle("");
            setAddInputFocused(false);
            addInputRef.current?.blur();
          }}
        />

        {visibleTasks.length === 0 && events.length === 0 ? (
          <div
            className="text-center py-20 text-[12px] tracking-[0.04em]"
            style={{ color: "var(--text-secondary)", opacity: 0.4 }}
          >
            {filterMode === "done" ? "No completed tasks." : "Inbox zero."}
          </div>
        ) : (
          <>
            {visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                project={projects.find((p) => p.id === task.projectId) ?? null}
                isTimerRunning={activeEntry?.taskId === task.id}
                onMarkDone={handleMarkDone}
                onStartTimer={handleStartTimer}
                onEdit={(task) => setModalState({ open: true, task })}
              />
            ))}
            {events.map((event) => {
              const colors = TYPE_COLOR[event.type];
              return (
                <div
                  key={`event-${event.id}`}
                  className="flex items-center border-b min-h-11.5 transition-colors"
                  style={{ borderColor: "var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <div className="w-9 shrink-0 flex items-center justify-center">
                    <span
                      className="w-3.5 h-3.5 rounded-[3px]"
                      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2 py-2.5 pr-3">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded tracking-[0.04em]"
                      style={{ color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, fontFamily: "var(--font-mono)" }}
                    >
                      {event.type}
                    </span>
                    <span className="text-[12px] tracking-[0.01em] truncate" style={{ color: "var(--text-primary)" }}>
                      {event.title}
                    </span>
                  </div>
                  <div className="hidden sm:block w-28 shrink-0 text-[10px] tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
                    {event.project ?? "—"}
                  </div>
                  <div className="hidden sm:block w-25 shrink-0 text-[10px] tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
                    —
                  </div>
                  {(() => {
                    const d = formatDueDate(event.date);
                    const color = d
                      ? d.urgency === "overdue" ? "rgba(217,107,107,0.8)"
                      : d.urgency === "today" ? "rgba(107,187,138,0.9)"
                      : d.urgency === "tomorrow" ? "rgba(230,180,70,0.9)"
                      : d.urgency === "week" ? "rgba(147,107,200,0.85)"
                      : "rgba(150,150,160,0.7)"
                      : "var(--text-secondary)";
                    return <div className="hidden md:block w-19 shrink-0 text-[10px] tracking-[0.03em]" style={{ color }}>{d?.label ?? event.date}</div>;
                  })()}
                  <div className="hidden md:block w-12.5 shrink-0" />
                  <div className="w-29 shrink-0" />
                </div>
              );
            })}
          </>
        )}
      </div>

      <TaskModal
        state={modalState}
        onClose={() => setModalState({ open: false, task: null })}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onSubtaskCountChange={(taskId, total, completed) =>
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, subtaskCount: total, subtaskCompletedCount: completed } : t)),
          )
        }
      />
    </div>
  );
}
