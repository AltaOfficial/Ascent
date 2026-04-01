"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { apiFetch } from "@/lib/api";

// ── types ─────────────────────────────────────────────────────────────────────

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

type ActiveEntry = { id: string; taskId: string; startedAt: string } | null;

type Filter = "all" | "done";
type SortKey = "due" | "priority" | "created";

// ── utils ─────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<Status, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function fmtDue(dateStr: string | null): { label: string; cls: string } | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  const diff = differenceInCalendarDays(d, new Date());
  const label = format(d, "MMM d");
  if (diff < 0) return { label, cls: "overdue" };
  if (diff <= 2) return { label, cls: "soon" };
  return { label, cls: "" };
}

function fmtEst(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function parseEstInput(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  let minutes = 0;
  const hMatch = s.match(/(\d+)\s*h/);
  const mMatch = s.match(/(\d+)\s*m/);
  if (hMatch) minutes += parseInt(hMatch[1]) * 60;
  if (mMatch) minutes += parseInt(mMatch[1]);
  if (!hMatch && !mMatch) {
    const plain = parseInt(s);
    if (!isNaN(plain)) return plain;
  }
  return minutes > 0 ? minutes : null;
}

// ── sub-components ────────────────────────────────────────────────────────────

function TagBadge({ tag }: { tag: string }) {
  const styles: Record<string, React.CSSProperties> = {
    bug:     { background: "rgba(217,107,107,0.15)", color: "rgba(217,107,107,0.85)" },
    exam:    { background: "rgba(217,107,107,0.15)", color: "rgba(217,107,107,0.85)" },
    feature: { background: "rgba(91,141,217,0.15)",  color: "rgba(91,141,217,0.85)" },
    chore:   { background: "rgba(200,200,210,0.1)",  color: "var(--text-mid)" },
    urgent:  { background: "rgba(217,167,91,0.15)",  color: "rgba(217,167,91,0.85)" },
  };
  return (
    <span
      className="text-[9px] tracking-[0.06em] uppercase px-1.5 py-0.5 rounded-[3px] font-medium shrink-0"
      style={styles[tag] ?? { background: "rgba(200,200,210,0.1)", color: "var(--text-mid)" }}
    >
      {tag}
    </span>
  );
}

// ── task modal ────────────────────────────────────────────────────────────────

type ModalState = {
  open: boolean;
  task: Task | null;
};

function TaskModal({
  state,
  onClose,
  onSave,
  onDelete,
}: {
  state: ModalState;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { open, task } = state;

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Status>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [tag, setTag] = useState("");
  const [due, setDue] = useState("");
  const [estRaw, setEstRaw] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStatus(task.status);
      setPriority(task.priority ?? "medium");
      setTag(task.categoryTag ?? "");
      setDue(task.dueDate ? task.dueDate.slice(0, 10) : "");
      setEstRaw(fmtEst(task.estimatedMinutes).replace("—", ""));
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
      categoryTag: tag || null,
      dueDate: due || null,
      estimatedMinutes: parseEstInput(estRaw),
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

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-5"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-[12px] border"
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
        <div
          className="grid grid-cols-2 gap-2.5 p-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          {(
            [
              {
                label: "Status",
                el: (
                  <select
                    className="w-full rounded-[6px] border px-2.5 py-1.5 text-[11px] outline-none"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
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
                el: (
                  <select
                    className="w-full rounded-[6px] border px-2.5 py-1.5 text-[11px] outline-none"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
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
                el: (
                  <select
                    className="w-full rounded-[6px] border px-2.5 py-1.5 text-[11px] outline-none"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                  >
                    <option value="">None</option>
                    <option value="bug">Bug</option>
                    <option value="exam">Exam</option>
                    <option value="feature">Feature</option>
                    <option value="chore">Chore</option>
                    <option value="urgent">Urgent</option>
                  </select>
                ),
              },
              {
                label: "Due date",
                el: (
                  <input
                    type="date"
                    className="w-full rounded-[6px] border px-2.5 py-1.5 text-[11px] outline-none"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                ),
              },
              {
                label: "Estimated time",
                el: (
                  <input
                    className="w-full rounded-[6px] border px-2.5 py-1.5 text-[11px] outline-none"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    value={estRaw}
                    onChange={(e) => setEstRaw(e.target.value)}
                    placeholder="e.g. 45m, 1h 30m"
                  />
                ),
              },
            ] as { label: string; el: React.ReactNode }[]
          ).map(({ label, el }) => (
            <div key={label}>
              <label
                className="block text-[9px] tracking-[0.08em] uppercase mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {label}
              </label>
              {el}
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="p-5">
          <div
            className="text-[9px] tracking-[0.08em] uppercase mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Notes
          </div>
          <textarea
            className="w-full rounded-[7px] border px-3 py-2.5 text-[12px] outline-none resize-y min-h-[80px] leading-relaxed"
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
            className="text-[11px] font-medium px-5 py-1.5 rounded-[7px] transition-opacity disabled:opacity-50"
            style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── timer bar ─────────────────────────────────────────────────────────────────

function TimerBar({
  activeEntry,
  activeTask,
  onStop,
}: {
  activeEntry: ActiveEntry;
  activeTask: Task | null;
  onStop: () => void;
}) {
  const [elapsed, setElapsed] = useState("0:00");

  useEffect(() => {
    if (!activeEntry) return;
    const tick = () => setElapsed(fmtElapsed(activeEntry.startedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
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
        <div>
          <div
            className="text-[12px] tracking-[0.01em] max-w-[320px] truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {activeTask.title}
          </div>
        </div>
      </div>
      <div
        className="text-[18px] font-semibold tracking-[0.03em] min-w-[60px] text-center"
        style={{ fontFamily: "var(--font-display)", color: "rgba(107,187,138,0.9)" }}
      >
        {elapsed}
      </div>
      <div className="flex items-center gap-3">
        {activeTask.estimatedMinutes && (
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Est: {fmtEst(activeTask.estimatedMinutes)}
          </span>
        )}
        <button
          onClick={onStop}
          className="text-[10px] px-3.5 py-1.5 rounded-[6px] border tracking-[0.04em] transition-colors"
          style={{
            borderColor: "rgba(217,107,107,0.25)",
            color: "rgba(217,107,107,0.7)",
            fontFamily: "var(--font-mono)",
          }}
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

// ── main page ─────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeEntry, setActiveEntry] = useState<ActiveEntry>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("due");
  const [modal, setModal] = useState<ModalState>({ open: false, task: null });
  const [addingTitle, setAddingTitle] = useState("");
  const [addingFocused, setAddingFocused] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  // fetch
  const loadTasks = useCallback(async () => {
    try {
      const data = await apiFetch<Task[]>("/tasks/list", {
        method: "POST",
        body: JSON.stringify({ projectId: null }),
      });
      setTasks(data);
    } catch {}
  }, []);

  useEffect(() => {
    loadTasks();
    apiFetch<ActiveEntry>("/time-entries/active").then(setActiveEntry).catch(() => {});
  }, [loadTasks]);

  // sorted/filtered view
  const visible = (() => {
    let list = tasks.filter((t) =>
      filter === "done" ? t.status === "done" : t.status !== "done"
    );
    list = [...list].sort((a, b) => {
      if (sort === "priority") {
        return (PRIORITY_ORDER[a.priority ?? "low"] ?? 2) - (PRIORITY_ORDER[b.priority ?? "low"] ?? 2);
      }
      if (sort === "due") {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0; // created = natural order from API
    });
    return list;
  })();

  const activeTask = activeEntry
    ? tasks.find((t) => t.id === activeEntry.taskId) ?? null
    : null;

  // actions
  async function handleAdd() {
    const title = addingTitle.trim();
    if (!title) { setAddingFocused(false); setAddingTitle(""); return; }
    try {
      const created = await apiFetch<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify({ title, projectId: null }),
      });
      setTasks((prev) => [created, ...prev]);
    } catch {}
    setAddingTitle("");
    setAddingFocused(false);
  }

  async function handleMarkDone(taskId: string) {
    const t = tasks.find((t) => t.id === taskId);
    if (!t) return;
    const newStatus: Status = t.status === "done" ? "todo" : "done";
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) => prev.map((tk) => tk.id === taskId ? { ...tk, status: newStatus } : tk));
    } catch {}
  }

  async function handleStartTimer(taskId: string) {
    // stop current first
    if (activeEntry) {
      try {
        await apiFetch("/time-entries/stop", {
          method: "POST",
          body: JSON.stringify({ timeEntryId: activeEntry.id }),
        });
      } catch {}
    }
    if (activeEntry?.taskId === taskId) {
      setActiveEntry(null);
      return;
    }
    try {
      const entry = await apiFetch<{ id: string; taskId: string; startedAt: string }>("/time-entries/start", {
        method: "POST",
        body: JSON.stringify({ taskId }),
      });
      setActiveEntry(entry);
      setTasks((prev) =>
        prev.map((tk) => tk.id === taskId ? { ...tk, status: "in_progress" } : tk)
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

  async function handleSaveTask(id: string, updates: Partial<Task>) {
    try {
      const updated = await apiFetch<Task>(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      setTasks((prev) => prev.map((t) => t.id === id ? updated : t));
    } catch {}
  }

  async function handleDeleteTask(id: string) {
    try {
      await apiFetch(`/tasks/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  }

  const activeTodoCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <>
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ paddingBottom: activeEntry ? 52 : 0 }}
      >
        {/* Page header */}
        <div className="flex-shrink-0 px-6 md:px-10 pt-7 pb-0">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-baseline gap-2.5">
              <h1
                className="text-[22px] font-semibold tracking-[-0.03em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
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

          {/* Filter bar */}
          <div
            className="flex items-center gap-2 pb-3.5 border-b flex-wrap"
            style={{ borderColor: "var(--border)" }}
          >
            {/* Status filter */}
            <div className="flex gap-1">
              {(["all", "done"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="text-[10px] tracking-[0.05em] px-3 py-1 rounded-full border transition-colors"
                  style={{
                    borderColor: filter === f ? "rgba(255,255,255,0.22)" : "var(--border)",
                    color: filter === f ? "var(--text-primary)" : "var(--text-secondary)",
                    background: filter === f ? "var(--surface-2)" : "transparent",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {f === "all" ? "All" : "Done"}
                </button>
              ))}
            </div>

            <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />

            {/* Sort */}
            <span
              className="text-[10px] tracking-[0.06em] uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              Sort:
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-transparent border-none outline-none text-[10px] tracking-[0.04em]"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
            >
              <option value="due">Due date</option>
              <option value="priority">Priority</option>
              <option value="created">Created</option>
            </select>
          </div>
        </div>

        {/* Scroll area */}
        <div
          className="flex-1 overflow-y-auto px-6 md:px-10 pb-8"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
        >
          {/* Table header */}
          <div
            className="flex items-center py-2.5 mt-1 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="w-9 shrink-0" />
            <div
              className="flex-1 text-[9px] tracking-[0.1em] uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              Title
            </div>
            <div
              className="hidden sm:block w-[100px] shrink-0 text-[9px] tracking-[0.1em] uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              Priority
            </div>
            <div
              className="hidden md:block w-[76px] shrink-0 text-[9px] tracking-[0.1em] uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              Due
            </div>
            <div
              className="hidden md:block w-[50px] shrink-0 text-[9px] tracking-[0.1em] uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              Est
            </div>
            <div className="w-[116px] shrink-0" />
          </div>

          {/* Inline add row — always at top */}
          <div
            className="flex items-center border-b min-h-[46px]"
            style={{
              borderColor: "var(--border)",
              background: addingFocused ? "var(--surface-2)" : "transparent",
            }}
          >
            <div className="w-9 shrink-0 flex items-center justify-center">
              <div
                className="w-3.5 h-3.5 border rounded-[3px]"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <input
              ref={addInputRef}
              className="flex-1 bg-transparent border-none outline-none text-[12px] tracking-[0.01em] pr-3"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
              placeholder="+ Add a task..."
              value={addingTitle}
              onChange={(e) => setAddingTitle(e.target.value)}
              onFocus={() => setAddingFocused(true)}
              onBlur={() => { if (!addingTitle.trim()) setAddingFocused(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAddingTitle(""); setAddingFocused(false); (e.target as HTMLInputElement).blur(); }
              }}
            />
            {addingFocused && (
              <div className="flex items-center gap-1.5 pr-2">
                <button
                  onClick={() => { setAddingTitle(""); setAddingFocused(false); addInputRef.current?.blur(); }}
                  className="text-[10px] px-2.5 py-1 rounded-[5px] border transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="text-[10px] px-2.5 py-1 rounded-[5px] transition-opacity"
                  style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)" }}
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Task rows */}
          {visible.length === 0 ? (
            <div
              className="text-center py-20 text-[12px] tracking-[0.04em]"
              style={{ color: "var(--text-secondary)", opacity: 0.4 }}
            >
              {filter === "done" ? "No completed tasks." : "Inbox zero."}
            </div>
          ) : (
            visible.map((task) => {
              const isRunning = activeEntry?.taskId === task.id;
              const due = fmtDue(task.dueDate);
              const isDone = task.status === "done";

              return (
                <div
                  key={task.id}
                  className="flex items-center border-b min-h-[46px] group cursor-pointer transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    opacity: isDone ? 0.45 : 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  onClick={() => setModal({ open: true, task })}
                >
                  {/* Checkbox */}
                  <div className="w-9 shrink-0 flex items-center justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkDone(task.id); }}
                      className="w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center transition-colors shrink-0"
                      style={{
                        borderColor: isDone ? "rgba(107,187,138,0.35)" : "var(--border-mid)",
                        background: isDone ? "rgba(107,187,138,0.12)" : "transparent",
                      }}
                    >
                      {isDone && (
                        <span style={{ fontSize: 8, color: "rgba(107,187,138,0.9)", lineHeight: 1 }}>✓</span>
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

                  {/* Priority */}
                  <div
                    className="hidden sm:block w-[100px] shrink-0 text-[10px] tracking-[0.04em]"
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
                    className="hidden md:block w-[76px] shrink-0 text-[10px] tracking-[0.03em]"
                    style={{
                      color: due
                        ? due.cls === "overdue"
                          ? "rgba(217,107,107,0.8)"
                          : due.cls === "soon"
                          ? "rgba(217,167,91,0.8)"
                          : "var(--text-secondary)"
                        : "var(--text-secondary)",
                    }}
                  >
                    {due ? due.label : "—"}
                  </div>

                  {/* Est */}
                  <div
                    className="hidden md:block w-[50px] shrink-0 text-[10px] tracking-[0.02em]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {fmtEst(task.estimatedMinutes)}
                  </div>

                  {/* Actions — visible on hover */}
                  <div
                    className="w-[116px] shrink-0 flex items-center gap-1.5 justify-end pr-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartTimer(task.id); }}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-[5px] border tracking-[0.04em] transition-colors"
                      style={
                        isRunning
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
                        if (!isRunning) {
                          (e.currentTarget as HTMLElement).style.borderColor = "rgba(107,187,138,0.35)";
                          (e.currentTarget as HTMLElement).style.color = "rgba(107,187,138,0.85)";
                          (e.currentTarget as HTMLElement).style.background = "rgba(107,187,138,0.06)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isRunning) {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                          (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }
                      }}
                    >
                      {isRunning ? (
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
                    <button
                      onClick={(e) => { e.stopPropagation(); setModal({ open: true, task }); }}
                      className="text-[10px] px-2.5 py-1 rounded-[5px] border tracking-[0.04em] transition-colors"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-mono)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.22)";
                        (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Task modal */}
      <TaskModal
        state={modal}
        onClose={() => setModal({ open: false, task: null })}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      {/* Timer bar */}
      <TimerBar
        activeEntry={activeEntry}
        activeTask={activeTask}
        onStop={handleStopTimer}
      />
    </>
  );
}
