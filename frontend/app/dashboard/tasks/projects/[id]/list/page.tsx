"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useTimerStore } from "@/lib/timerStore";
import {
  TaskModal,
  type TaskModalState,
  type ProjectTag,
} from "@/components/dashboard/TaskModal";
import { TimerBar } from "@/components/dashboard/TimerBar";
import { type Task } from "@/components/dashboard/TaskRow";

type Project = { id: string; name: string; color: string | null; viewType: string };
type Section = { id: string; name: string; order: number; projectId: string };

function fmtDue(dateStr: string | null) {
  if (!dateStr) return null;
  const [y, mo, dy] = dateStr.slice(0, 10).split("-").map(Number);
  const d = new Date(y, mo - 1, dy);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  let label: string;
  if (diff < 0)
    label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  else if (diff === 0) label = "Today";
  else if (diff === 1) label = "Tomorrow";
  else if (diff <= 6)
    label = d.toLocaleDateString("en-US", { weekday: "long" });
  else
    label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diff < 0) return { label, cls: "overdue" };
  if (diff === 0) return { label, cls: "today" };
  if (diff === 1) return { label, cls: "tomorrow" };
  if (diff <= 6) return { label, cls: "week" };
  return { label, cls: "future" };
}

function dueStyle(cls: string) {
  if (cls === "overdue")
    return {
      background: "rgba(217,107,107,0.08)",
      borderColor: "rgba(217,107,107,0.2)",
      color: "rgba(217,107,107,0.85)",
    };
  if (cls === "today")
    return {
      background: "rgba(107,187,138,0.08)",
      borderColor: "rgba(107,187,138,0.2)",
      color: "rgba(107,187,138,0.9)",
    };
  if (cls === "tomorrow")
    return {
      background: "rgba(230,180,70,0.08)",
      borderColor: "rgba(230,180,70,0.2)",
      color: "rgba(230,180,70,0.9)",
    };
  if (cls === "week")
    return {
      background: "rgba(147,107,200,0.08)",
      borderColor: "rgba(147,107,200,0.2)",
      color: "rgba(147,107,200,0.85)",
    };
  return {
    background: "var(--surface-raised)",
    borderColor: "var(--border)",
    color: "rgba(150,150,160,0.7)",
  };
}

function fmtMinutes(m: number | null | undefined) {
  if (!m) return null;
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

export default function ListPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectTags, setProjectTags] = useState<ProjectTag[]>([]);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [modal, setModal] = useState<TaskModalState>({
    open: false,
    task: null,
  });

  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const newSectionInputRef = useRef<HTMLInputElement>(null);
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(
    null,
  );
  const [renamingValue, setRenamingValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [managingTags, setManagingTags] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6b7280");

  const { activeEntry, activeTask, setActive, clear } = useTimerStore();

  async function handleStopTimer() {
    const { activeEntry: current } = useTimerStore.getState();
    if (!current) return;
    try {
      await apiFetch("/time-entries/stop", {
        method: "POST",
        body: JSON.stringify({ timeEntryId: current.id }),
      });
      const totals = await apiFetch<Record<string, number>>("/time-entries/totals", {
        method: "POST",
        body: JSON.stringify({ taskIds: [current.taskId] }),
      }).catch(() => ({} as Record<string, number>));
      setTasks((prev) =>
        prev.map((t) =>
          t.id === current.taskId ? { ...t, actualMinutes: totals[t.id] ?? t.actualMinutes } : t,
        ),
      );
    } catch {}
    clear();
  }

  useEffect(() => {
    Promise.all([
      apiFetch<Project>(`/projects/${projectId}`),
      apiFetch<Section[]>(`/projects/${projectId}/sections`),
      apiFetch<Task[]>("/tasks/list", {
        method: "POST",
        body: JSON.stringify({ projectId }),
      }),
      apiFetch<ProjectTag[]>(`/projects/${projectId}/tags`),
    ])
      .then(async ([proj, secs, taskList, tags]) => {
        if (proj.viewType === "kanban") {
          router.replace(`/dashboard/tasks/projects/${projectId}`);
          return;
        }
        setProject(proj);
        setSections(secs.sort((a, b) => a.order - b.order));
        setProjectTags(tags);
        const ids = taskList.map((t) => t.id);
        let totals: Record<string, number> = {};
        if (ids.length) {
          totals = await apiFetch<Record<string, number>>("/time-entries/totals", {
            method: "POST",
            body: JSON.stringify({ taskIds: ids }),
          }).catch(() => ({}));
        }
        setTasks(taskList.map((t) => ({ ...t, actualMinutes: totals[t.id] ?? null })));
      })
      .catch(() => {});
  }, [projectId]);

  async function handleAddTask(sectionId: string) {
    if (!newTaskTitle.trim()) {
      setAddingIn(null);
      return;
    }
    try {
      const created = await apiFetch<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          projectId,
          sectionId,
        }),
      });
      setTasks((prev) => [...prev, created]);
    } catch {}
    setNewTaskTitle("");
    setAddingIn(null);
  }

  async function handleSaveTask(id: string, updates: Partial<Task>) {
    try {
      const updated = await apiFetch<Task>(`/tasks/${id}/update`, {
        method: "POST",
        body: JSON.stringify(updates),
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {}
  }

  async function handleDeleteTask(id: string) {
    try {
      await apiFetch(`/tasks/${id}/delete`, { method: "POST" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
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
      setActive(entry, {
        id: taskId,
        title: task?.title ?? "",
        estimatedMinutes: task?.estimatedMinutes ?? null,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "in_progress" } : t,
        ),
      );
    } catch {}
  }

  async function handleToggleDone(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      const updated = await apiFetch<Task>(`/tasks/${taskId}/update`, {
        method: "POST",
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch {}
  }

  async function handleAddTag() {
    if (!newTagName.trim()) return;
    try {
      const created = await apiFetch<ProjectTag>(
        `/projects/${projectId}/tags`,
        {
          method: "POST",
          body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
        },
      );
      setProjectTags((prev) => [...prev, created]);
    } catch {}
    setNewTagName("");
    setNewTagColor("#6b7280");
  }

  async function handleDeleteTag(tagId: string) {
    try {
      await apiFetch(`/projects/${projectId}/tags/${tagId}/delete`, {
        method: "POST",
      });
      setProjectTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch {}
  }

  async function handleAddSection() {
    if (!newSectionName.trim()) {
      setAddingSection(false);
      return;
    }
    try {
      const created = await apiFetch<Section>(
        `/projects/${projectId}/sections`,
        {
          method: "POST",
          body: JSON.stringify({
            name: newSectionName.trim(),
            order: sections.length,
          }),
        },
      );
      setSections((prev) => [...prev, created]);
    } catch {}
    setNewSectionName("");
    setAddingSection(false);
  }

  async function handleDeleteSection(sectionId: string) {
    try {
      await apiFetch(`/projects/${projectId}/sections/${sectionId}/delete`, {
        method: "POST",
      });
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
    } catch {}
  }

  function startRenaming(section: Section) {
    setRenamingSectionId(section.id);
    setRenamingValue(section.name);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  async function commitRename(sectionId: string) {
    if (!renamingValue.trim()) {
      setRenamingSectionId(null);
      return;
    }
    try {
      const updated = await apiFetch<Section>(
        `/projects/${projectId}/sections/${sectionId}/update`,
        {
          method: "POST",
          body: JSON.stringify({ name: renamingValue.trim() }),
        },
      );
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? updated : s)),
      );
    } catch {}
    setRenamingSectionId(null);
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ paddingBottom: activeEntry ? 52 : 0 }}
    >
      {/* Page header */}
      <div className="shrink-0 px-8 pt-7 pb-0">
        <div
          className="flex items-center gap-1.5 text-[11px] tracking-[0.03em] mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          <Link
            href="/dashboard/tasks/projects"
            className="hover:text-text-mid transition-colors"
          >
            Projects
          </Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: "var(--text-mid)" }}>
            {project?.name ?? "…"}
          </span>
        </div>
        <div className="flex items-center justify-between mb-6">
          <div
            className="flex items-center gap-3 text-[26px] font-semibold tracking-[-0.03em]"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: project?.color ?? "var(--border-mid)" }}
            />
            {project?.name ?? "…"}
          </div>
          <button
            onClick={() => setManagingTags((v) => !v)}
            className="text-[10px] px-3 py-1.5 rounded-md border tracking-[0.04em] transition-colors"
            style={{
              borderColor: managingTags ? "var(--border-mid)" : "var(--border)",
              color: managingTags
                ? "var(--text-primary)"
                : "var(--text-secondary)",
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
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {projectTags.length === 0 && (
                <span
                  className="text-[11px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No tags yet
                </span>
              )}
              {projectTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-[4px] group/tag"
                  style={{ background: tag.color + "22", color: tag.color }}
                >
                  <span className="tracking-[0.04em] uppercase font-medium">
                    {tag.name}
                  </span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="opacity-0 group-hover/tag:opacity-70 hover:!opacity-100 transition-opacity text-[11px] leading-none"
                    style={{
                      color: tag.color,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTag();
                }}
                placeholder="Tag name"
                className="flex-1 bg-transparent border rounded-md px-2.5 py-1 text-[11px] outline-none"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                }}
              />
              <div
                className="relative w-6 h-6 rounded-full shrink-0 cursor-pointer"
                style={{ background: newTagColor }}
              >
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Pick color"
                />
              </div>
              <button
                onClick={handleAddTag}
                className="text-[10px] px-3 py-1 rounded-md transition-opacity hover:opacity-80"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg)",
                  fontFamily: "var(--font-mono)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* View switcher */}
        <div
          className="flex items-center gap-1 mb-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Link
            href={`/dashboard/tasks/projects/${projectId}`}
            onClick={() => apiFetch(`/projects/${projectId}/update`, { method: "POST", body: JSON.stringify({ viewType: "kanban" }) }).catch(() => {})}
            className="text-[10px] tracking-[0.04em] px-2.5 py-1.5 rounded-t border-b-2 transition-colors"
            style={{
              color: "var(--text-secondary)",
              borderColor: "transparent",
              fontFamily: "var(--font-mono)",
            }}
          >
            Board
          </Link>
          <Link
            href={`/dashboard/tasks/projects/${projectId}/list`}
            onClick={() => apiFetch(`/projects/${projectId}/update`, { method: "POST", body: JSON.stringify({ viewType: "list" }) }).catch(() => {})}
            className="text-[10px] tracking-[0.04em] px-2.5 py-1.5 rounded-t border-b-2 transition-colors"
            style={{
              color: "var(--text-primary)",
              borderColor: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            List
          </Link>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          padding: "0 56px 80px",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {sections.length === 0 && !addingSection && (
          <div
            className="flex flex-col items-center justify-center gap-3 mt-16"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="text-[13px] tracking-[0.01em]">
              No sections yet
            </span>
            <button
              onClick={() => {
                setAddingSection(true);
                setTimeout(() => newSectionInputRef.current?.focus(), 0);
              }}
              className="text-[11px] px-3.5 py-1.5 rounded-md border tracking-[0.04em] transition-colors"
              style={{
                borderColor: "var(--border-mid)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                background: "none",
              }}
            >
              + Add Section
            </button>
          </div>
        )}

        {sections.map((sec) => {
          const secTasks = tasks.filter((t) => (t as any).sectionId === sec.id);
          const isRenaming = renamingSectionId === sec.id;
          return (
            <div key={sec.id} className="mt-10 first:mt-6">
              {/* Section header */}
              <div
                className="flex items-center gap-3.5 pb-2.5 border-b mb-0 group/secheader"
                style={{ borderColor: "var(--border)" }}
              >
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renamingValue}
                    onChange={(e) => setRenamingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(sec.id);
                      if (e.key === "Escape") setRenamingSectionId(null);
                    }}
                    onBlur={() => commitRename(sec.id)}
                    className="flex-1 text-[14px] font-semibold tracking-[-0.01em] bg-transparent border-b outline-none"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border-mid)",
                    }}
                  />
                ) : (
                  <span
                    className="flex-1 text-[14px] font-semibold tracking-[-0.01em] cursor-text"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--text-primary)",
                    }}
                    onClick={() => startRenaming(sec)}
                  >
                    {sec.name}
                  </span>
                )}
                <span
                  className="text-[11px] shrink-0"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {secTasks.length}
                </span>
                <button
                  onClick={() => handleDeleteSection(sec.id)}
                  className="text-[14px] w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover/secheader:opacity-100 transition-opacity shrink-0"
                  style={{
                    color: "var(--text-secondary)",
                    background: "none",
                    border: "none",
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "rgba(217,107,107,0.85)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-secondary)")
                  }
                  title="Delete section"
                >
                  ×
                </button>
              </div>

              {/* Tasks */}
              {secTasks.map((task) => {
                const isRunning = activeEntry?.taskId === task.id;
                const due = fmtDue(task.dueDate ?? null);
                const tag = projectTags.find(
                  (t) => t.name === task.categoryTag,
                );
                return (
                  <div
                    key={task.id}
                    className="flex items-start border-b min-h-[46px] cursor-pointer transition-colors group/row"
                    style={{
                      borderColor: "var(--border)",
                      opacity: task.status === "done" ? 0.45 : 1,
                    }}
                    onClick={() => setModal({ open: true, task })}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--surface)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Checkbox */}
                    <div className="w-9 shrink-0 flex items-center justify-center pt-3.5 pr-1">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleDone(task.id);
                        }}
                        className="w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center cursor-pointer transition-colors"
                        style={{
                          borderColor:
                            task.status === "done"
                              ? "rgba(107,187,138,0.35)"
                              : "var(--border-mid)",
                          background:
                            task.status === "done"
                              ? "rgba(107,187,138,0.12)"
                              : "transparent",
                        }}
                      >
                        {task.status === "done" && (
                          <span
                            style={{
                              fontSize: 9,
                              color: "rgba(107,187,138,0.9)",
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                          {task.categoryTag && (
                            <span
                              className="inline-flex items-center text-[9px] tracking-[0.06em] uppercase px-1.5 py-0.5 rounded-[3px] font-medium shrink-0"
                              style={{
                                background: tag
                                  ? tag.color + "22"
                                  : "rgba(200,200,210,0.1)",
                                color: tag ? tag.color : "var(--text-mid)",
                              }}
                            >
                              {task.categoryTag}
                            </span>
                          )}
                          <span
                            className="text-[12px] tracking-[0.01em] leading-snug"
                            style={{
                              color: "var(--text-primary)",
                              textDecoration:
                                task.status === "done"
                                  ? "line-through"
                                  : "none",
                            }}
                          >
                            {task.title}
                          </span>
                          {task.status !== "done" && task.description && (
                            <span
                              className="text-[16px] leading-none opacity-30 shrink-0"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              ≡
                            </span>
                          )}
                          {task.status !== "done" &&
                            fmtMinutes(task.estimatedMinutes) && (
                              <span
                                className="text-[11px] opacity-45 flex items-center gap-1 shrink-0"
                                style={{
                                  color: "var(--text-secondary)",
                                  fontFamily: "var(--font-mono)",
                                }}
                              >
                                ⏱ {fmtMinutes(task.estimatedMinutes)}
                              </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.75 shrink-0 pt-0.5">
                          {task.priority === "high" && (
                            <span
                              className="text-[10px] tracking-[0.04em]"
                              style={{ color: "rgba(217,107,107,0.75)" }}
                            >
                              High
                            </span>
                          )}
                          {task.status !== "done" && due && (
                            <span
                              className="text-[10px] tracking-[0.03em] px-2 py-0.5 rounded-[3px] border flex items-center gap-1 whitespace-nowrap"
                              style={dueStyle(due.cls)}
                            >
                              {due.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions row */}
                      {task.status !== "done" && (
                        <div
                          className="flex items-center justify-end gap-1.25 mt-1.25 min-h-6 opacity-0 group-hover/row:opacity-100 transition-opacity"
                          style={{ ...(isRunning ? { opacity: 1 } : {}) }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTimer(task.id);
                            }}
                            className="flex items-center gap-1 text-[10px] tracking-[0.04em] px-2.5 py-1 rounded-[5px] border whitespace-nowrap transition-all"
                            style={{
                              fontFamily: "var(--font-mono)",
                              background: isRunning
                                ? "rgba(107,187,138,0.07)"
                                : "none",
                              borderColor: isRunning
                                ? "rgba(107,187,138,0.4)"
                                : "var(--border)",
                              color: isRunning
                                ? "rgba(107,187,138,0.9)"
                                : "var(--text-secondary)",
                            }}
                          >
                            {isRunning ? (
                              <>
                                <span
                                  className="w-1.25 h-1.25 rounded-full inline-block mr-0.5"
                                  style={{
                                    background: "rgba(107,187,138,0.8)",
                                  }}
                                />
                                Running
                              </>
                            ) : (
                              "▶ Start"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Inline add */}
              {addingIn === sec.id && (
                <div
                  className="flex items-center border-b min-h-11 py-1"
                  style={{
                    borderColor: "var(--border-mid)",
                    background: "var(--surface)",
                  }}
                >
                  <input
                    autoFocus
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddTask(sec.id);
                      if (e.key === "Escape") {
                        setAddingIn(null);
                        setNewTaskTitle("");
                      }
                    }}
                    placeholder="Task name..."
                    className="flex-1 bg-transparent border-none outline-none text-[12px] tracking-[0.01em] ml-9"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                  <div className="flex gap-1.5 pr-0.5">
                    <button
                      onClick={() => {
                        setAddingIn(null);
                        setNewTaskTitle("");
                      }}
                      className="text-[10px] px-2.5 py-1 rounded-[5px] border"
                      style={{
                        color: "var(--text-secondary)",
                        borderColor: "var(--border)",
                        fontFamily: "var(--font-mono)",
                        background: "none",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddTask(sec.id)}
                      className="text-[10px] px-2.5 py-1 rounded-[5px] hover:opacity-80"
                      style={{
                        background: "var(--text-primary)",
                        color: "var(--bg)",
                        border: "none",
                        fontFamily: "var(--font-mono)",
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setAddingIn(sec.id);
                  setNewTaskTitle("");
                }}
                className="inline-flex items-center gap-1.75 bg-transparent border-none text-[12px] tracking-[0.02em] py-1.5 mt-1.5 cursor-pointer transition-colors"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-mid)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-secondary)")
                }
              >
                <span className="text-[15px] leading-none">+</span> New Task
              </button>
            </div>
          );
        })}

        {/* Add section */}
        {addingSection ? (
          <div className="mt-10">
            <input
              ref={newSectionInputRef}
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSection();
                if (e.key === "Escape") {
                  setAddingSection(false);
                  setNewSectionName("");
                }
              }}
              onBlur={() => {
                if (!newSectionName.trim()) setAddingSection(false);
              }}
              placeholder="Section name..."
              className="text-[14px] font-semibold tracking-[-0.01em] bg-transparent border-b outline-none w-full pb-1"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--text-primary)",
                borderColor: "var(--border-mid)",
              }}
            />
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={handleAddSection}
                className="text-[10px] px-2.5 py-1 rounded-[5px] hover:opacity-80"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg)",
                  border: "none",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                }}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setAddingSection(false);
                  setNewSectionName("");
                }}
                className="text-[10px] px-2.5 py-1 rounded-[5px] border"
                style={{
                  color: "var(--text-secondary)",
                  borderColor: "var(--border)",
                  fontFamily: "var(--font-mono)",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setAddingSection(true);
              setTimeout(() => newSectionInputRef.current?.focus(), 0);
            }}
            className="inline-flex items-center gap-1.75 bg-transparent border-none text-[12px] tracking-[0.02em] py-1.5 mt-10 cursor-pointer transition-colors"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-mid)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
          >
            <span className="text-[15px] leading-none">+</span> Add Section
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

      <TimerBar
        activeEntry={activeEntry}
        activeTask={activeTask}
        onStop={handleStopTimer}
      />
    </div>
  );
}
