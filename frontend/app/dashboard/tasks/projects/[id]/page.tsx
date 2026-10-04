"use client";

import { useState, useEffect, useRef } from "react";
import {
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  parse,
  startOfDay,
} from "date-fns";
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
import {
  MilestoneStrip,
  type Milestone,
} from "@/components/dashboard/MilestoneStrip";
import { Flag } from "lucide-react";
import { isLeftHalf, isUpperHalf, moveBefore, moveTask } from "@/lib/reorder";

type Project = {
  id: string;
  name: string;
  color: string | null;
  viewType: string;
};
type Section = { id: string; name: string; order: number; projectId: string };

function fmtDue(dateStr: string | null) {
  if (!dateStr) return null;
  const date = parse(dateStr.slice(0, 10), "yyyy-MM-dd", new Date());
  const diff = differenceInCalendarDays(date, startOfDay(new Date()));
  let label: string;
  if (isToday(date)) label = "Today";
  else if (isTomorrow(date)) label = "Tomorrow";
  else if (diff > 1 && diff <= 6) label = format(date, "EEEE");
  else label = format(date, "MMM d");
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

export default function KanbanPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectTags, setProjectTags] = useState<ProjectTag[]>([]);
  const [addingInSection, setAddingInSection] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [modal, setModal] = useState<TaskModalState>({
    open: false,
    task: null,
  });
  const [drag, setDrag] = useState<{
    taskId: string;
    fromSectionId: string;
  } | null>(null);
  // Where a dragged task would land: before `beforeTaskId`, or at the end
  const [dropTarget, setDropTarget] = useState<{
    sectionId: string;
    beforeTaskId: string | null;
  } | null>(null);
  // Section (column) being dragged, and the section it would land before
  // (null = at the end, undefined = nowhere yet)
  const [sectionDrag, setSectionDrag] = useState<string | null>(null);
  const [sectionDropBefore, setSectionDropBefore] = useState<
    string | null | undefined
  >(undefined);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneFilter, setMilestoneFilter] = useState<string | null>(null);

  // Add/manage sections
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const newSectionInputRef = useRef<HTMLInputElement>(null);
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(
    null,
  );
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
      await apiFetch("/time-entries/stop", {
        method: "POST",
        body: JSON.stringify({ timeEntryId: current.id }),
      });
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
      apiFetch<Milestone[]>(`/projects/${projectId}/milestones`).catch(
        () => [] as Milestone[],
      ),
    ])
      .then(async ([proj, secs, taskList, tags, milestoneList]) => {
        if (proj.viewType === "list") {
          router.replace(`/dashboard/tasks/projects/${projectId}/list`);
          return;
        }
        setProject(proj);
        setSections(secs.sort((a, b) => a.order - b.order));
        setProjectTags(tags);
        setMilestones(milestoneList);
        const ids = taskList.map((t) => t.id);
        let totals: Record<string, number> = {};
        let subtaskCounts: Record<
          string,
          { total: number; completed: number }
        > = {};
        if (ids.length) {
          [totals, subtaskCounts] = await Promise.all([
            apiFetch<Record<string, number>>("/time-entries/totals", {
              method: "POST",
              body: JSON.stringify({ taskIds: ids }),
            }).catch(() => ({})),
            apiFetch<Record<string, { total: number; completed: number }>>(
              "/tasks/subtask-counts",
              {
                method: "POST",
                body: JSON.stringify({ taskIds: ids }),
              },
            ).catch(() => ({})),
          ]);
        }
        setTasks(
          taskList.map((t) => ({
            ...t,
            actualMinutes: totals[t.id] ?? null,
            subtaskCount: subtaskCounts[t.id]?.total ?? 0,
            subtaskCompletedCount: subtaskCounts[t.id]?.completed ?? 0,
          })),
        );
      })
      .catch(() => {});
  }, [projectId]);

  // Milestone progress depends on task status, so refresh after task changes.
  function reloadMilestones() {
    apiFetch<Milestone[]>(`/projects/${projectId}/milestones`)
      .then(setMilestones)
      .catch(() => {});
  }

  async function handleAddTask(sectionId: string) {
    if (!newTaskTitle.trim()) {
      setAddingInSection(null);
      return;
    }
    try {
      const created = await apiFetch<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          projectId,
          sectionId,
          // Keep the new task visible while a milestone filter is active
          ...(milestoneFilter ? { milestoneId: milestoneFilter } : {}),
        }),
      });
      setTasks((prev) => [...prev, created]);
      if (milestoneFilter) reloadMilestones();
    } catch {}
    setNewTaskTitle("");
    setAddingInSection(null);
  }

  async function handleTaskDrop(sectionId: string) {
    const current = drag;
    const beforeTaskId =
      dropTarget?.sectionId === sectionId ? dropTarget.beforeTaskId : null;
    setDrag(null);
    setDropTarget(null);
    if (!current) return;
    const previous = tasks;
    const { tasks: next, sectionTaskIds } = moveTask(
      tasks,
      current.taskId,
      sectionId,
      beforeTaskId,
    );
    setTasks(next);
    try {
      await apiFetch("/tasks/reorder", {
        method: "POST",
        body: JSON.stringify({ projectId, sectionId, taskIds: sectionTaskIds }),
      });
    } catch {
      setTasks(previous);
    }
  }

  async function handleSectionDrop() {
    const moving = sectionDrag;
    const before = sectionDropBefore;
    setSectionDrag(null);
    setSectionDropBefore(undefined);
    if (!moving || before === undefined) return;
    const previous = sections;
    const next = moveBefore(sections, moving, before);
    setSections(next);
    try {
      await apiFetch(`/projects/${projectId}/sections/reorder`, {
        method: "POST",
        body: JSON.stringify({ sectionIds: next.map((s) => s.id) }),
      });
    } catch {
      setSections(previous);
    }
  }

  async function handleSaveTask(id: string, updates: Partial<Task>) {
    try {
      const updated = await apiFetch<Task>(`/tasks/${id}/update`, {
        method: "POST",
        body: JSON.stringify(updates),
      });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? {
                ...updated,
                subtaskCount: task.subtaskCount,
                subtaskCompletedCount: task.subtaskCompletedCount,
              }
            : task,
        ),
      );
      reloadMilestones();
    } catch {}
  }

  async function handleDeleteTask(id: string) {
    try {
      await apiFetch(`/tasks/${id}/delete`, { method: "POST" });
      setTasks((prev) => prev.filter((task) => task.id !== id));
      reloadMilestones();
    } catch {}
  }

  async function handleToggleDone(taskId: string) {
    const task = tasks.find((task) => task.id === taskId);
    if (!task) return;
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      const updated = await apiFetch<Task>(`/tasks/${taskId}/update`, {
        method: "POST",
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...updated,
                subtaskCount: t.subtaskCount,
                subtaskCompletedCount: t.subtaskCompletedCount,
              }
            : t,
        ),
      );
      if (task.milestoneId) reloadMilestones();
    } catch {}
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

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
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
          {/* Tags button */}
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
                  className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-sm group/tag"
                  style={{ background: tag.color + "22", color: tag.color }}
                >
                  <span className="tracking-[0.04em] uppercase font-medium">
                    {tag.name}
                  </span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="opacity-0 group-hover/tag:opacity-70 hover:opacity-100! transition-opacity text-[11px] leading-none"
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

        {/* View toggle */}
        <div
          className="flex items-center justify-between border-b pb-0 gap-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/tasks/projects/${projectId}`}
              onClick={() =>
                apiFetch(`/projects/${projectId}/update`, {
                  method: "POST",
                  body: JSON.stringify({ viewType: "kanban" }),
                }).catch(() => {})
              }
              className="text-[10px] tracking-[0.04em] px-2.5 py-1.5 rounded-t border-b-2 transition-colors"
              style={{
                color: "var(--text-primary)",
                borderColor: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Board
            </Link>
            <Link
              href={`/dashboard/tasks/projects/${projectId}/list`}
              onClick={() =>
                apiFetch(`/projects/${projectId}/update`, {
                  method: "POST",
                  body: JSON.stringify({ viewType: "list" }),
                }).catch(() => {})
              }
              className="text-[10px] tracking-[0.04em] px-2.5 py-1.5 rounded-t border-b-2 transition-colors"
              style={{
                color: "var(--text-secondary)",
                borderColor: "transparent",
                fontFamily: "var(--font-mono)",
              }}
            >
              List
            </Link>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="shrink-0 px-8 pt-5">
        <MilestoneStrip
          projectId={projectId}
          milestones={milestones}
          onChange={setMilestones}
          selectedId={milestoneFilter}
          onSelect={setMilestoneFilter}
        />
      </div>

      {/* Board */}
      <div
        className="overflow-x-auto"
        onDragOver={(e) => {
          // Dropping a column past the last one puts it at the end
          if (sectionDrag) {
            e.preventDefault();
            if (e.target === e.currentTarget) setSectionDropBefore(null);
          }
        }}
        onDrop={(e) => {
          if (sectionDrag && e.target === e.currentTarget) handleSectionDrop();
        }}
        style={{
          padding: "8px 32px 32px",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        {sections.length === 0 && !addingSection && (
          <div
            className="flex flex-col items-center justify-center gap-3 w-full h-40"
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

        {sections.map((section, sectionIndex) => {
          const colTasks = tasks.filter(
            (t) =>
              t.sectionId === section.id &&
              (!milestoneFilter || t.milestoneId === milestoneFilter),
          );
          const isRenaming = renamingSectionId === section.id;
          const isDropTarget =
            drag !== null && dropTarget?.sectionId === section.id;
          const showDropLineAtEnd =
            isDropTarget && dropTarget?.beforeTaskId === null;
          const sectionDropHere =
            sectionDrag !== null &&
            sectionDrag !== section.id &&
            sectionDropBefore === section.id;

          return (
            <div
              key={section.id}
              style={{
                width: 264,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                opacity: sectionDrag === section.id ? 0.4 : 1,
                boxShadow: sectionDropHere
                  ? "-7px 0 0 -5px var(--text-mid)"
                  : undefined,
              }}
              onDragOver={(e) => {
                if (sectionDrag) {
                  e.preventDefault();
                  const before = isLeftHalf(e)
                    ? section.id
                    : (sections[sectionIndex + 1]?.id ?? null);
                  setSectionDropBefore(before);
                  return;
                }
                if (!drag) return;
                e.preventDefault();
                // Over empty column space: drop at the end
                if (
                  dropTarget?.sectionId !== section.id ||
                  dropTarget.beforeTaskId !== null
                ) {
                  setDropTarget({ sectionId: section.id, beforeTaskId: null });
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (sectionDrag) handleSectionDrop();
                else handleTaskDrop(section.id);
              }}
            >
              {/* Column header: drag it to reorder sections */}
              <div
                className="flex items-center justify-between mb-2.5 px-0.5 group/header"
                draggable={!isRenaming}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", section.id);
                  setSectionDrag(section.id);
                }}
                onDragEnd={() => {
                  setSectionDrag(null);
                  setSectionDropBefore(undefined);
                }}
                style={{ cursor: isRenaming ? undefined : "grab" }}
                title="Drag to reorder sections"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      value={renamingValue}
                      onChange={(e) => setRenamingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(section.id);
                        if (e.key === "Escape") setRenamingSectionId(null);
                      }}
                      onBlur={() => commitRename(section.id)}
                      className="text-[13px] font-semibold tracking-[-0.01em] bg-transparent border-b outline-none flex-1 min-w-0"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--text-primary)",
                        borderColor: "var(--border-mid)",
                      }}
                    />
                  ) : (
                    <span
                      className="text-[13px] font-semibold tracking-[-0.01em] truncate cursor-text"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--text-primary)",
                      }}
                      onClick={() => startRenaming(section)}
                    >
                      {section.name}
                    </span>
                  )}
                  <span
                    className="text-[11px] shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteSection(section.id)}
                  className="text-[14px] w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0"
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

              {/* Tasks list with dashed drop target border */}
              <div
                className="flex flex-col gap-1.5 pb-1 rounded-lg transition-all"
                style={{
                  scrollbarWidth: "none",
                  minHeight: drag ? 40 : undefined,
                  ...(isDropTarget
                    ? {
                        outline: "2px dashed var(--border-mid)",
                        outlineOffset: "4px",
                        background: "rgba(255,255,255,0.02)",
                      }
                    : {}),
                }}
              >
                {colTasks.map((task, taskIndex) => {
                  const isRunning = activeEntry?.taskId === task.id;
                  const due = fmtDue(task.dueDate ?? null);
                  const isDragging = drag?.taskId === task.id;
                  const tag = projectTags.find(
                    (t) => t.name === task.categoryTag,
                  );
                  const milestone = milestoneFilter
                    ? null
                    : milestones.find((m) => m.id === task.milestoneId);
                  const showDropLine =
                    isDropTarget &&
                    dropTarget?.beforeTaskId === task.id &&
                    !isDragging;

                  return (
                    <div key={task.id} className="flex flex-col gap-1.5">
                    {showDropLine && (
                      <div
                        className="h-0.5 rounded-full mx-1"
                        style={{ background: "var(--text-mid)" }}
                      />
                    )}
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", task.id);
                        // Let the browser capture the drag image before dimming the element
                        const el = e.currentTarget as HTMLElement;
                        setTimeout(() => {
                          el.style.opacity = "0.25";
                        }, 0);
                        setDrag({ taskId: task.id, fromSectionId: section.id });
                      }}
                      onDragEnd={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = "";
                        setDrag(null);
                        setDropTarget(null);
                      }}
                      onDragOver={(e) => {
                        if (!drag) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const beforeTaskId = isUpperHalf(e)
                          ? task.id
                          : (colTasks[taskIndex + 1]?.id ?? null);
                        if (
                          dropTarget?.sectionId !== section.id ||
                          dropTarget.beforeTaskId !== beforeTaskId
                        ) {
                          setDropTarget({ sectionId: section.id, beforeTaskId });
                        }
                      }}
                      onClick={() =>
                        !isDragging && setModal({ open: true, task })
                      }
                      className="rounded-lg border px-3 py-3 cursor-pointer transition-all group/card"
                      style={{
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                        opacity: task.status === "done" ? 0.55 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isDragging) {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            "var(--border-mid)";
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--surface-raised)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "var(--border)";
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--surface)";
                      }}
                    >
                      {/* Top row */}
                      <div className="flex items-start gap-2">
                        {/* Done checkbox */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDone(task.id);
                          }}
                          className="w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center cursor-pointer shrink-0 mt-0.5 transition-colors"
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

                        <div className="flex-1 min-w-0">
                          {task.categoryTag && (
                            <div
                              className="inline-flex items-center text-[9px] tracking-[0.06em] uppercase px-2 py-0.5 rounded-[3px] mb-1.5 font-medium"
                              style={{
                                background: tag
                                  ? tag.color + "22"
                                  : "rgba(200,200,210,0.1)",
                                color: tag ? tag.color : "var(--text-mid)",
                              }}
                            >
                              {task.categoryTag}
                            </div>
                          )}
                          <div
                            className="text-[12px] tracking-[0.01em] leading-snug wrap-break-word"
                            style={{
                              color: "var(--text-primary)",
                              textDecoration:
                                task.status === "done"
                                  ? "line-through"
                                  : "none",
                              opacity: task.status === "done" ? 0.4 : 1,
                            }}
                          >
                            {task.title}
                          </div>
                        </div>

                        <div className="flex items-start gap-1 shrink-0 ml-1 pt-0.5">
                          {task.priority === "high" && (
                            <span
                              className="text-[10px] tracking-[0.04em]"
                              style={{ color: "rgba(217,107,107,0.7)" }}
                            >
                              High
                            </span>
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
                      {task.status !== "done" && (
                        <div className="flex items-center justify-between mt-2.5">
                          <div className="flex items-center gap-2.5">
                            {task.description && (
                              <span
                                className="text-[15px] leading-none"
                                style={{
                                  color: "var(--text-secondary)",
                                  opacity: 0.45,
                                }}
                              >
                                ≡
                              </span>
                            )}
                            {fmtMinutes(task.estimatedMinutes) && (
                              <span
                                className="text-[11px] flex items-center gap-1"
                                style={{
                                  color: "var(--text-secondary)",
                                  fontFamily: "var(--font-mono)",
                                  opacity: 0.55,
                                }}
                              >
                                ⏱ {fmtMinutes(task.estimatedMinutes)}
                              </span>
                            )}
                            {(task.subtaskCount ?? 0) > 0 && (
                              <span
                                className="text-[11px] flex items-center gap-1"
                                style={{
                                  color: "var(--text-secondary)",
                                  fontFamily: "var(--font-mono)",
                                  opacity: 0.6,
                                }}
                              >
                                ◻ {task.subtaskCompletedCount ?? 0}/
                                {task.subtaskCount}
                              </span>
                            )}
                          </div>
                          <div
                            className="opacity-0 group-hover/card:opacity-100 transition-opacity"
                            style={{ ...(isRunning ? { opacity: 1 } : {}) }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartTimer(task.id);
                              }}
                              className="flex items-center gap-1 text-[10px] tracking-[0.04em] px-2 py-0.5 rounded-sm border transition-all"
                              style={{
                                fontFamily: "var(--font-mono)",
                                background: isRunning
                                  ? "rgba(107,187,138,0.08)"
                                  : "none",
                                borderColor: isRunning
                                  ? "rgba(107,187,138,0.45)"
                                  : "var(--border)",
                                color: isRunning
                                  ? "rgba(107,187,138,0.9)"
                                  : "var(--text-secondary)",
                              }}
                            >
                              {isRunning ? "● Running" : "▶ Start"}
                            </button>
                          </div>
                        </div>
                      )}
                      {milestone && (
                        <div
                          className="mt-2 flex items-center gap-1.5 text-[10px] tracking-[0.03em] min-w-0"
                          style={{
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          <Flag size={10} className="shrink-0" aria-hidden />
                          <span className="truncate">{milestone.name}</span>
                        </div>
                      )}
                    </div>
                    </div>
                  );
                })}

                {showDropLineAtEnd && (
                  <div
                    className="h-0.5 rounded-full mx-1"
                    style={{ background: "var(--text-mid)" }}
                  />
                )}

                {/* Inline add */}
                {addingInSection === section.id && (
                  <div
                    className="rounded-lg border px-3 py-2.5"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border-mid)",
                    }}
                  >
                    <input
                      autoFocus
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTask(section.id);
                        if (e.key === "Escape") {
                          setAddingInSection(null);
                          setNewTaskTitle("");
                        }
                      }}
                      placeholder="Task name..."
                      className="w-full bg-transparent border-none outline-none text-[12px] tracking-[0.01em]"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                    <div className="flex justify-end gap-1.5 mt-2">
                      <button
                        onClick={() => {
                          setAddingInSection(null);
                          setNewTaskTitle("");
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-[5px] border"
                        style={{
                          color: "var(--text-secondary)",
                          borderColor: "var(--border)",
                          fontFamily: "var(--font-mono)",
                          background: "none",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAddTask(section.id)}
                        className="text-[10px] px-2.5 py-1 rounded-[5px] hover:opacity-80"
                        style={{
                          background: "var(--text-primary)",
                          color: "var(--bg)",
                          border: "none",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add task button */}
              <button
                onClick={() => {
                  setAddingInSection(section.id);
                  setNewTaskTitle("");
                }}
                className="flex items-center gap-1.75 text-[12px] tracking-[0.02em] px-0.5 py-2.25 w-full mt-1 rounded-md border-none bg-transparent transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-mid)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-secondary)")
                }
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
              className="w-full text-[13px] font-semibold tracking-[-0.01em] bg-transparent border-b outline-none px-0.5 pb-1"
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
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          sections.length > 0 && (
            <button
              onClick={() => {
                setAddingSection(true);
                setTimeout(() => newSectionInputRef.current?.focus(), 0);
              }}
              className="flex items-center gap-1.5 text-[12px] tracking-[0.02em] h-9 px-3 rounded-lg border shrink-0 transition-colors self-start"
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
              + Section
            </button>
          )
        )}
      </div>

      <TaskModal
        state={modal}
        onClose={() => setModal({ open: false, task: null })}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onSubtaskCountChange={(taskId, total, completed) =>
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    subtaskCount: total,
                    subtaskCompletedCount: completed,
                  }
                : t,
            ),
          )
        }
        projectTags={projectTags}
        milestones={milestones}
      />

      <TimerBar
        activeEntry={activeEntry}
        activeTask={activeTask}
        onStop={handleStopTimer}
      />
    </div>
  );
}
