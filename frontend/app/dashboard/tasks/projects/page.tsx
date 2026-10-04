"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Ellipsis,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  Plus,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { isUpperHalf } from "@/lib/reorder";

const COLORS = [
  "#d96b6b", "#d9896b", "#d9c46b",
  "#6bbb8a", "#6b9ed9", "#7b6ef6",
  "#c47fd4", "#d9d9d9", "#888890",
];

type Project = {
  id: string;
  name: string;
  color: string | null;
  viewType: string;
  folderId: string | null;
  position: number;
};

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
  collapsed: boolean;
};

type DragItem = { type: "project" | "folder"; id: string };

// Where the dragged item would land
type DropHint =
  | { kind: "into"; folderId: string | null }
  | { kind: "before" | "after"; type: "project" | "folder"; id: string };

type CtxMenu =
  | { type: "project"; id: string; x: number; y: number }
  | { type: "folder"; id: string; x: number; y: number };

// Each nesting level shifts a row right by one column (chevron slot + gap)
const INDENT = 24;
// x of the vertical guide line for a level, centred under that level's chevron
const guideX = (level: number) => 8 + level * INDENT + 7;

function byPosition<T extends { position: number }>(a: T, b: T) {
  return a.position - b.position;
}

/** Folder ids inside `folderId` at any depth, including itself. */
function subtreeIds(folders: Folder[], folderId: string): Set<string> {
  const ids = new Set([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }
  return ids;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[4]);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

  const [fName, setFName] = useState("");
  const [fFolderId, setFFolderId] = useState<string>("");

  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Project[]>("/projects"),
      apiFetch<Folder[]>("/project-folders").catch(() => [] as Folder[]),
    ])
      .then(([projectList, folderList]) => {
        setProjects(projectList);
        setFolders(folderList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (renamingFolderId) renameInputRef.current?.select();
  }, [renamingFolderId]);

  // ── Folder paths for the project modal ────────────────────────────────

  function folderOptions(parentId: string | null = null, depth = 0): { id: string; label: string }[] {
    return folders
      .filter((f) => f.parentId === parentId)
      .sort(byPosition)
      .flatMap((folder) => [
        { id: folder.id, label: `${"   ".repeat(depth)}${folder.name}` },
        ...folderOptions(folder.id, depth + 1),
      ]);
  }

  // ── Projects ──────────────────────────────────────────────────────────

  function openCreate(folderId: string | null = null) {
    setEditingId(null);
    setFName("");
    setFFolderId(folderId ?? "");
    setSelectedColor(COLORS[4]);
    setModalOpen(true);
  }

  function openEdit(id: string) {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    setEditingId(id);
    setFName(p.name);
    setFFolderId(p.folderId ?? "");
    setSelectedColor(p.color ?? COLORS[4]);
    setModalOpen(true);
  }

  async function saveProject() {
    if (!fName.trim()) return;
    const folderId = fFolderId || null;
    try {
      if (editingId !== null) {
        const updated = await apiFetch<Project>(`/projects/${editingId}/update`, {
          method: "POST",
          body: JSON.stringify({ name: fName.trim(), color: selectedColor, folderId }),
        });
        setProjects(ps => ps.map(p => p.id === editingId ? updated : p));
      } else {
        const created = await apiFetch<Project>("/projects", {
          method: "POST",
          body: JSON.stringify({ name: fName.trim(), color: selectedColor, folderId }),
        });
        setProjects(ps => [...ps, created]);
        if (folderId) expandFolder(folderId);
      }
    } catch {}
    setModalOpen(false);
  }

  async function deleteProject(id: string) {
    try {
      await apiFetch(`/projects/${id}/delete`, { method: "POST" });
      setProjects(ps => ps.filter(p => p.id !== id));
    } catch {}
    setCtxMenu(null);
  }

  // ── Folders ───────────────────────────────────────────────────────────

  async function createFolder(parentId: string | null) {
    setCtxMenu(null);
    try {
      const created = await apiFetch<Folder>("/project-folders", {
        method: "POST",
        body: JSON.stringify({ name: "New folder", parentId }),
      });
      setFolders((prev) => [...prev, created]);
      if (parentId) expandFolder(parentId);
      setRenamingFolderId(created.id);
      setRenameValue(created.name);
    } catch {}
  }

  function startRename(folder: Folder) {
    setCtxMenu(null);
    setRenamingFolderId(folder.id);
    setRenameValue(folder.name);
  }

  async function commitRename() {
    const id = renamingFolderId;
    setRenamingFolderId(null);
    if (!id || !renameValue.trim()) return;
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: renameValue.trim() } : f)));
    try {
      await apiFetch(`/project-folders/${id}/update`, {
        method: "POST",
        body: JSON.stringify({ name: renameValue.trim() }),
      });
    } catch {}
  }

  function setCollapsed(folderId: string, collapsed: boolean) {
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, collapsed } : f)));
    apiFetch(`/project-folders/${folderId}/update`, {
      method: "POST",
      body: JSON.stringify({ collapsed }),
    }).catch(() => {});
  }

  function expandFolder(folderId: string) {
    const folder = folders.find((f) => f.id === folderId);
    if (folder?.collapsed) setCollapsed(folderId, false);
  }

  async function deleteFolder(id: string) {
    setCtxMenu(null);
    try {
      await apiFetch(`/project-folders/${id}/delete`, { method: "POST" });
      // The server moved the folder's contents up a level; reload to match.
      const [projectList, folderList] = await Promise.all([
        apiFetch<Project[]>("/projects"),
        apiFetch<Folder[]>("/project-folders"),
      ]);
      setProjects(projectList);
      setFolders(folderList);
    } catch {}
  }

  // ── Drag and drop ─────────────────────────────────────────────────────

  function canDropFolderInto(folderId: string, targetParentId: string | null) {
    if (!targetParentId) return true;
    return !subtreeIds(folders, folderId).has(targetParentId);
  }

  function onRowDragOver(
    e: React.DragEvent<HTMLElement>,
    target: { type: "project" | "folder"; id: string },
  ) {
    if (!dragItem) return;
    e.preventDefault();
    e.stopPropagation();
    let hint: DropHint;
    if (target.type === "folder") {
      const rect = e.currentTarget.getBoundingClientRect();
      const offset = (e.clientY - rect.top) / rect.height;
      if (dragItem.type === "project") {
        hint = { kind: "into", folderId: target.id };
      } else if (offset < 0.25) {
        hint = { kind: "before", type: "folder", id: target.id };
      } else if (offset > 0.75) {
        hint = { kind: "after", type: "folder", id: target.id };
      } else {
        hint = { kind: "into", folderId: target.id };
      }
    } else if (dragItem.type === "project") {
      hint = { kind: isUpperHalf(e) ? "before" : "after", type: "project", id: target.id };
    } else {
      // A folder over a project row: drop into that project's folder
      const project = projects.find((p) => p.id === target.id);
      hint = { kind: "into", folderId: project?.folderId ?? null };
    }
    if (dragItem.type === "folder") {
      const parent =
        hint.kind === "into"
          ? hint.folderId
          : (folders.find((f) => f.id === hint.id)?.parentId ?? null);
      if (!canDropFolderInto(dragItem.id, parent) || (hint.kind !== "into" && hint.id === dragItem.id)) {
        e.dataTransfer.dropEffect = "none";
        setDropHint(null);
        return;
      }
    }
    if (JSON.stringify(hint) !== JSON.stringify(dropHint)) setDropHint(hint);
  }

  async function moveProject(projectId: string, folderId: string | null, beforeId: string | null) {
    const siblings = projects
      .filter((p) => p.folderId === folderId && p.id !== projectId)
      .sort(byPosition);
    const index = beforeId ? siblings.findIndex((p) => p.id === beforeId) : -1;
    const moving = projects.find((p) => p.id === projectId);
    if (!moving) return;
    const ordered = index === -1 ? [...siblings, moving] : [...siblings.slice(0, index), moving, ...siblings.slice(index)];
    const previous = projects;
    setProjects((prev) =>
      prev.map((p) => {
        const position = ordered.findIndex((o) => o.id === p.id);
        return position === -1 ? p : { ...p, folderId, position };
      }),
    );
    if (folderId) expandFolder(folderId);
    try {
      await apiFetch("/projects/arrange", {
        method: "POST",
        body: JSON.stringify({ folderId, projectIds: ordered.map((p) => p.id) }),
      });
    } catch {
      setProjects(previous);
    }
  }

  async function moveFolder(folderId: string, parentId: string | null, beforeId: string | null) {
    if (!canDropFolderInto(folderId, parentId)) return;
    const siblings = folders
      .filter((f) => f.parentId === parentId && f.id !== folderId)
      .sort(byPosition);
    const index = beforeId ? siblings.findIndex((f) => f.id === beforeId) : -1;
    const moving = folders.find((f) => f.id === folderId);
    if (!moving) return;
    const ordered = index === -1 ? [...siblings, moving] : [...siblings.slice(0, index), moving, ...siblings.slice(index)];
    const previous = folders;
    setFolders((prev) =>
      prev.map((f) => {
        const position = ordered.findIndex((o) => o.id === f.id);
        return position === -1 ? f : { ...f, parentId, position };
      }),
    );
    if (parentId) expandFolder(parentId);
    try {
      await apiFetch("/project-folders/arrange", {
        method: "POST",
        body: JSON.stringify({ parentId, folderIds: ordered.map((f) => f.id) }),
      });
    } catch {
      setFolders(previous);
    }
  }

  function handleDrop() {
    const item = dragItem;
    const hint = dropHint;
    setDragItem(null);
    setDropHint(null);
    if (!item || !hint) return;

    if (item.type === "project") {
      if (hint.kind === "into") {
        moveProject(item.id, hint.folderId, null);
      } else if (hint.type === "project") {
        const target = projects.find((p) => p.id === hint.id);
        if (!target || target.id === item.id) return;
        const siblings = projects
          .filter((p) => p.folderId === target.folderId && p.id !== item.id)
          .sort(byPosition);
        const beforeId =
          hint.kind === "before"
            ? target.id
            : (siblings[siblings.findIndex((p) => p.id === target.id) + 1]?.id ?? null);
        moveProject(item.id, target.folderId, beforeId);
      }
      return;
    }

    if (hint.kind === "into") {
      moveFolder(item.id, hint.folderId, null);
    } else if (hint.type === "folder") {
      const target = folders.find((f) => f.id === hint.id);
      if (!target || target.id === item.id) return;
      const siblings = folders
        .filter((f) => f.parentId === target.parentId && f.id !== item.id)
        .sort(byPosition);
      const beforeId =
        hint.kind === "before"
          ? target.id
          : (siblings[siblings.findIndex((f) => f.id === target.id) + 1]?.id ?? null);
      moveFolder(item.id, target.parentId, beforeId);
    }
  }

  function dragProps(item: DragItem) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.id);
        setDragItem(item);
        setCtxMenu(null);
      },
      onDragEnd: () => {
        setDragItem(null);
        setDropHint(null);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleDrop();
      },
    };
  }

  function lineFor(type: "project" | "folder", id: string): string | undefined {
    if (!dropHint || dropHint.kind === "into" || dropHint.type !== type || dropHint.id !== id) return undefined;
    return dropHint.kind === "before"
      ? "inset 0 2px 0 0 var(--text-mid)"
      : "inset 0 -2px 0 0 var(--text-mid)";
  }

  // ── Rendering ─────────────────────────────────────────────────────────

  /** Vertical lines showing which folder a nested row belongs to. */
  function guides(depth: number) {
    return Array.from({ length: depth }, (_, level) => (
      <span
        key={level}
        aria-hidden
        className="absolute top-0 bottom-0 w-px"
        style={{ left: guideX(level), background: "var(--border)" }}
      />
    ));
  }

  function rowStyle(depth: number, extra?: React.CSSProperties): React.CSSProperties {
    return {
      borderColor: "var(--border)",
      paddingLeft: 8 + depth * INDENT,
      ...extra,
    };
  }

  function MoreButton({ label, onOpen }: { label: string; onOpen: (e: React.MouseEvent) => void }) {
    return (
      <button
        className="w-7 h-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0"
        style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-raised)"; e.currentTarget.style.color = "var(--text-primary)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        onClick={e => {
          e.stopPropagation();
          onOpen(e);
        }}
        title={label}
        aria-label={label}
      >
        <Ellipsis size={16} />
      </button>
    );
  }

  function renderProject(p: Project, depth: number) {
    const isDragging = dragItem?.type === "project" && dragItem.id === p.id;
    return (
      <div
        key={p.id}
        {...dragProps({ type: "project", id: p.id })}
        onDragOver={(e) => onRowDragOver(e, { type: "project", id: p.id })}
        className="relative flex items-center gap-2 h-12 pr-2 border-b cursor-pointer group"
        style={rowStyle(depth, {
          opacity: isDragging ? 0.35 : 1,
          boxShadow: lineFor("project", p.id),
        })}
        onClick={() => router.push(`/dashboard/tasks/projects/${p.id}`)}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        {guides(depth)}
        {/* chevron column stays empty so names line up with folder names */}
        <span className="w-4 shrink-0" aria-hidden />
        <span className="w-4 h-4 shrink-0 flex items-center justify-center" aria-hidden>
          <span
            className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-110"
            style={{ background: p.color ?? "var(--border-mid)" }}
          />
        </span>
        <span
          className="flex-1 min-w-0 ml-1 text-[14px] tracking-[0.005em] truncate"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          {p.name}
        </span>
        <MoreButton
          label={`More options for ${p.name}`}
          onOpen={(e) => setCtxMenu({ type: "project", id: p.id, x: e.clientX, y: e.clientY })}
        />
      </div>
    );
  }

  function countProjects(folderId: string): number {
    const ids = subtreeIds(folders, folderId);
    return projects.filter((p) => p.folderId && ids.has(p.folderId)).length;
  }

  function renderFolder(folder: Folder, depth: number): React.ReactNode {
    const isDragging = dragItem?.type === "folder" && dragItem.id === folder.id;
    const isInto = dropHint?.kind === "into" && dropHint.folderId === folder.id;
    const renaming = renamingFolderId === folder.id;
    const open = !folder.collapsed;
    const Icon = open ? FolderOpen : FolderIcon;
    return (
      <div key={folder.id} style={{ opacity: isDragging ? 0.35 : 1 }}>
        <div
          {...dragProps({ type: "folder", id: folder.id })}
          draggable={!renaming}
          onDragOver={(e) => onRowDragOver(e, { type: "folder", id: folder.id })}
          className="relative flex items-center gap-2 h-12 pr-2 border-b cursor-pointer group select-none"
          style={rowStyle(depth, {
            background: isInto ? "var(--surface-raised)" : undefined,
            boxShadow: isInto ? "inset 0 0 0 1px var(--border-mid)" : lineFor("folder", folder.id),
          })}
          onClick={() => !renaming && setCollapsed(folder.id, !folder.collapsed)}
          onMouseEnter={e => { if (!isInto) e.currentTarget.style.background = "var(--surface)"; }}
          onMouseLeave={e => { if (!isInto) e.currentTarget.style.background = ""; }}
          aria-expanded={open}
        >
          {guides(depth)}
          <ChevronRight
            size={16}
            className="shrink-0 transition-transform duration-150"
            style={{ color: "var(--text-secondary)", transform: open ? "rotate(90deg)" : "none" }}
            aria-hidden
          />
          <Icon size={16} strokeWidth={1.75} className="shrink-0" style={{ color: "var(--text-mid)" }} aria-hidden />
          {renaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenamingFolderId(null);
              }}
              onBlur={commitRename}
              className="flex-1 min-w-0 ml-1 bg-transparent border-b outline-none text-[14px]"
              style={{ color: "var(--text-primary)", borderColor: "var(--border-mid)", fontFamily: "var(--font-display)" }}
              aria-label="Folder name"
            />
          ) : (
            <span
              className="flex-1 min-w-0 ml-1 truncate text-[14px] font-semibold tracking-[-0.005em]"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename(folder);
              }}
            >
              {folder.name}
            </span>
          )}
          <span
            className="min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] shrink-0"
            style={{ color: "var(--text-mid)", background: "var(--surface-2)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}
            title={`${countProjects(folder.id)} project${countProjects(folder.id) === 1 ? "" : "s"}`}
          >
            {countProjects(folder.id)}
          </span>
          <MoreButton
            label={`Options for folder ${folder.name}`}
            onOpen={(e) => setCtxMenu({ type: "folder", id: folder.id, x: e.clientX, y: e.clientY })}
          />
        </div>
        {open && renderContainer(folder.id, depth + 1)}
      </div>
    );
  }

  function renderContainer(folderId: string | null, depth: number): React.ReactNode {
    const childFolders = folders.filter((f) => f.parentId === folderId).sort(byPosition);
    const childProjects = projects.filter((p) => p.folderId === folderId).sort(byPosition);
    if (folderId && !childFolders.length && !childProjects.length) {
      const isInto = dropHint?.kind === "into" && dropHint.folderId === folderId;
      return (
        <div
          className="relative flex items-center gap-2 h-10 border-b text-[12px] tracking-[0.02em]"
          style={rowStyle(depth, {
            color: "var(--text-secondary)",
            background: isInto ? "var(--surface-raised)" : undefined,
          })}
          onDragOver={(e) => {
            if (!dragItem) return;
            e.preventDefault();
            e.stopPropagation();
            const hint: DropHint = { kind: "into", folderId };
            if (dragItem.type === "folder" && !canDropFolderInto(dragItem.id, folderId)) return;
            if (JSON.stringify(hint) !== JSON.stringify(dropHint)) setDropHint(hint);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDrop();
          }}
        >
          {guides(depth)}
          <span className="w-4 shrink-0" aria-hidden />
          <span className="w-4 shrink-0" aria-hidden />
          <span className="ml-1 italic opacity-70">Empty. Drag projects here</span>
        </div>
      );
    }
    return (
      <>
        {childFolders.map((folder) => renderFolder(folder, depth))}
        {childProjects.map((project) => renderProject(project, depth))}
      </>
    );
  }

  const ctxFolder = ctxMenu?.type === "folder" ? folders.find((f) => f.id === ctxMenu.id) : null;
  const menuItemClass = "block w-full text-left px-3 py-2 text-[12px] tracking-[0.03em] transition-colors";

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
      onClick={() => setCtxMenu(null)}
    >
      <div className="max-w-185 mx-auto px-8 py-13">

        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1
              className="text-[22px] font-semibold tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Projects
            </h1>
            {!loading && projects.length > 0 && (
              <p className="text-[11px] tracking-[0.03em] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {projects.length} project{projects.length !== 1 ? "s" : ""}
                {folders.length > 0 ? ` · ${folders.length} folder${folders.length !== 1 ? "s" : ""}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => createFolder(null)}
              className="flex items-center gap-2 h-9 text-[12px] tracking-[0.04em] px-3.5 rounded-[7px] border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", fontFamily: "var(--font-mono)", background: "none" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-mid)"; }}
            >
              <FolderPlus size={15} strokeWidth={1.75} /> Folder
            </button>
            <button
              onClick={() => openCreate()}
              className="flex items-center gap-2 h-9 text-[12px] tracking-[0.04em] px-4 rounded-[7px] transition-opacity hover:opacity-80"
              style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)" }}
            >
              <Plus size={15} strokeWidth={2} /> New Project
            </button>
          </div>
        </div>

        {/* Project list */}
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full animate-pulse"
                  style={{ background: "var(--border-mid)", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        ) : projects.length === 0 && folders.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-lg border flex items-center justify-center mb-1" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: 16 }}>◫</span>
            </div>
            <p className="text-[13px] tracking-[0.01em]" style={{ color: "var(--text-secondary)" }}>No projects yet</p>
            <button
              onClick={() => openCreate()}
              className="text-[11px] tracking-[0.04em] px-3.5 py-1.5 rounded-md border transition-colors mt-1"
              style={{ borderColor: "var(--border-mid)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", background: "none" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-mid)")}
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Section label */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-[9px] tracking-[0.14em] uppercase" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                All Projects
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            {renderContainer(null, 0)}

            {/* Top-level drop zone, shown while dragging */}
            {dragItem && (
              <div
                className="mt-3 py-3 rounded-lg border border-dashed text-center text-[11px] tracking-[0.03em]"
                style={{
                  borderColor: dropHint?.kind === "into" && dropHint.folderId === null ? "var(--border-hi)" : "var(--border)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                  background: dropHint?.kind === "into" && dropHint.folderId === null ? "var(--surface)" : "none",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!(dropHint?.kind === "into" && dropHint.folderId === null)) {
                    setDropHint({ kind: "into", folderId: null });
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop();
                }}
              >
                Drop here to move out of all folders
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 rounded-lg border py-1.5 min-w-35"
          style={{
            top: ctxMenu.y + 4, left: Math.min(ctxMenu.x, window.innerWidth - 180),
            background: "var(--surface)", borderColor: "var(--border-mid)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {ctxMenu.type === "project" ? (
            <>
              <button
                onClick={() => { setCtxMenu(null); openEdit(ctxMenu.id); }}
                className={menuItemClass}
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                Edit
              </button>
              <div className="h-px my-1" style={{ background: "var(--border)" }} />
              <button
                onClick={() => deleteProject(ctxMenu.id)}
                className={menuItemClass}
                style={{ color: "rgba(217,107,107,0.8)", fontFamily: "var(--font-mono)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,107,107,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                Delete
              </button>
            </>
          ) : ctxFolder ? (
            <>
              {[
                { label: "New project here", action: () => { setCtxMenu(null); openCreate(ctxFolder.id); } },
                { label: "New subfolder", action: () => createFolder(ctxFolder.id) },
                { label: "Rename", action: () => startRename(ctxFolder) },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={menuItemClass}
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {item.label}
                </button>
              ))}
              <div className="h-px my-1" style={{ background: "var(--border)" }} />
              <button
                onClick={() => deleteFolder(ctxFolder.id)}
                className={menuItemClass}
                style={{ color: "rgba(217,107,107,0.8)", fontFamily: "var(--font-mono)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,107,107,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                title="Projects and subfolders inside move up a level"
              >
                Delete folder
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-100 rounded-xl border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border-mid)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5.5 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
              <span
                className="text-[15px] font-semibold tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                {editingId !== null ? "Edit Project" : "New Project"}
              </span>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-[5px] text-[18px] transition-colors"
                style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
              >
                ×
              </button>
            </div>

            <div className="px-5.5 py-5 flex flex-col gap-5">
              <div>
                <label className="block text-[10px] tracking-widest uppercase mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>Name</label>
                <input
                  autoFocus
                  value={fName}
                  onChange={e => setFName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveProject()}
                  placeholder="Project name"
                  className="w-full rounded-[7px] border px-3 py-2.5 text-[14px] outline-none transition-colors"
                  style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>Folder</label>
                <select
                  value={fFolderId}
                  onChange={e => setFFolderId(e.target.value)}
                  className="w-full rounded-[7px] border px-3 py-2.5 text-[13px] outline-none"
                  style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                >
                  <option value="">No folder</option>
                  {folderOptions().map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>Color</label>
                <div className="flex gap-2.5 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className="w-6 h-6 rounded-full transition-all hover:scale-110"
                      style={{
                        background: c,
                        outline: c === selectedColor ? `2px solid ${c}` : "none",
                        outlineOffset: 2,
                        opacity: c === selectedColor ? 1 : 0.55,
                        border: "none",
                      }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5.5 pb-5">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-[12px] tracking-[0.03em] rounded-[7px] border transition-colors"
                style={{ color: "var(--text-mid)", borderColor: "var(--border)", fontFamily: "var(--font-mono)", background: "none" }}
                onMouseEnter={e => { (e.currentTarget.style.borderColor = "var(--border-hi)"); (e.currentTarget.style.color = "var(--text-primary)"); }}
                onMouseLeave={e => { (e.currentTarget.style.borderColor = "var(--border)"); (e.currentTarget.style.color = "var(--text-mid)"); }}
              >
                Cancel
              </button>
              <button
                onClick={saveProject}
                className="px-5 py-2 text-[12px] tracking-[0.03em] font-medium rounded-[7px] transition-opacity hover:opacity-80"
                style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)", border: "none" }}
              >
                {editingId !== null ? "Save Changes" : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
