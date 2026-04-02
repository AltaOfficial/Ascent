"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useTimerStore } from "@/lib/timerStore";
import { TaskModal, type TaskModalState, type ProjectTag } from "@/components/dashboard/TaskModal";
import { TimerBar } from "@/components/dashboard/TimerBar";
import { type Task } from "@/components/dashboard/TaskRow";

type Project = { id: string; name: string; color: string | null };
type Section = { id: string; name: string; order: number; projectId: string };

function fmtDue(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  let label: string;
  if (diff < 0) label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  else if (diff === 0) label = "Today";
  else if (diff === 1) label = "Tomorrow";
  else if (diff <= 6) label = d.toLocaleDateString("en-US", { weekday: "long" });
  else label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diff < 0) return { label, cls: "overdue" };
  if (diff === 0) return { label, cls: "today" };
  if (diff === 1) return { label, cls: "tomorrow" };
  if (diff <= 6) return { label, cls: "week" };
  return { label, cls: "future" };
}

function dueStyle(cls: string) {
  if (cls === "overdue") return { background: "rgba(217,107,107,0.08)", borderColor: "rgba(217,107,107,0.2)", color: "rgba(217,107,107,0.85)" };
  if (cls === "today") return { background: "rgba(107,187,138,0.08)", borderColor: "rgba(107,187,138,0.2)", color: "rgba(107,187,138,0.9)" };
  if (cls === "tomorrow") return { background: "rgba(230,180,70,0.08)", borderColor: "rgba(230,180,70,0.2)", color: "rgba(230,180,70,0.9)" };
  if (cls === "week") return { background: "rgba(147,107,200,0.08)", borderColor: "rgba(147,107,200,0.2)", color: "rgba(147,107,200,0.85)" };
  return { background: "var(--surface-raised)", borderColor: "var(--border)", color: "rgba(150,150,160,0.7)" };
}

function fmtMinutes(m: number | null | undefined) {
  if (!m) return null;
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

export default function KanbanPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectTags, setProjectTags] = useState<ProjectTag[]>([]);
  const [addingInSection, setAddingInSection] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [modal, setModal] = useState<TaskModalState>({ open: false, task: null });
  const [drag, setDrag] = useState<{ taskId: string; fromSectionId: string } | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);

  // Add/manage sections
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const newSectionInputRef = useRef<HTMLInputElement>(null);
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Manage tags
  const [managingTags, setManagingTags] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6b7280");

  const { activeEntry, activeTask, setActive, clear } = useTimerStore();

  async function handleStopTimer() {
    const { activeEntry: current } = useTimerStore.getState();
    if (!current) return;
    try {
      await apiFetch("/time-entries/stop", { method: "POST", body: JSON.stringify({ timeEntryId: current.id }) });
    } catch {}
    clear();
  }

  useEffect(() => {
    Promise.all([
      apiFetch<Project>(`/projects/${projectId}`),
      apiFetch<Section[]>(`/projects/${projectId}/sections`),
      apiFetch<Task[]>("/tasks/list", { method: "POST", body: JSON.stringify({ projectId }) }),
      apiFetch<ProjectTag[]>(`/projects/${projectId}/tags`),
    ])
      .then(([proj, secs, taskList, tags]) => {
        setProject(proj);
        setSections(secs.sort((a, b) => a.order - b.order));
        setTasks(taskList);
        setProjectTags(tags);
      })
      .catch(() => {});
  }, [projectId]);

  async function handleAddTask(sectionId: string) {
    if (!newTaskTitle.trim()) { setAddingInSection(null); return; }
    try {
      const created = await apiFetch<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify({ title: newTaskTitle.trim(), projectId, sectionId }),
      });
      setTasks(prev => [...prev, created]);
    } catch {}
    setNewTaskTitle("");
    setAddingInSection(null);
  }

  async function handleDrop(toSectionId: string) {
    setDragOverSection(null);
    if (!drag || drag.fromSectionId === toSectionId) { setDrag(null); return; }
    const taskId = drag.taskId;
    setDrag(null);
    try {
      const updated = await apiFetch<Task>(`/tasks/${taskId}/update`, {
        method: "POST",
        body: JSON.stringify({ sectionId: toSectionId }),
      });
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    } catch {}
  }

  async function handleSaveTask(id: string, updates: Partial<Task>) {
    try {
      const updated = await apiFetch<Task>(`/tasks/${id}/update`, { method: "POST", body: JSON.stringify(updates) });
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
    } catch {}
  }

  async function handleDeleteTask(id: string) {
    try {
      await apiFetch(`/tasks/${id}/delete`, { method: "POST" });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch {}
  }

  async function handleToggleDone(taskId: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      const updated = await apiFetch<Task>(`/tasks/${taskId}/update`, { method: "POST", body: JSON.stringify({ status: newStatus }) });
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    } catch {}
  }

  async function handleStartTimer(taskId: string) {
    const { activeEntry: current } = useTimerStore.getState();
    if (current) {
      try { await apiFetch("/time-entries/stop", { method: "POST", body: JSON.stringify({ timeEntryId: current.id }) }); } catch {}
    }
    if (current?.taskId === taskId) { clear(); return; }
    try {
      const entry = await apiFetch<{ id: string; taskId: string; startedAt: string }>(
        "/time-entries/start", { method: "POST", body: JSON.stringify({ taskId }) },
      );
      const task = tasks.find(t => t.id === taskId);
      setActive(entry, { id: taskId, title: task?.title ?? "", estimatedMinutes: task?.estimatedMinutes ?? null });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "in_progress" } : t));
    } catch {}
  }

  async function handleAddSection() {
    if (!newSectionName.trim()) { setAddingSection(false); return; }
    try {
      const created = await apiFetch<Section>(`/projects/${projectId}/sections`, {
        method: "POST",
        body: JSON.stringify({ name: newSectionName.trim(), order: sections.length }),
      });
      setSections(prev => [...prev, created]);
    } catch {}
    setNewSectionName("");
    setAddingSection(false);
  }

  async function handleDeleteSection(sectionId: string) {
    try {
      await apiFetch(`/projects/${projectId}/sections/${sectionId}/delete`, { method: "POST" });
      setSections(prev => prev.filter(s => s.id !== sectionId));
    } catch {}
  }

  function startRenaming(section: Section) {
    setRenamingSectionId(section.id);
    setRenamingValue(section.name);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  async function commitRename(sectionId: string) {
    if (!renamingValue.trim()) { setRenamingSectionId(null); return; }
    try {
      const updated = await apiFetch<Section>(`/projects/${projectId}/sections/${sectionId}/update`, {
        method: "POST",
        body: JSON.stringify({ name: renamingValue.trim() }),
      });
      setSections(prev => prev.map(s => s.id === sectionId ? updated : s));
    } catch {}
    setRenamingSectionId(null);
  }

  async function handleAddTag() {
    if (!newTagName.trim()) return;
    try {
      const created = await apiFetch<ProjectTag>(`/projects/${projectId}/tags`, {
        method: "POST",
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      setProjectTags(prev => [...prev, created]);
    } catch {}
    setNewTagName("");
    setNewTagColor("#6b7280");
  }

  async function handleDeleteTag(tagId: string) {
    try {
      await apiFetch(`/projects/${projectId}/tags/${tagId}/delete`, { method: "POST" });
      setProjectTags(prev => prev.filter(t => t.id !== tagId));
    } catch {}
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ paddingBottom: activeEntry ? 52 : 0 }}>
      {/* Page header */}
      <div className="shrink-0 px-8 pt-7 pb-0">
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.03em] mb-2" style={{ color: "var(--text-secondary)" }}>
          <Link href="/dashboard/tasks/projects" className="hover:text-text-mid transition-colors">Projects</Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: "var(--text-mid)" }}>{project?.name ?? "…"}</span>
        </div>
        <div className="flex items-center justify-between mb-6">
          <div
            className="flex items-center gap-3 text-[26px] font-semibold tracking-[-0.03em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: project?.color ?? "var(--border-mid)" }} />
            {project?.name ?? "…"}
          </div>
          {/* Tags button */}
          <button
            onClick={() => setManagingTags(v => !v)}
            className="text-[10px] px-3 py-1.5 rounded-md border tracking-[0.04em] transition-colors"
            style={{
              borderColor: managingTags ? "var(--border-mid)" : "var(--border)",
              color: managingTags ? "var(--text-primary)" : "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
              background: "none",
            }}
          >
            Tags {projectTags.length > 0 ? `(${projectTags.length})` : ""}
          </button>
        </div>

        {/* Tags panel */}
        {managingTags && (
          <div
            className="mb-4 p-3.5 rounded-lg border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {projectTags.length === 0 && (
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>No tags yet</span>
              )}
              {projectTags.map(tag => (
                <div
                  key={tag.id}
                  className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-[4px] group/tag"
                  style={{ background: tag.color + "22", color: tag.color }}
                >
                  <span className="tracking-[0.04em] uppercase font-medium">{tag.name}</span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="opacity-0 group-hover/tag:opacity-70 hover:!opacity-100 transition-opacity text-[11px] leading-none"
                    style={{ color: tag.color, background: "none", border: "none", cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddTag(); }}
                placeholder="Tag name"
                className="flex-1 bg-transparent border rounded-md px-2.5 py-1 text-[11px] outline-none"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
              />
              <div className="relative w-6 h-6 rounded-full shrink-0 cursor-pointer" style={{ background: newTagColor }}>
                <input
                  type="color"
                  value={newTagColor}
                  onChange={e => setNewTagColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Pick color"
                />
              </div>
              <button
                onClick={handleAddTag}
                className="text-[10px] px-3 py-1 rounded-md transition-opacity hover:opacity-80"
                style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)", border: "none", cursor: "pointer" }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* View toggle */}
        <div className="flex items-center justify-between border-b pb-0 gap-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/tasks/projects/${projectId}`}
              className="text-[10px] tracking-[0.04em] px-2.5 py-1.5 rounded-t border-b-2 transition-colors"
              style={{ color: "var(--text-primary)", borderColor: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
            >
              Board
            </Link>
            <Link
              href={`/dashboard/tasks/projects/${projectId}/list`}
              className="text-[10px] tracking-[0.04em] px-2.5 py-1.5 rounded-t border-b-2 transition-colors"
              style={{ color: "var(--text-secondary)", borderColor: "transparent", fontFamily: "var(--font-mono)" }}
            >
              List
            </Link>
          </div>
        </div>
      </div>

      {/* Board */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{ padding: "24px 32px 32px", display: "flex", gap: 12, alignItems: "flex-start" }}
      >
        {sections.length === 0 && !addingSection && (
          <div className="flex flex-col items-center justify-center gap-3 w-full h-40" style={{ color: "var(--text-secondary)" }}>
            <span className="text-[13px] tracking-[0.01em]">No sections yet</span>
            <button
              onClick={() => { setAddingSection(true); setTimeout(() => newSectionInputRef.current?.focus(), 0); }}
              className="text-[11px] px-3.5 py-1.5 rounded-md border tracking-[0.04em] transition-colors"
              style={{ borderColor: "var(--border-mid)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", background: "none" }}
            >
              + Add Section
            </button>
          </div>
        )}

        {sections.map(section => {
          const colTasks = tasks.filter(t => (t as any).sectionId === section.id);
          const isRenaming = renamingSectionId === section.id;
          const isDropTarget = drag !== null && dragOverSection === section.id && drag.fromSectionId !== section.id;

          return (
            <div
              key={section.id}
              style={{ width: 264, flexShrink: 0, display: "flex", flexDirection: "column", maxHeight: "100%" }}
              onDragOver={e => e.preventDefault()}
              onDragEnter={() => setDragOverSection(s => s === section.id ? s : section.id)}
              onDrop={() => handleDrop(section.id)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-2.5 px-0.5 group/header">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      value={renamingValue}
                      onChange={e => setRenamingValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") commitRename(section.id);
                        if (e.key === "Escape") setRenamingSectionId(null);
                      }}
                      onBlur={() => commitRename(section.id)}
                      className="text-[13px] font-semibold tracking-[-0.01em] bg-transparent border-b outline-none flex-1 min-w-0"
                      style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", borderColor: "var(--border-mid)" }}
                    />
                  ) : (
                    <span
                      className="text-[13px] font-semibold tracking-[-0.01em] truncate cursor-text"
                      style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                      onClick={() => startRenaming(section)}
                    >
                      {section.name}
                    </span>
                  )}
                  <span className="text-[11px] shrink-0" style={{ color: "var(--text-secondary)" }}>{colTasks.length}</span>
                </div>
                <button
                  onClick={() => handleDeleteSection(section.id)}
                  className="text-[14px] w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0"
                  style={{ color: "var(--text-secondary)", background: "none", border: "none", lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(217,107,107,0.85)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
                  title="Delete section"
                >×</button>
              </div>

              {/* Tasks list with dashed drop target border */}
              <div
                className="flex flex-col gap-1.5 overflow-y-auto flex-1 pb-1 rounded-lg transition-all"
                style={{
                  scrollbarWidth: "none",
                  ...(isDropTarget ? {
                    outline: "2px dashed var(--border-mid)",
                    outlineOffset: "4px",
                    background: "rgba(255,255,255,0.02)",
                  } : {}),
                }}
              >
                {colTasks.map(task => {
                  const isRunning = activeEntry?.taskId === task.id;
                  const due = fmtDue(task.dueDate ?? null);
                  const isDragging = drag?.taskId === task.id;
                  const tag = projectTags.find(t => t.name === task.categoryTag);

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => {
                        // Let the browser capture the drag image before hiding the element
                        const el = e.currentTarget as HTMLElement;
                        setTimeout(() => { el.style.opacity = "0"; }, 0);
                        setDrag({ taskId: task.id, fromSectionId: section.id });
                      }}
                      onDragEnd={e => {
                        (e.currentTarget as HTMLElement).style.opacity = "";
                        setDrag(null);
                        setDragOverSection(null);
                      }}
                      onClick={() => !isDragging && setModal({ open: true, task })}
                      className="rounded-[8px] border px-3 py-3 cursor-pointer transition-all group/card"
                      style={{
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                        opacity: task.status === "done" ? 0.55 : 1,
                      }}
                      onMouseEnter={e => {
                        if (!isDragging) {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-mid)";
                          (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
                        }
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                      }}
                    >
                      {/* Top row */}
                      <div className="flex items-start gap-2">
                        {/* Done checkbox */}
                        <div
                          onClick={e => { e.stopPropagation(); handleToggleDone(task.id); }}
                          className="w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center cursor-pointer shrink-0 mt-0.5 transition-colors"
                          style={{
                            borderColor: task.status === "done" ? "rgba(107,187,138,0.35)" : "var(--border-mid)",
                            background: task.status === "done" ? "rgba(107,187,138,0.12)" : "transparent",
                          }}
                        >
                          {task.status === "done" && (
                            <span style={{ fontSize: 9, color: "rgba(107,187,138,0.9)" }}>✓</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {task.categoryTag && (
                            <div
                              className="inline-flex items-center text-[9px] tracking-[0.06em] uppercase px-2 py-0.5 rounded-[3px] mb-1.5 font-medium"
                              style={{
                                background: tag ? tag.color + "22" : "rgba(200,200,210,0.1)",
                                color: tag ? tag.color : "var(--text-mid)",
                              }}
                            >
                              {task.categoryTag}
                            </div>
                          )}
                          <div
                            className="text-[12px] tracking-[0.01em] leading-snug break-words"
                            style={{
                              color: "var(--text-primary)",
                              textDecoration: task.status === "done" ? "line-through" : "none",
                              opacity: task.status === "done" ? 0.4 : 1,
                            }}
                          >
                            {task.title}
                          </div>
                          {task.status !== "done" && (task.description || task.estimatedMinutes) && (
                            <div className="flex items-center gap-2.5 mt-1.5">
                              {task.description && (
                                <span className="text-[16px] leading-none opacity-30" style={{ color: "var(--text-secondary)" }}>≡</span>
                              )}
                              {fmtMinutes(task.estimatedMinutes) && (
                                <span className="text-[11px] opacity-45 flex items-center gap-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                                  ⏱ {fmtMinutes(task.estimatedMinutes)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-start gap-1 shrink-0 ml-1 pt-0.5">
                          {task.priority === "high" && (
                            <span className="text-[10px] tracking-[0.04em]" style={{ color: "rgba(217,107,107,0.7)" }}>High</span>
                          )}
                          {task.status !== "done" && due && (
                            <span
                              className="text-[10px] tracking-[0.03em] px-2 py-0.5 rounded-[3px] border"
                              style={dueStyle(due.cls)}
                            >
                              {due.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      {task.status !== "done" && <div
                        className="flex items-center justify-end mt-2 opacity-0 group-hover/card:opacity-100 transition-opacity"
                        style={{ ...(isRunning ? { opacity: 1 } : {}) }}
                      >
                        <button
                          onClick={e => { e.stopPropagation(); handleStartTimer(task.id); }}
                          className="flex items-center gap-1 text-[10px] tracking-[0.04em] px-2 py-0.5 rounded-[4px] border transition-all"
                          style={{
                            fontFamily: "var(--font-mono)",
                            background: isRunning ? "rgba(107,187,138,0.08)" : "none",
                            borderColor: isRunning ? "rgba(107,187,138,0.45)" : "var(--border)",
                            color: isRunning ? "rgba(107,187,138,0.9)" : "var(--text-secondary)",
                          }}
                        >
                          {isRunning ? "● Running" : "▶ Start"}
                        </button>
                      </div>}
                    </div>
                  );
                })}

                {/* Inline add */}
                {addingInSection === section.id && (
                  <div className="rounded-[8px] border px-3 py-2.5" style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}>
                    <input
                      autoFocus
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleAddTask(section.id);
                        if (e.key === "Escape") { setAddingInSection(null); setNewTaskTitle(""); }
                      }}
                      placeholder="Task name..."
                      className="w-full bg-transparent border-none outline-none text-[12px] tracking-[0.01em]"
                      style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    />
                    <div className="flex justify-end gap-1.5 mt-2">
                      <button
                        onClick={() => { setAddingInSection(null); setNewTaskTitle(""); }}
                        className="text-[10px] px-2.5 py-1 rounded-[5px] border"
                        style={{ color: "var(--text-secondary)", borderColor: "var(--border)", fontFamily: "var(--font-mono)", background: "none" }}
                      >Cancel</button>
                      <button
                        onClick={() => handleAddTask(section.id)}
                        className="text-[10px] px-2.5 py-1 rounded-[5px] hover:opacity-80"
                        style={{ background: "var(--text-primary)", color: "var(--bg)", border: "none", fontFamily: "var(--font-mono)" }}
                      >Add</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add task button */}
              <button
                onClick={() => { setAddingInSection(section.id); setNewTaskTitle(""); }}
                className="flex items-center gap-1.75 text-[12px] tracking-[0.02em] px-0.5 py-2.25 w-full mt-1 rounded-md border-none bg-transparent transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text-mid)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
              >
                <span className="text-[14px] leading-none">+</span> Add Task
              </button>
            </div>
          );
        })}

        {/* Add section */}
        {addingSection ? (
          <div style={{ width: 264, flexShrink: 0 }}>
            <input
              ref={newSectionInputRef}
              value={newSectionName}
              onChange={e => setNewSectionName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleAddSection();
                if (e.key === "Escape") { setAddingSection(false); setNewSectionName(""); }
              }}
              onBlur={() => { if (!newSectionName.trim()) setAddingSection(false); }}
              placeholder="Section name..."
              className="w-full text-[13px] font-semibold tracking-[-0.01em] bg-transparent border-b outline-none px-0.5 pb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", borderColor: "var(--border-mid)" }}
            />
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={handleAddSection}
                className="text-[10px] px-2.5 py-1 rounded-[5px] hover:opacity-80"
                style={{ background: "var(--text-primary)", color: "var(--bg)", border: "none", fontFamily: "var(--font-mono)" }}
              >Add</button>
              <button
                onClick={() => { setAddingSection(false); setNewSectionName(""); }}
                className="text-[10px] px-2.5 py-1 rounded-[5px] border"
                style={{ color: "var(--text-secondary)", borderColor: "var(--border)", fontFamily: "var(--font-mono)", background: "none" }}
              >Cancel</button>
            </div>
          </div>
        ) : sections.length > 0 && (
          <button
            onClick={() => { setAddingSection(true); setTimeout(() => newSectionInputRef.current?.focus(), 0); }}
            className="flex items-center gap-1.5 text-[12px] tracking-[0.02em] h-9 px-3 rounded-lg border shrink-0 transition-colors self-start"
            style={{ color: "var(--text-secondary)", borderColor: "var(--border)", background: "none", fontFamily: "var(--font-mono)" }}
            onMouseEnter={e => { (e.currentTarget.style.color = "var(--text-primary)"); (e.currentTarget.style.borderColor = "var(--border-mid)"); }}
            onMouseLeave={e => { (e.currentTarget.style.color = "var(--text-secondary)"); (e.currentTarget.style.borderColor = "var(--border)"); }}
          >
            + Section
          </button>
        )}
      </div>

      <TaskModal
        state={modal}
        onClose={() => setModal({ open: false, task: null })}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        projectTags={projectTags}
      />

      <TimerBar activeEntry={activeEntry} activeTask={activeTask} onStop={handleStopTimer} />
    </div>
  );
}
