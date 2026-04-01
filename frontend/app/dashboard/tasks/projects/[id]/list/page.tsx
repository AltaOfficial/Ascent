"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────
type Tag = "bug" | "exam" | "feature" | "chore" | "review" | "urgent" | "";
type Priority = "high" | "mid" | "low";
type Status = "Todo" | "In Progress" | "Done" | "Blocked";

type Task = {
  id: number;
  title: string;
  tag: Tag;
  due: string;
  priority: Priority;
  status: Status;
  notes: string;
  est: string;
  done: boolean;
};

type Section = {
  id: number;
  name: string;
  tasks: Task[];
};

// ── Constants ──────────────────────────────────────────────────────────────

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  bug:     { bg: "rgba(217,107,107,0.2)",  color: "rgba(217,107,107,0.9)" },
  exam:    { bg: "rgba(217,107,107,0.2)",  color: "rgba(217,107,107,0.9)" },
  feature: { bg: "rgba(91,141,217,0.2)",   color: "rgba(91,141,217,0.9)" },
  chore:   { bg: "rgba(200,200,210,0.12)", color: "var(--text-mid)" },
  review:  { bg: "rgba(196,127,212,0.2)",  color: "rgba(196,127,212,0.9)" },
  urgent:  { bg: "rgba(217,167,91,0.2)",   color: "rgba(217,167,91,0.9)" },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDue(dateStr: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diff < 0) return { label, cls: "overdue" };
  if (diff <= 3) return { label, cls: "soon" };
  return { label, cls: "" };
}

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

type ActiveTimer = { taskId: number; secId: number; startTs: number };

// ── Main component ─────────────────────────────────────────────────────────
export default function ListPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [topTasks, setTopTasks] = useState<Task[]>([]);
  const [nextSecId, setNextSecId] = useState(1);
  const [nextTaskId, setNextTaskId] = useState(1);
  const [doneMode, setDoneMode] = useState<"keep" | "archive">("keep");
  const [addingIn, setAddingIn] = useState<number | "__top__" | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [modal, setModal] = useState<{ secId: number | "__top__"; taskId: number } | null>(null);

  // timer
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => setElapsed(Date.now() - activeTimer.startTs), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeTimer]);

  // modal fields
  const [mdTitle, setMdTitle] = useState("");
  const [mdStatus, setMdStatus] = useState<Status>("Todo");
  const [mdPriority, setMdPriority] = useState<"Low" | "Mid" | "High">("Mid");
  const [mdDue, setMdDue] = useState("");
  const [mdTag, setMdTag] = useState<Tag>("");
  const [mdEst, setMdEst] = useState("");
  const [mdNotes, setMdNotes] = useState("");

  function getTaskList(secId: number | "__top__"): Task[] {
    if (secId === "__top__") return topTasks;
    return sections.find(s => s.id === secId)?.tasks ?? [];
  }

  const getTask = useCallback((secId: number | "__top__", taskId: number) =>
    getTaskList(secId).find(t => t.id === taskId) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sections, topTasks]);

  function startTimer(secId: number, taskId: number) {
    if (activeTimer?.taskId === taskId) { setActiveTimer(null); return; }
    setActiveTimer({ taskId, secId, startTs: Date.now() });
  }

  function toggleDone(secId: number | "__top__", taskId: number) {
    if (secId === "__top__") {
      if (doneMode === "archive") setTopTasks(ts => ts.filter(t => t.id !== taskId));
      else setTopTasks(ts => ts.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
    } else {
      setSections(ss => ss.map(s => {
        if (s.id !== secId) return s;
        if (doneMode === "archive") return { ...s, tasks: s.tasks.filter(t => t.id !== taskId) };
        return { ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) };
      }));
    }
  }

  function openModal(secId: number | "__top__", taskId: number) {
    const task = getTask(secId, taskId);
    if (!task) return;
    setMdTitle(task.title); setMdStatus(task.status);
    setMdPriority(task.priority === "high" ? "High" : task.priority === "low" ? "Low" : "Mid");
    setMdDue(task.due); setMdTag(task.tag); setMdEst(task.est); setMdNotes(task.notes);
    setModal({ secId, taskId });
  }

  function saveTask() {
    if (!modal) return;
    const updater = (t: Task) => t.id !== modal.taskId ? t : {
      ...t, title: mdTitle.trim() || t.title, status: mdStatus,
      priority: mdPriority === "High" ? "high" : mdPriority === "Low" ? "low" : "mid",
      due: mdDue, tag: mdTag, est: mdEst.trim(), notes: mdNotes,
    } as Task;
    if (modal.secId === "__top__") setTopTasks(ts => ts.map(updater));
    else setSections(ss => ss.map(s => s.id !== modal.secId ? s : { ...s, tasks: s.tasks.map(updater) }));
    setModal(null);
  }

  function deleteModalTask() {
    if (!modal) return;
    if (modal.secId === "__top__") setTopTasks(ts => ts.filter(t => t.id !== modal.taskId));
    else setSections(ss => ss.map(s => s.id !== modal.secId ? s : { ...s, tasks: s.tasks.filter(t => t.id !== modal.taskId) }));
    setModal(null);
  }

  function confirmAdd(secId: number | "__top__") {
    if (!newTaskTitle.trim()) { setAddingIn(null); return; }
    const task: Task = { id: nextTaskId, title: newTaskTitle.trim(), tag: "", due: "", priority: "mid", status: "Todo", notes: "", est: "", done: false };
    if (secId === "__top__") setTopTasks(ts => [...ts, task]);
    else setSections(ss => ss.map(s => s.id !== secId ? s : { ...s, tasks: [...s.tasks, task] }));
    setNextTaskId(n => n + 1);
    setNewTaskTitle(""); setAddingIn(null);
  }

  function addSection() {
    setSections(ss => [...ss, { id: nextSecId, name: "New Section", tasks: [] }]);
    setNextSecId(n => n + 1);
  }

  function deleteSection(secId: number) {
    setSections(ss => ss.filter(s => s.id !== secId));
  }

  function renameSection(secId: number, name: string) {
    setSections(ss => ss.map(s => s.id !== secId ? s : { ...s, name }));
  }

  const timerTask = activeTimer ? getTask(activeTimer.secId, activeTimer.taskId) : null;
  const timerSec = activeTimer ? sections.find(s => s.id === activeTimer.secId) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 px-14 pt-8">
        <div
          className="flex items-center gap-3 mb-5 text-[26px] font-semibold tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#6b9ed9" }} />
          Programming
        </div>
        {/* Divider + view switcher */}
        <div className="flex items-center gap-1 mb-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <Link
            href="/dashboard/tasks/projects/1"
            className="text-[10px] tracking-[0.04em] px-2.5 py-1.5 rounded-t border-b-2 transition-colors"
            style={{ color: "var(--text-secondary)", borderColor: "transparent", fontFamily: "var(--font-mono)" }}
          >
            Board
          </Link>
          <Link
            href="/dashboard/tasks/projects/1/list"
            className="text-[10px] tracking-[0.04em] px-2.5 py-1.5 rounded-t border-b-2 transition-colors"
            style={{ color: "var(--text-primary)", borderColor: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
          >
            List
          </Link>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: "0 56px 80px", scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
      >
        {/* Done mode toggle */}
        <div className="flex items-center gap-2 pt-4 pb-3.5">
          <span className="text-[10px] tracking-[0.04em]" style={{ color: "var(--text-secondary)" }}>When done:</span>
          <div className="flex border rounded-[5px] overflow-hidden" style={{ borderColor: "var(--border)" }}>
            {(["keep", "archive"] as const).map(m => (
              <button
                key={m}
                onClick={() => setDoneMode(m)}
                className="text-[10px] tracking-[0.04em] px-2.5 py-1 whitespace-nowrap transition-colors"
                style={{
                  background: doneMode === m ? "var(--surface-raised)" : "transparent",
                  color: doneMode === m ? "var(--text-primary)" : "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {m === "keep" ? "Keep with checkmark" : "Archive"}
              </button>
            ))}
          </div>
        </div>

        {/* Top-level add */}
        <div className="py-4">
          <button
            onClick={() => { setAddingIn("__top__"); setNewTaskTitle(""); }}
            className="inline-flex items-center gap-1.75 bg-transparent border-none text-[12px] tracking-[0.02em] py-1 cursor-pointer transition-colors"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-mid)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            <span className="text-[15px] leading-none">+</span> New Task
          </button>
        </div>

        {/* Top tasks */}
        {(topTasks.length > 0 || addingIn === "__top__") && (
          <div>
            {topTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                secId="__top__"
                activeTimer={activeTimer}
                elapsed={elapsed}
                onToggle={() => toggleDone("__top__", task.id)}
                onEdit={() => openModal("__top__", task.id)}
                onStart={() => startTimer(0, task.id)}
                onClick={() => openModal("__top__", task.id)}
              />
            ))}
            {addingIn === "__top__" && (
              <InlineAdd
                value={newTaskTitle}
                onChange={setNewTaskTitle}
                onConfirm={() => confirmAdd("__top__")}
                onCancel={() => { setAddingIn(null); setNewTaskTitle(""); }}
              />
            )}
          </div>
        )}
        {addingIn === "__top__" && topTasks.length === 0 && (
          <InlineAdd
            value={newTaskTitle}
            onChange={setNewTaskTitle}
            onConfirm={() => confirmAdd("__top__")}
            onCancel={() => { setAddingIn(null); setNewTaskTitle(""); }}
          />
        )}

        {/* Sections */}
        {sections.map(sec => (
          <div key={sec.id} className="mt-10">
            {/* Section header */}
            <div
              className="flex items-center gap-3.5 pb-2.5 border-b mb-0"
              style={{ borderColor: "var(--border)" }}
            >
              <input
                value={sec.name}
                onChange={e => renameSection(sec.id, e.target.value)}
                onClick={e => e.stopPropagation()}
                className="flex-1 bg-transparent border-none outline-none text-[14px] font-semibold tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              />
              <span className="text-[11px] shrink-0" style={{ color: "var(--text-secondary)" }}>{sec.tasks.length}</span>
              <button
                onClick={() => deleteSection(sec.id)}
                className="text-[12px] px-1.25 py-0.5 rounded-[4px] opacity-0 transition-opacity border-none bg-transparent cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.color = "rgba(217,107,107,0.8)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
              >
                ×
              </button>
            </div>

            {/* Tasks */}
            {sec.tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                secId={sec.id}
                activeTimer={activeTimer}
                elapsed={elapsed}
                onToggle={() => toggleDone(sec.id, task.id)}
                onEdit={() => openModal(sec.id, task.id)}
                onStart={() => startTimer(sec.id, task.id)}
                onClick={() => openModal(sec.id, task.id)}
              />
            ))}

            {/* Inline add for section */}
            {addingIn === sec.id && (
              <InlineAdd
                value={newTaskTitle}
                onChange={setNewTaskTitle}
                onConfirm={() => confirmAdd(sec.id)}
                onCancel={() => { setAddingIn(null); setNewTaskTitle(""); }}
              />
            )}

            {/* Add task button */}
            <button
              onClick={() => { setAddingIn(sec.id); setNewTaskTitle(""); }}
              className="inline-flex items-center gap-1.75 bg-transparent border-none text-[12px] tracking-[0.02em] py-1.5 mt-1.5 cursor-pointer transition-colors"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-mid)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              <span className="text-[15px] leading-none">+</span> New Task
            </button>
          </div>
        ))}

        {/* New section */}
        <div className="text-center mt-12">
          <button
            onClick={addSection}
            className="inline-flex items-center gap-1.75 bg-transparent border-none text-[12px] tracking-[0.03em] py-1.5 px-3 rounded-[6px] cursor-pointer transition-colors"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-mid)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            + New Section
          </button>
        </div>
      </div>

      {/* Timer bar */}
      {activeTimer && timerTask && (
        <div
          className="shrink-0 flex items-center justify-between px-7 py-2.75 border-t z-50"
          style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "rgba(107,187,138,0.8)" }} />
            <div>
              <div className="text-[12px] tracking-[0.01em] max-w-[320px] truncate" style={{ color: "var(--text-primary)" }}>{timerTask.title}</div>
              <div className="text-[11px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>{timerSec?.name ?? ""}</div>
            </div>
          </div>
          <div
            className="text-[18px] font-semibold tracking-[0.02em] min-w-[60px] text-center"
            style={{ fontFamily: "var(--font-display)", color: "rgba(107,187,138,0.9)" }}
          >
            {fmtElapsed(elapsed)}
          </div>
          <div className="flex items-center gap-2">
            {timerTask.est && <span className="text-[11px] tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>Est: {timerTask.est}</span>}
            <button
              onClick={() => setActiveTimer(null)}
              className="text-[10px] tracking-[0.04em] px-3.5 py-1.25 rounded-[6px] border transition-colors"
              style={{ borderColor: "rgba(217,107,107,0.25)", color: "rgba(217,107,107,0.7)", fontFamily: "var(--font-mono)", background: "none", cursor: "pointer" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(217,107,107,0.5)"; (e.currentTarget as HTMLElement).style.color = "rgba(217,107,107,0.95)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(217,107,107,0.25)"; (e.currentTarget as HTMLElement).style.color = "rgba(217,107,107,0.7)"; }}
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Task modal */}
      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.72)" }}
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-[12px] border"
            style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-5.5 pt-5">
              <input
                value={mdTitle}
                onChange={e => setMdTitle(e.target.value)}
                placeholder="Task title"
                className="flex-1 bg-transparent border-none outline-none text-[16px] font-semibold tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              />
              <button
                onClick={() => setModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[5px] text-[18px] shrink-0 ml-2 transition-colors border-none bg-transparent cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 px-5.5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              {[
                { label: "Status", el: <select value={mdStatus} onChange={e => setMdStatus(e.target.value as Status)} className="w-full rounded-[6px] border px-2.5 py-1.5 text-[11px] outline-none" style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{["Todo","In Progress","Done","Blocked"].map(s => <option key={s}>{s}</option>)}</select> },
                { label: "Priority", el: <select value={mdPriority} onChange={e => setMdPriority(e.target.value as "Low"|"Mid"|"High")} className="w-full rounded-[6px] border px-2.5 py-1.5 text-[11px] outline-none" style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{["Low","Mid","High"].map(p => <option key={p}>{p}</option>)}</select> },
                { label: "Due date", el: <input type="date" value={mdDue} onChange={e => setMdDue(e.target.value)} className="w-full rounded-[6px] border px-2.5 py-1.5 text-[11px] outline-none" style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }} /> },
                { label: "Tag", el: <select value={mdTag} onChange={e => setMdTag(e.target.value as Tag)} className="w-full rounded-[6px] border px-2.5 py-1.5 text-[11px] outline-none" style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}><option value="">None</option>{["bug","exam","feature","chore","review","urgent"].map(t => <option key={t} value={t}>{t}</option>)}</select> },
              ].map(({ label, el }) => (
                <div key={label}>
                  <label className="block text-[9px] tracking-[0.08em] uppercase mb-1.25" style={{ color: "var(--text-secondary)" }}>{label}</label>
                  {el}
                </div>
              ))}
              <div style={{ gridColumn: "1/-1" }}>
                <label className="block text-[9px] tracking-[0.08em] uppercase mb-1.25" style={{ color: "var(--text-secondary)" }}>Estimated time</label>
                <input
                  value={mdEst}
                  onChange={e => setMdEst(e.target.value)}
                  placeholder="e.g. 45m, 1h 30m"
                  className="w-full rounded-[6px] border px-2.5 py-1.5 text-[11px] outline-none"
                  style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                />
              </div>
            </div>

            <div className="px-5.5 py-4">
              <div className="text-[9px] tracking-[0.08em] uppercase mb-2" style={{ color: "var(--text-secondary)" }}>Notes</div>
              <textarea
                value={mdNotes}
                onChange={e => setMdNotes(e.target.value)}
                placeholder="Add notes, context, links..."
                rows={4}
                className="w-full rounded-[7px] border px-3 py-2.5 text-[12px] outline-none resize-y leading-relaxed"
                style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", minHeight: 80 }}
              />
            </div>

            <div className="flex items-center justify-between px-5.5 pb-4.5 pt-0 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={deleteModalTask}
                className="text-[11px] tracking-[0.03em] transition-colors border-none bg-transparent cursor-pointer"
                style={{ color: "rgba(217,107,107,0.6)", fontFamily: "var(--font-mono)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(217,107,107,0.9)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(217,107,107,0.6)")}
              >
                Delete task
              </button>
              <button
                onClick={saveTask}
                className="px-5 py-1.75 text-[11px] font-medium rounded-[7px] transition-opacity hover:opacity-80 border-none cursor-pointer"
                style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────
function TaskRow({
  task, secId, activeTimer, elapsed,
  onToggle, onEdit, onStart, onClick,
}: {
  task: Task;
  secId: number | "__top__";
  activeTimer: ActiveTimer | null;
  elapsed: number;
  onToggle: () => void;
  onEdit: () => void;
  onStart: () => void;
  onClick: () => void;
}) {
  const isRunning = activeTimer?.taskId === task.id;
  const due = fmtDue(task.due);

  return (
    <div
      className="flex items-start border-b min-h-[46px] cursor-pointer transition-colors group/row"
      style={{ borderColor: "var(--border)", opacity: task.done ? 0.45 : 1 }}
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Checkbox */}
      <div className="w-9 shrink-0 flex items-center justify-center pt-3.5 pr-1">
        <div
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center cursor-pointer transition-colors"
          style={{
            borderColor: task.done ? "rgba(107,187,138,0.35)" : "var(--border-mid)",
            background: task.done ? "rgba(107,187,138,0.12)" : "transparent",
          }}
        >
          {task.done && <span style={{ fontSize: 9, color: "rgba(107,187,138,0.9)" }}>✓</span>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {task.tag && (
              <span
                className="inline-flex items-center text-[9px] tracking-[0.06em] uppercase px-1.75 py-0.5 rounded-[3px] mr-1.75 font-medium align-middle"
                style={{ background: TAG_STYLES[task.tag]?.bg, color: TAG_STYLES[task.tag]?.color }}
              >
                {task.tag}
              </span>
            )}
            <span
              className="text-[12px] tracking-[0.01em] leading-[1.5] inline align-middle"
              style={{ color: "var(--text-primary)", textDecoration: task.done ? "line-through" : "none" }}
            >
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-1.75 shrink-0 pt-0.5">
            {task.priority === "high" && (
              <span className="text-[10px] tracking-[0.04em]" style={{ color: "rgba(217,107,107,0.75)" }}>High</span>
            )}
            {due && (
              <span
                className="text-[10px] tracking-[0.03em] px-2 py-0.5 rounded-[3px] border flex items-center gap-1 whitespace-nowrap"
                style={{
                  background: due.cls === "overdue" ? "rgba(217,107,107,0.08)" : due.cls === "soon" ? "rgba(217,167,91,0.08)" : "var(--surface-raised)",
                  borderColor: due.cls === "overdue" ? "rgba(217,107,107,0.15)" : due.cls === "soon" ? "rgba(217,167,91,0.15)" : "var(--border)",
                  color: due.cls === "overdue" ? "rgba(217,107,107,0.8)" : due.cls === "soon" ? "rgba(217,167,91,0.8)" : "var(--text-secondary)",
                }}
              >
                {due.label}
              </span>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-1.25 min-h-6">
          <div className="flex items-center gap-2.25">
            {task.notes && <span className="text-[11px] opacity-40" style={{ color: "var(--text-secondary)" }}>☰</span>}
            {task.est && <span className="text-[10px] opacity-50 tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>◈ {task.est}</span>}
            {isRunning && <span className="text-[10px] tracking-[0.05em]" style={{ color: "rgba(107,187,138,0.8)", fontFamily: "var(--font-mono)" }}>{fmtElapsed(elapsed)}</span>}
          </div>
          <div
            className="flex items-center gap-1.25 opacity-0 group-hover/row:opacity-100 transition-opacity"
            style={{ ...(isRunning ? { opacity: 1 } : {}) }}
          >
            <button
              onClick={e => { e.stopPropagation(); onStart(); }}
              className="flex items-center gap-1 text-[10px] tracking-[0.04em] px-2.5 py-1 rounded-[5px] border whitespace-nowrap transition-all"
              style={{
                fontFamily: "var(--font-mono)",
                background: isRunning ? "rgba(107,187,138,0.07)" : "none",
                borderColor: isRunning ? "rgba(107,187,138,0.4)" : "var(--border)",
                color: isRunning ? "rgba(107,187,138,0.9)" : "var(--text-secondary)",
              }}
            >
              {isRunning
                ? <><span className="w-1.25 h-1.25 rounded-full inline-block mr-0.5" style={{ background: "rgba(107,187,138,0.8)" }} />Running</>
                : "▶ Start"}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="text-[10px] tracking-[0.04em] px-2.5 py-1 rounded-[5px] border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", background: "none", cursor: "pointer" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InlineAdd({ value, onChange, onConfirm, onCancel }: {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="flex items-center border-b min-h-11 py-1"
      style={{ borderColor: "var(--border-mid)", background: "var(--surface)" }}
    >
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onConfirm(); if (e.key === "Escape") onCancel(); }}
        placeholder="Task name..."
        className="flex-1 bg-transparent border-none outline-none text-[12px] tracking-[0.01em] ml-9"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
      />
      <div className="flex gap-1.5 pr-0.5">
        <button
          onClick={onCancel}
          className="text-[10px] px-2.5 py-1 rounded-[5px] border transition-colors"
          style={{ color: "var(--text-secondary)", borderColor: "var(--border)", fontFamily: "var(--font-mono)", background: "none", cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="text-[10px] px-2.5 py-1 rounded-[5px] transition-opacity hover:opacity-80"
          style={{ background: "var(--text-primary)", color: "var(--bg)", border: "none", fontFamily: "var(--font-mono)", cursor: "pointer" }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
