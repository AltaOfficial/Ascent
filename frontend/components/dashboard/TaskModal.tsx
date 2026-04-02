"use client";

import { useState, useEffect } from "react";
import React from "react";

type Status = "todo" | "in_progress" | "blocked" | "done";
type Priority = "low" | "medium" | "high";

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
  isHighValue: boolean;
  isRevenueImpact: boolean;
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
  projectTags = [],
}: {
  state: TaskModalState;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
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

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStatus(task.status);
      setPriority(task.priority ?? "low");
      setCategoryTag(task.categoryTag ?? "");
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
      setEstimatedRaw(formatEstimatedMinutes(task.estimatedMinutes));
      setNotes(task.description ?? "");
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
    });
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!task) return;
    await onDelete(task.id);
    onClose();
  }

  const fieldSelectStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono)",
  };

  const selectedTag = projectTags.find(t => t.name === categoryTag);

  const metaFields: { label: string; element: React.ReactNode }[] = [
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
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-5"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-xl border"
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
          {metaFields.map(({ label, element }) => (
            <div key={label}>
              <label
                className="block text-[9px] tracking-[0.08em] uppercase mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {label}
              </label>
              {element}
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="p-5">
          <div className="text-[9px] tracking-[0.08em] uppercase mb-2" style={{ color: "var(--text-secondary)" }}>
            Notes
          </div>
          <textarea
            className="w-full rounded-lg border px-3 py-2.5 text-[12px] outline-none resize-y min-h-[80px] leading-relaxed"
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
