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

type Column = {
  id: number;
  name: string;
  tasks: Task[];
};

// ── Constants ──────────────────────────────────────────────────────────────
const INITIAL_COLUMNS: Column[] = [
  {
    id: 1, name: "ENGR 1182",
    tasks: [
      { id: 1, title: "Do memo 2", tag: "", due: "", priority: "mid", status: "Todo", notes: "", est: "", done: false },
      { id: 2, title: "Finish lab", tag: "", due: "2026-03-22", priority: "high", status: "In Progress", notes: "Friction lab write-up", est: "2h", done: false },
    ],
  },
  {
    id: 2, name: "PHYS 1250",
    tasks: [
      { id: 3, title: "Do HW 4", tag: "", due: "", priority: "mid", status: "Todo", notes: "", est: "45m", done: false },
      { id: 4, title: "Ask to Retake Test", tag: "exam", due: "", priority: "high", status: "Todo", notes: "Email Prof. Chen", est: "", done: false },
      { id: 5, title: "Study Ch. 4", tag: "exam", due: "2026-03-28", priority: "high", status: "In Progress", notes: "Newton's laws + friction", est: "1h 30m", done: false },
    ],
  },
  {
    id: 3, name: "MATH 1151",
    tasks: [
      { id: 6, title: "L'Hôpital's rule practice", tag: "", due: "", priority: "mid", status: "Todo", notes: "", est: "1h", done: false },
      { id: 7, title: "Linear approximation HW", tag: "", due: "2026-03-21", priority: "mid", status: "In Progress", notes: "", est: "30m", done: false },
    ],
  },
];

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

// ── Timer state ────────────────────────────────────────────────────────────
type ActiveTimer = { taskId: number; colId: number; startTs: number };

// ── Main component ─────────────────────────────────────────────────────────
export default function KanbanPage() {
  const [columns, setColumns] = useState<Column[]>(INITIAL_COLUMNS);
  const [nextColId, setNextColId] = useState(4);
  const [nextTaskId, setNextTaskId] = useState(8);
  const [doneMode, setDoneMode] = useState<"keep" | "archive">("keep");
  const [addingInCol, setAddingInCol] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [modal, setModal] = useState<{ colId: number; taskId: number } | null>(null);
  const [drag, setDrag] = useState<{ taskId: number; colId: number } | null>(null);
  const [dragOverCard, setDragOverCard] = useState<number | null>(null);

  // timer
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - activeTimer.startTs);
      }, 1000);
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

  const getTask = useCallback((colId: number, taskId: number) =>
    columns.find(c => c.id === colId)?.tasks.find(t => t.id === taskId) ?? null,
    [columns]);

  function startTimer(taskId: number, colId: number) {
    if (activeTimer?.taskId === taskId) { setActiveTimer(null); return; }
    setActiveTimer({ taskId, colId, startTs: Date.now() });
  }

  function toggleDone(colId: number, taskId: number) {
    setColumns(cols => cols.map(c => {
      if (c.id !== colId) return c;
      if (doneMode === "archive") return { ...c, tasks: c.tasks.filter(t => t.id !== taskId) };
      return { ...c, tasks: c.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) };
    }));
  }

  function openModal(colId: number, taskId: number) {
    const task = getTask(colId, taskId);
    if (!task) return;
    setMdTitle(task.title); setMdStatus(task.status);
    setMdPriority(task.priority === "high" ? "High" : task.priority === "low" ? "Low" : "Mid");
    setMdDue(task.due); setMdTag(task.tag); setMdEst(task.est); setMdNotes(task.notes);
    setModal({ colId, taskId });
  }

  function saveTask() {
    if (!modal) return;
    setColumns(cols => cols.map(c => {
      if (c.id !== modal.colId) return c;
      return {
        ...c, tasks: c.tasks.map(t => {
          if (t.id !== modal.taskId) return t;
          return {
            ...t, title: mdTitle.trim() || t.title, status: mdStatus,
            priority: mdPriority === "High" ? "high" : mdPriority === "Low" ? "low" : "mid",
            due: mdDue, tag: mdTag, est: mdEst.trim(), notes: mdNotes,
          };
        }),
      };
    }));
    setModal(null);
  }

  function deleteTask() {
    if (!modal) return;
    setColumns(cols => cols.map(c =>
      c.id !== modal.colId ? c : { ...c, tasks: c.tasks.filter(t => t.id !== modal.taskId) }
    ));
    setModal(null);
  }

  function confirmAdd(colId: number) {
    if (!newTaskTitle.trim()) { setAddingInCol(null); return; }
    setColumns(cols => cols.map(c =>
      c.id !== colId ? c : {
        ...c, tasks: [...c.tasks, {
          id: nextTaskId, title: newTaskTitle.trim(), tag: "", due: "", priority: "mid",
          status: "Todo", notes: "", est: "", done: false,
        }],
      }
    ));
    setNextTaskId(n => n + 1);
    setNewTaskTitle(""); setAddingInCol(null);
  }

  function addSection() {
    setColumns(cols => [...cols, { id: nextColId, name: "New Section", tasks: [] }]);
    setNextColId(n => n + 1);
  }

  function deleteCol(colId: number) {
    if (columns.length <= 1) return;
    setColumns(cols => cols.filter(c => c.id !== colId));
  }

  function renameCol(colId: number, name: string) {
    setColumns(cols => cols.map(c => c.id === colId ? { ...c, name } : c));
  }

  // Drag & drop
  function onDrop(toColId: number) {
    if (!drag || drag.colId === toColId) return;
    setColumns(cols => {
      const from = cols.find(c => c.id === drag.colId)!;
      const taskIdx = from.tasks.findIndex(t => t.id === drag.taskId);
      if (taskIdx < 0) return cols;
      const task = from.tasks[taskIdx];
      return cols.map(c => {
        if (c.id === drag.colId) return { ...c, tasks: c.tasks.filter(t => t.id !== drag.taskId) };
        if (c.id === toColId) return { ...c, tasks: [...c.tasks, task] };
        return c;
      });
    });
    setDrag(null); setDragOverCard(null);
  }

  const timerTask = activeTimer ? getTask(activeTimer.colId, activeTimer.taskId) : null;
  const timerCol = activeTimer ? columns.find(c => c.id === activeTimer.colId) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 px-8 pt-7 pb-0">
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.03em] mb-2" style={{ color: "var(--text-secondary)" }}>
          <Link href="/dashboard/tasks/projects" className="hover:text-text-mid transition-colors">Projects</Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: "var(--text-mid)" }}>School</span>
        </div>
        <div
          className="flex items-center gap-3 mb-6 text-[26px] font-semibold tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#d96b6b" }} />
          School
        </div>

        {/* View toggle + done mode */}
        <div
          className="flex items-center justify-between border-b pb-0 gap-4"
          style={{ borderColor: "var(--border)" }}
        >
          {/* View switcher */}
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard/tasks/projects/1"
              className="text-[10px] tracking-[0.04em] px-2.5 py-1.5 rounded-t border-b-2 transition-colors"
              style={{ color: "var(--text-primary)", borderColor: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
            >
              Board
            </Link>
            <Link
              href="/dashboard/tasks/projects/1/list"
              className="text-[10px] tracking-[0.04em] px-2.5 py-1.5 rounded-t border-b-2 transition-colors"
              style={{ color: "var(--text-secondary)", borderColor: "transparent", fontFamily: "var(--font-mono)" }}
            >
              List
            </Link>
          </div>
          {/* Done mode */}
          <div className="flex items-center gap-2.5 mb-0.5">
            <span className="text-[10px] tracking-[0.04em] whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>When done:</span>
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
        </div>
      </div>

      {/* Board */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{ padding: "24px 32px 32px", display: "flex", gap: 12, alignItems: "flex-start" }}
      >
        {columns.map(col => (
          <div
            key={col.id}
            style={{ width: 264, flexShrink: 0, display: "flex", flexDirection: "column", maxHeight: "100%" }}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(col.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <div className="flex items-center">
                <input
                  value={col.name}
                  onChange={e => renameCol(col.id, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="bg-transparent border-none outline-none text-[13px] font-semibold tracking-[-0.01em] w-[120px]"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                />
                <span className="text-[11px] ml-2" style={{ color: "var(--text-secondary)" }}>{col.tasks.length}</span>
              </div>
              <button
                onClick={() => deleteCol(col.id)}
                title="Delete section"
                className="text-[14px] px-1 rounded opacity-0 transition-opacity hover:opacity-100"
                style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
              >
                ⋯
              </button>
            </div>

            {/* Tasks */}
            <div
              className="flex flex-col gap-1.5 overflow-y-auto flex-1 pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {col.tasks.map(task => {
                const isRunning = activeTimer?.taskId === task.id;
                const due = fmtDue(task.due);
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDrag({ taskId: task.id, colId: col.id })}
                    onDragEnd={() => { setDrag(null); setDragOverCard(null); }}
                    onDragOver={() => setDragOverCard(task.id)}
                    onClick={() => openModal(col.id, task.id)}
                    className="rounded-[8px] border px-3 py-3 cursor-pointer transition-all group/card"
                    style={{
                      background: task.done ? "var(--surface)" : "var(--surface)",
                      borderColor: dragOverCard === task.id ? "var(--border-hi)" : "var(--border)",
                      opacity: task.done ? 0.55 : 1,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-mid)";
                      (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = dragOverCard === task.id ? "var(--border-hi)" : "var(--border)";
                      (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                    }}
                  >
                    {/* Top row: checkbox + tag + title + due/priority */}
                    <div className="flex items-start">
                      {/* Checkbox */}
                      <div
                        onClick={e => { e.stopPropagation(); toggleDone(col.id, task.id); }}
                        className="w-3.5 h-3.5 border rounded-[3px] shrink-0 flex items-center justify-center mt-0.5 mr-2 cursor-pointer transition-colors"
                        style={{
                          borderColor: task.done ? "rgba(107,187,138,0.35)" : "var(--border-mid)",
                          background: task.done ? "rgba(107,187,138,0.15)" : "transparent",
                        }}
                      >
                        {task.done && <span style={{ fontSize: 9, color: "rgba(107,187,138,0.9)" }}>✓</span>}
                      </div>

                      {/* Title area */}
                      <div className="flex-1 min-w-0">
                        {task.tag && (
                          <div
                            className="inline-flex items-center text-[9px] tracking-[0.06em] uppercase px-2 py-0.5 rounded-[3px] mb-1.75 font-medium"
                            style={{ background: TAG_STYLES[task.tag]?.bg, color: TAG_STYLES[task.tag]?.color }}
                          >
                            {task.tag}
                          </div>
                        )}
                        <div
                          className="text-[12px] tracking-[0.01em] leading-[1.5] break-words"
                          style={{
                            color: "var(--text-primary)",
                            textDecoration: task.done ? "line-through" : "none",
                            opacity: task.done ? 0.4 : 1,
                          }}
                        >
                          {task.title}
                        </div>
                      </div>

                      {/* Right: priority + due */}
                      <div className="flex items-center gap-1.25 shrink-0 ml-2 pt-0.5">
                        {task.priority === "high" && (
                          <span className="text-[10px] tracking-[0.04em]" style={{ color: "rgba(217,107,107,0.7)" }}>High</span>
                        )}
                        {due && (
                          <span
                            className="text-[10px] tracking-[0.03em] px-2 py-0.5 rounded-[3px] border"
                            style={{
                              background: due.cls === "overdue" ? "rgba(217,107,107,0.1)" : due.cls === "soon" ? "rgba(217,167,91,0.1)" : "var(--surface-raised)",
                              borderColor: due.cls === "overdue" ? "rgba(217,107,107,0.2)" : due.cls === "soon" ? "rgba(217,167,91,0.15)" : "var(--border)",
                              color: due.cls === "overdue" ? "rgba(217,107,107,0.8)" : due.cls === "soon" ? "rgba(217,167,91,0.8)" : "var(--text-secondary)",
                            }}
                          >
                            {due.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    {(task.notes || task.est || isRunning) ? (
                      <div className="flex items-center justify-between mt-2 pt-1.75 border-t" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-2">
                          {task.notes && <span className="text-[11px] opacity-40" style={{ color: "var(--text-secondary)" }}>☰</span>}
                          {task.est && <span className="text-[10px] tracking-[0.02em] opacity-50" style={{ color: "var(--text-secondary)" }}>◈ {task.est}</span>}
                          {isRunning && <span className="text-[10px] tracking-[0.05em]" style={{ color: "rgba(107,187,138,0.85)", fontFamily: "var(--font-mono)" }}>{fmtElapsed(elapsed)}</span>}
                        </div>
                        <StartBtn
                          isRunning={isRunning}
                          onClick={e => { e.stopPropagation(); startTimer(task.id, col.id); }}
                        />
                      </div>
                    ) : (
                      <div className="flex justify-end mt-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <StartBtn
                          isRunning={false}
                          onClick={e => { e.stopPropagation(); startTimer(task.id, col.id); }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Inline add */}
              {addingInCol === col.id && (
                <div className="rounded-[8px] border px-3 py-2.5" style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}>
                  <input
                    autoFocus
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") confirmAdd(col.id);
                      if (e.key === "Escape") { setAddingInCol(null); setNewTaskTitle(""); }
                    }}
                    placeholder="Task name..."
                    className="w-full bg-transparent border-none outline-none text-[12px] tracking-[0.01em]"
                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                  />
                  <div className="flex justify-end gap-1.5 mt-2">
                    <button
                      onClick={() => { setAddingInCol(null); setNewTaskTitle(""); }}
                      className="text-[10px] px-2.5 py-1 rounded-[5px] border transition-colors"
                      style={{ color: "var(--text-secondary)", borderColor: "var(--border)", fontFamily: "var(--font-mono)" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => confirmAdd(col.id)}
                      className="text-[10px] px-2.5 py-1 rounded-[5px] transition-opacity hover:opacity-80"
                      style={{ background: "var(--text-primary)", color: "var(--bg)", border: "none", fontFamily: "var(--font-mono)" }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Add task button */}
            <button
              onClick={() => { setAddingInCol(col.id); setNewTaskTitle(""); }}
              className="flex items-center gap-1.75 text-[12px] tracking-[0.02em] px-0.5 py-2.25 w-full mt-1 rounded-[6px] border-none bg-transparent transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-mid)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              <span className="text-[14px] leading-none">+</span> Add Task
            </button>
          </div>
        ))}

        {/* Add Section */}
        <div style={{ width: 264, flexShrink: 0 }}>
          <button
            onClick={addSection}
            className="w-full border rounded-[8px] text-[12px] tracking-[0.02em] px-3.5 py-3.5 flex items-center gap-2 transition-colors"
            style={{
              borderStyle: "dashed", borderColor: "var(--border-mid)",
              color: "var(--text-secondary)", background: "none", fontFamily: "var(--font-mono)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-mid)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          >
            + Add Section
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
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "rgba(107,187,138,0.8)", animation: "pulse 1.2s infinite" }} />
            <div>
              <div className="text-[12px] tracking-[0.01em] max-w-[320px] truncate" style={{ color: "var(--text-primary)" }}>{timerTask.title}</div>
              <div className="text-[11px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>{timerCol?.name}</div>
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
              style={{ borderColor: "rgba(217,107,107,0.25)", color: "rgba(217,107,107,0.7)", fontFamily: "var(--font-mono)", background: "none" }}
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
                className="w-7 h-7 flex items-center justify-center rounded-[5px] text-[18px] shrink-0 ml-2 transition-colors"
                style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
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
                onClick={deleteTask}
                className="text-[11px] tracking-[0.03em] transition-colors border-none bg-none"
                style={{ color: "rgba(217,107,107,0.6)", fontFamily: "var(--font-mono)", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(217,107,107,0.9)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(217,107,107,0.6)")}
              >
                Delete task
              </button>
              <button
                onClick={saveTask}
                className="px-5 py-1.75 text-[11px] font-medium rounded-[7px] transition-opacity hover:opacity-80"
                style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)", border: "none", cursor: "pointer" }}
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

function StartBtn({ isRunning, onClick }: { isRunning: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[10px] tracking-[0.04em] px-2.25 py-0.75 rounded-[4px] border transition-all"
      style={{
        fontFamily: "var(--font-mono)",
        background: isRunning ? "rgba(107,187,138,0.08)" : "none",
        borderColor: isRunning ? "rgba(107,187,138,0.45)" : "var(--border)",
        color: isRunning ? "rgba(107,187,138,0.9)" : "var(--text-secondary)",
      }}
    >
      {isRunning ? "● Running" : "▶ Start"}
    </button>
  );
}
