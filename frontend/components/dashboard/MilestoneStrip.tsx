"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import { CalendarDays, Check, Ellipsis, Flag, Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

export type Milestone = {
  id: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  status: "open" | "done";
  projectId: string;
  taskCount: number;
  completedTaskCount: number;
  estimatedMinutes: number;
  actualMinutes: number;
};

function fmtHours(minutes: number): string {
  if (!minutes) return "0h";
  const hours = minutes / 60;
  return hours < 10 ? `${Math.round(hours * 10) / 10}h` : `${Math.round(hours)}h`;
}

function fmtTarget(date: string | null): string | null {
  if (!date) return null;
  return format(parse(date.slice(0, 10), "yyyy-MM-dd", new Date()), "MMM d");
}

function isOverdue(milestone: Milestone): boolean {
  if (!milestone.targetDate || milestone.status === "done") return false;
  return milestone.targetDate.slice(0, 10) < format(new Date(), "yyyy-MM-dd");
}

type Draft = {
  id: string | null;
  name: string;
  targetDate: string;
  description: string;
  status: "open" | "done";
};

const inputStyle: React.CSSProperties = {
  background: "var(--surface-raised)",
  borderColor: "var(--border)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)",
};

export function MilestoneStrip({
  projectId,
  milestones,
  onChange,
  selectedId,
  onSelect,
}: {
  projectId: string;
  milestones: Milestone[];
  onChange: (milestones: Milestone[]) => void;
  selectedId: string | null;
  onSelect: (milestoneId: string | null) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setDraft({ id: null, name: "", targetDate: "", description: "", status: "open" });
  }

  function openEdit(milestone: Milestone) {
    setDraft({
      id: milestone.id,
      name: milestone.name,
      targetDate: milestone.targetDate?.slice(0, 10) ?? "",
      description: milestone.description ?? "",
      status: milestone.status,
    });
  }

  async function save() {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    const body = JSON.stringify({
      name: draft.name.trim(),
      targetDate: draft.targetDate || null,
      description: draft.description.trim() || null,
      status: draft.status,
    });
    try {
      if (draft.id) {
        const updated = await apiFetch<Milestone>(
          `/projects/${projectId}/milestones/${draft.id}/update`,
          { method: "POST", body },
        );
        onChange(milestones.map((m) => (m.id === updated.id ? updated : m)));
      } else {
        const created = await apiFetch<Milestone>(
          `/projects/${projectId}/milestones`,
          { method: "POST", body },
        );
        onChange([...milestones, created]);
      }
      setDraft(null);
    } catch {}
    setSaving(false);
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/projects/${projectId}/milestones/${id}/delete`, {
        method: "POST",
      });
      onChange(milestones.filter((m) => m.id !== id));
      if (selectedId === id) onSelect(null);
      setDraft(null);
    } catch {}
  }

  return (
    <>
      <div
        className="flex items-stretch gap-2.5 overflow-x-auto pb-1 mb-4"
        style={{ scrollbarWidth: "none" }}
      >
        {milestones.map((milestone) => {
          const pct = milestone.taskCount
            ? Math.round((milestone.completedTaskCount / milestone.taskCount) * 100)
            : 0;
          const selected = selectedId === milestone.id;
          const done = milestone.status === "done";
          const overdue = isOverdue(milestone);
          const target = fmtTarget(milestone.targetDate);
          const hours =
            milestone.actualMinutes > 0 || milestone.estimatedMinutes > 0
              ? `${fmtHours(milestone.actualMinutes)}${
                  milestone.estimatedMinutes ? ` / ${fmtHours(milestone.estimatedMinutes)}` : ""
                }`
              : null;
          return (
            <div
              key={milestone.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => onSelect(selected ? null : milestone.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelect(selected ? null : milestone.id);
              }}
              title={selected ? "Showing only this milestone's tasks. Click to show all" : "Show only this milestone's tasks"}
              className="group/ms shrink-0 w-58 rounded-lg border px-3.5 pt-3 pb-2.5 cursor-pointer transition-colors flex flex-col gap-2.5"
              style={{
                background: selected ? "var(--surface-raised)" : "var(--surface)",
                borderColor: selected ? "var(--border-hi)" : "var(--border)",
              }}
              onMouseEnter={(e) => {
                if (!selected) e.currentTarget.style.borderColor = "var(--border-mid)";
              }}
              onMouseLeave={(e) => {
                if (!selected) e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    background: done ? "rgba(107,187,138,0.12)" : "var(--surface-2)",
                    color: done ? "rgba(107,187,138,0.9)" : "var(--text-mid)",
                  }}
                  aria-hidden
                >
                  {done ? <Check size={12} strokeWidth={2.5} /> : <Flag size={11} strokeWidth={2} />}
                </span>
                <span
                  className="flex-1 min-w-0 text-[13px] font-semibold tracking-[-0.005em] truncate"
                  style={{
                    color: done ? "var(--text-mid)" : "var(--text-primary)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {milestone.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(milestone);
                  }}
                  className="w-6 h-6 -mr-1.5 flex items-center justify-center rounded-md opacity-0 group-hover/ms:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0"
                  style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                  title="Edit milestone"
                  aria-label={`Edit ${milestone.name}`}
                >
                  <Ellipsis size={15} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--surface-raised)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: done ? "rgba(107,187,138,0.85)" : "var(--accent)",
                      opacity: done ? 1 : 0.75,
                    }}
                  />
                </div>
                <span className="text-[10px] w-8 text-right" style={{ color: "var(--text-mid)", fontFamily: "var(--font-mono)" }}>
                  {pct}%
                </span>
              </div>

              <div
                className="flex items-center justify-between gap-2 text-[10px] tracking-[0.02em]"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
              >
                <span className="truncate">
                  {milestone.completedTaskCount}/{milestone.taskCount} tasks{hours ? ` · ${hours}` : ""}
                </span>
                {target && (
                  <span
                    className="flex items-center gap-1 shrink-0"
                    style={{ color: overdue ? "rgba(217,107,107,0.85)" : undefined }}
                    title={overdue ? "Past its target date" : "Target date"}
                  >
                    <CalendarDays size={11} aria-hidden />
                    {target}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        <button
          onClick={openCreate}
          className={`shrink-0 flex items-center justify-center gap-1.5 text-[11px] tracking-[0.03em] rounded-lg border border-dashed transition-colors ${
            milestones.length ? "w-36" : "px-4 py-2.5"
          }`}
          style={{
            color: "var(--text-secondary)",
            borderColor: "var(--border)",
            background: "none",
            fontFamily: "var(--font-mono)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.borderColor = "var(--border-mid)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          <Plus size={13} /> Milestone
        </button>
      </div>

      {draft && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setDraft(null)}
        >
          <div
            className="w-full max-w-100 rounded-xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
              <span
                className="text-[15px] font-semibold tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                {draft.id ? "Edit Milestone" : "New Milestone"}
              </span>
              <button
                onClick={() => setDraft(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[5px]"
                style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
                  Name
                </span>
                <input
                  autoFocus
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                  placeholder="e.g. MVP launch"
                  className="w-full rounded-[7px] border px-3 py-2 text-[13px] outline-none"
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
                  Target date
                </span>
                <input
                  type="date"
                  value={draft.targetDate}
                  onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
                  className="w-full rounded-[7px] border px-3 py-2 text-[12px] outline-none"
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
                  Description
                </span>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={3}
                  placeholder="What does done look like?"
                  className="w-full rounded-[7px] border px-3 py-2 text-[12px] outline-none resize-none"
                  style={inputStyle}
                />
              </label>
              {draft.id && (
                <button
                  onClick={() =>
                    setDraft({ ...draft, status: draft.status === "done" ? "open" : "done" })
                  }
                  className="self-start flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md border"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: draft.status === "done" ? "rgba(107,187,138,0.1)" : "none",
                    borderColor: draft.status === "done" ? "rgba(107,187,138,0.35)" : "var(--border)",
                    color: draft.status === "done" ? "rgba(107,187,138,0.9)" : "var(--text-mid)",
                  }}
                >
                  <Check size={12} />
                  {draft.status === "done" ? "Done. Click to reopen" : "Mark milestone done"}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between px-5 pb-5">
              {draft.id ? (
                <button
                  onClick={() => remove(draft.id!)}
                  className="text-[11px]"
                  style={{ color: "rgba(217,107,107,0.7)", background: "none", border: "none" }}
                  title="Delete milestone (its tasks are kept)"
                >
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setDraft(null)}
                  className="px-4 py-1.5 text-[11px] rounded-[7px] border"
                  style={{ color: "var(--text-mid)", borderColor: "var(--border)", fontFamily: "var(--font-mono)", background: "none" }}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving || !draft.name.trim()}
                  className="px-5 py-1.5 text-[11px] font-medium rounded-[7px] disabled:opacity-40"
                  style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)", border: "none" }}
                >
                  {saving ? "Saving…" : draft.id ? "Save" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
