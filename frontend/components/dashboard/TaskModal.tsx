"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import { apiFetch } from "@/lib/api";

type Status = "todo" | "in_progress" | "blocked" | "done";
type Priority = "low" | "medium" | "high";

type RepeatFrequency = "daily" | "weekly" | "custom";

type Task = {
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
  subtaskCount?: number;
  repeatEnabled?: boolean;
  repeatFrequency?: RepeatFrequency | null;
  repeatDays?: number[] | null;
  repeatInterval?: number | null;
};

type Subtask = {
  id: string;
  title: string;
  completed: boolean;
  taskId: string;
};

export type ProjectTag = { id: string; name: string; color: string };

export type TaskModalState = {
  open: boolean;
  task: Task | null;
};

function formatEstimatedMinutes(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function parseEstimatedInput(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  let totalMinutes = 0;
  const hourMatch = trimmed.match(/(\d+)\s*h/);
  const minuteMatch = trimmed.match(/(\d+)\s*m/);
  if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
  if (minuteMatch) totalMinutes += parseInt(minuteMatch[1]);
  if (!hourMatch && !minuteMatch) {
    const plainNumber = parseInt(trimmed);
    if (!isNaN(plainNumber)) return plainNumber;
  }
  return totalMinutes > 0 ? totalMinutes : null;
}

export function TaskModal({
  state,
  onClose,
  onSave,
  onDelete,
  onSubtaskCountChange,
  projectTags = [],
}: {
  state: TaskModalState;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSubtaskCountChange?: (taskId: string, total: number, completed: number) => void;
  projectTags?: ProjectTag[];
}) {
  const { open, task } = state;

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Status>("todo");
  const [priority, setPriority] = useState<Priority>("low");
  const [categoryTag, setCategoryTag] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedRaw, setEstimatedRaw] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const mouseDownOnBackdrop = useRef(false);

  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<RepeatFrequency>("daily");
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatInterval, setRepeatInterval] = useState(2);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStatus(task.status);
      setPriority(task.priority ?? "low");
      setCategoryTag(task.categoryTag ?? "");
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
      setEstimatedRaw(formatEstimatedMinutes(task.estimatedMinutes));
      setNotes(task.description ?? "");
      setRepeatEnabled(task.repeatEnabled ?? false);
      setRepeatFrequency(task.repeatFrequency ?? "daily");
      setRepeatDays(task.repeatDays ?? []);
      setRepeatInterval(task.repeatInterval ?? 2);
      setSubtasks([]);
      setNewSubtaskTitle("");
      setAddingSubtask(false);
      apiFetch<Subtask[]>(`/tasks/${task.id}/subtasks`)
        .then((list) => {
          const sorted = [...list].sort(
            (a, b) => Number(a.completed) - Number(b.completed),
          );
          setSubtasks(sorted);
        })
        .catch(() => {});
    }
  }, [task]);

  if (!open || !task) return null;

  async function handleSave() {
    if (!task) return;
    setSaving(true);
    await onSave(task.id, {
      title: title.trim() || task.title,
      status,
      priority,
      categoryTag: categoryTag || null,
      dueDate: dueDate || null,
      estimatedMinutes: parseEstimatedInput(estimatedRaw),
      description: notes || null,
      repeatEnabled,
      repeatFrequency: repeatEnabled ? repeatFrequency : null,
      repeatDays: repeatEnabled && repeatFrequency === "weekly" ? repeatDays : null,
      repeatInterval: repeatEnabled && repeatFrequency === "custom" ? repeatInterval : null,
    });
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!task) return;
    await onDelete(task.id);
    onClose();
  }

  async function handleAddSubtask() {
    if (!task || !newSubtaskTitle.trim()) {
      setAddingSubtask(false);
      setNewSubtaskTitle("");
      return;
    }
    try {
      const created = await apiFetch<Subtask>(`/tasks/${task.id}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      });
      const next = [...subtasks, created];
      setSubtasks(next);
      onSubtaskCountChange?.(task.id, next.length, next.filter((s) => s.completed).length);
    } catch {}
    setNewSubtaskTitle("");
    subtaskInputRef.current?.focus();
  }

  async function handleToggleSubtask(subtask: Subtask) {
    if (!task) return;
    try {
      const updated = await apiFetch<Subtask>(
        `/tasks/${task.id}/subtasks/${subtask.id}/update`,
        {
          method: "POST",
          body: JSON.stringify({ completed: !subtask.completed }),
        },
      );
      const next = subtasks.map((s) => (s.id === subtask.id ? updated : s));
      setSubtasks(next);
      onSubtaskCountChange?.(task.id, next.length, next.filter((s) => s.completed).length);
    } catch {}
  }

  async function handleDeleteSubtask(subtaskId: string) {
    if (!task) return;
    try {
      await apiFetch(`/tasks/${task.id}/subtasks/${subtaskId}/delete`, {
        method: "POST",
      });
      const next = subtasks.filter((s) => s.id !== subtaskId);
      setSubtasks(next);
      onSubtaskCountChange?.(task.id, next.length, next.filter((s) => s.completed).length);
    } catch {}
  }

  const completedCount = subtasks.filter((s) => s.completed).length;

  const fieldSelectStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono)",
  };

  const selectedTag = projectTags.find(t => t.name === categoryTag);

  const metaFields: { label: string; labelSuffix?: React.ReactNode; element: React.ReactNode }[] = [
    {
      label: "Status",
      element: (
        <select
          className="w-full rounded-md border px-2.5 py-1.5 text-[11px] outline-none"
          style={fieldSelectStyle}
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
        >
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </select>
      ),
    },
    {
      label: "Priority",
      element: (
        <select
          className="w-full rounded-md border px-2.5 py-1.5 text-[11px] outline-none"
          style={fieldSelectStyle}
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      ),
    },
    {
      label: "Tag",
      element: (
        <div className="relative">
          <select
            className="w-full rounded-md border px-2.5 py-1.5 text-[11px] outline-none"
            style={{
              ...fieldSelectStyle,
              ...(selectedTag ? { color: selectedTag.color } : {}),
            }}
            value={categoryTag}
            onChange={(e) => setCategoryTag(e.target.value)}
          >
            <option value="">None</option>
            {projectTags.map(tag => (
              <option key={tag.id} value={tag.name}>{tag.name}</option>
            ))}
          </select>
        </div>
      ),
    },
    {
      label: "Due date",
      element: (
        <input
          type="date"
          className="w-full rounded-md border px-2.5 py-1.5 text-[11px] outline-none"
          style={fieldSelectStyle}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      ),
    },
    {
      label: "Estimated time",
      element: (
        <input
          className="w-full rounded-md border px-2.5 py-1.5 text-[11px] outline-none"
          style={fieldSelectStyle}
          value={estimatedRaw}
          onChange={(e) => setEstimatedRaw(e.target.value)}
          placeholder="e.g. 45m, 1h 30m"
        />
      ),
    },
    {
      label: "Actual time",
      element: (
        <div
          className="w-full rounded-md border px-2.5 py-1.5 text-[11px] flex items-center gap-1.5"
          style={task?.actualMinutes ? {
            background: "rgba(107,187,138,0.07)",
            borderColor: "rgba(107,187,138,0.35)",
            color: "rgba(107,187,138,0.95)",
            fontFamily: "var(--font-mono)",
          } : {
            background: "var(--surface-2)",
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)",
            opacity: 0.45,
          }}
        >
          {task?.actualMinutes && (
            <span style={{ fontSize: 10, opacity: 0.7 }}>●</span>
          )}
          {task?.actualMinutes ? formatEstimatedMinutes(task.actualMinutes) : "—"}
        </div>
      ),
    },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-5"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (e.target === e.currentTarget && mouseDownOnBackdrop.current) onClose(); }}
    >
      <div
        className="w-full max-w-120 max-h-[90vh] overflow-y-auto rounded-xl border"
        style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
      >
        {/* Title */}
        <div className="flex items-start justify-between p-5 pb-0">
          <input
            className="flex-1 bg-transparent border-none outline-none text-base font-semibold tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[5px] text-[18px] shrink-0 transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            ×
          </button>
        </div>

        {/* Meta fields */}
        <div className="grid grid-cols-2 gap-2.5 p-5 border-b" style={{ borderColor: "var(--border)" }}>
          {metaFields.map(({ label, labelSuffix, element }) => (
            <div key={label}>
              <div className="flex items-center mb-1.5">
                <label
                  className="text-[9px] tracking-[0.08em] uppercase"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {label}
                </label>
                {labelSuffix}
              </div>
              {element}
            </div>
          ))}
        </div>

        {/* Subtasks */}
        <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] tracking-[0.08em] uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                Subtasks
              </span>
              {subtasks.length > 0 && (
                <span
                  className="text-[9px] tracking-[0.04em]"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", opacity: 0.6 }}
                >
                  {completedCount}/{subtasks.length}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setAddingSubtask(true);
                setTimeout(() => subtaskInputRef.current?.focus(), 0);
              }}
              className="text-[10px] transition-colors"
              style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              + Add
            </button>
          </div>

          {subtasks.length === 0 && !addingSubtask && (
            <div
              className="text-[11px] tracking-[0.02em]"
              style={{ color: "var(--text-secondary)", opacity: 0.4 }}
            >
              No subtasks
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-2 group/subtask py-0.5"
              >
                <button
                  onClick={() => handleToggleSubtask(subtask)}
                  className="w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    borderColor: subtask.completed
                      ? "rgba(107,187,138,0.35)"
                      : "var(--border-mid)",
                    background: subtask.completed
                      ? "rgba(107,187,138,0.12)"
                      : "transparent",
                  }}
                >
                  {subtask.completed && (
                    <span style={{ fontSize: 8, color: "rgba(107,187,138,0.9)", lineHeight: 1 }}>
                      ✓
                    </span>
                  )}
                </button>
                <span
                  className="flex-1 text-[12px] tracking-[0.01em]"
                  style={{
                    color: subtask.completed ? "var(--text-secondary)" : "var(--text-primary)",
                    textDecoration: subtask.completed ? "line-through" : "none",
                    opacity: subtask.completed ? 0.55 : 1,
                  }}
                >
                  {subtask.title}
                </span>
                <button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  className="opacity-0 group-hover/subtask:opacity-100 text-[13px] leading-none transition-opacity"
                  style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(217,107,107,0.8)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {addingSubtask && (
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-3.5 h-3.5 border rounded-[3px] shrink-0"
                style={{ borderColor: "var(--border-mid)" }}
              />
              <input
                ref={subtaskInputRef}
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubtask();
                  if (e.key === "Escape") {
                    setAddingSubtask(false);
                    setNewSubtaskTitle("");
                  }
                }}
                onBlur={() => {
                  if (!newSubtaskTitle.trim()) {
                    setAddingSubtask(false);
                    setNewSubtaskTitle("");
                  } else {
                    handleAddSubtask();
                  }
                }}
                placeholder="Subtask title..."
                className="flex-1 bg-transparent border-b outline-none text-[12px] tracking-[0.01em] py-0.5"
                style={{
                  color: "var(--text-primary)",
                  borderColor: "var(--border-mid)",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>
          )}
        </div>

        {/* Repeat */}
        <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
              Repeat
            </span>
            <button
              onClick={() => setRepeatEnabled((v) => !v)}
              className="relative w-8 h-4 rounded-full transition-colors duration-200 shrink-0"
              style={{
                background: repeatEnabled ? "var(--border-mid)" : "var(--border-mid)",
                opacity: repeatEnabled ? 1 : 0.5,
              }}
            >
              <span
                className="absolute top-0.5 rounded-full transition-all duration-200"
                style={{
                  width: 12,
                  height: 12,
                  background: "var(--text-primary)",
                  left: repeatEnabled ? "calc(100% - 14px)" : 2,
                  opacity: repeatEnabled ? 1 : 0.3,
                }}
              />
            </button>
          </div>

          {repeatEnabled && (
            <div className="mt-3 flex flex-col gap-3">
              {/* Frequency pills */}
              <div className="flex gap-1.5">
                {(["daily", "weekly", "custom"] as RepeatFrequency[]).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setRepeatFrequency(freq)}
                    className="px-3 py-1 rounded-full text-[10px] tracking-[0.05em] capitalize transition-all duration-150"
                    style={
                      repeatFrequency === freq
                        ? {
                            background: "var(--text-primary)",
                            color: "var(--bg)",
                            fontFamily: "var(--font-mono)",
                          }
                        : {
                            background: "var(--surface-2)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border)",
                            fontFamily: "var(--font-mono)",
                          }
                    }
                  >
                    {freq}
                  </button>
                ))}
              </div>

              {/* Weekly day picker */}
              {repeatFrequency === "weekly" && (
                <div className="flex gap-1.5">
                  {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => {
                    const active = repeatDays.includes(i);
                    return (
                      <button
                        key={i}
                        onClick={() =>
                          setRepeatDays((prev) =>
                            prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i],
                          )
                        }
                        className="w-7 h-7 rounded-full text-[10px] font-medium transition-all duration-150"
                        style={
                          active
                            ? {
                                background: "var(--surface-2)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-mid)",
                                fontFamily: "var(--font-mono)",
                              }
                            : {
                                background: "var(--surface-2)",
                                color: "var(--text-secondary)",
                                border: "1px solid var(--border)",
                                fontFamily: "var(--font-mono)",
                                opacity: 0.5,
                              }
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Custom interval */}
              {repeatFrequency === "custom" && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    Every
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 rounded-md border px-2 py-1 text-[11px] text-center outline-none"
                    style={{
                      background: "var(--surface-2)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                  <span className="text-[11px]" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    days
                  </span>
                </div>
              )}

              {/* Summary label */}
              <div
                className="text-[10px] tracking-[0.03em] px-2.5 py-1.5 rounded-md"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {repeatFrequency === "daily" && "Repeats every day"}
                {repeatFrequency === "weekly" &&
                  (repeatDays.length === 0
                    ? "Pick days above"
                    : `Repeats every ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].filter((_, i) => repeatDays.includes(i)).join(", ")}`)}
                {repeatFrequency === "custom" && `Repeats every ${repeatInterval} day${repeatInterval === 1 ? "" : "s"}`}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="p-5">
          <div className="text-[9px] tracking-[0.08em] uppercase mb-2" style={{ color: "var(--text-secondary)" }}>
            Notes
          </div>
          <textarea
            className="w-full rounded-lg border px-3 py-2.5 text-[12px] outline-none resize-y min-h-20 leading-relaxed"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes, context, links..."
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 pb-5 pt-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={handleDelete}
            className="text-[11px] tracking-[0.03em] transition-colors"
            style={{ color: "rgba(217,107,107,0.6)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(217,107,107,0.9)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(217,107,107,0.6)")}
          >
            Delete task
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-[11px] font-medium px-5 py-1.5 rounded-lg transition-opacity disabled:opacity-50"
            style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
