"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tree, type NodeApi, type NodeRendererProps, type TreeApi } from "react-arborist";
import {
  ChevronRight,
  Ellipsis,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  Plus,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { SelectField } from "@/components/ui/select";

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

// Tree rows for react-arborist: folders have children, projects are leaves
type TreeRow =
  | { id: string; kind: "folder"; folder: Folder; children: TreeRow[] }
  | { id: string; kind: "project"; project: Project };

const folderRowId = (id: string) => `f:${id}`;
const projectRowId = (id: string) => `p:${id}`;
const ROW_HEIGHT = 48;

type CtxMenu =
  | { type: "project"; id: string; x: number; y: number }
  | { type: "folder"; id: string; x: number; y: number };

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

  const treeRef = useRef<TreeApi<TreeRow> | null>(null);
  // Folder to put into rename mode once the tree has rendered it
  const pendingRenameRef = useRef<string | null>(null);

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

  // Runs after every render: a new folder only exists in the tree after its row renders
  useEffect(() => {
    const id = pendingRenameRef.current;
    const node = id ? treeRef.current?.get(folderRowId(id)) : null;
    if (node) {
      pendingRenameRef.current = null;
      node.edit();
    }
  });

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
      pendingRenameRef.current = created.id;
    } catch {}
  }

  function startRename(folder: Folder) {
    pendingRenameRef.current = folder.id;
    setCtxMenu(null);
  }

  async function renameFolder(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
    try {
      await apiFetch(`/project-folders/${id}/update`, {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
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

  // ── Tree (react-arborist) ─────────────────────────────────────────────

  function buildRows(parentId: string | null): TreeRow[] {
    return [
      ...folders
        .filter((f) => f.parentId === parentId)
        .sort(byPosition)
        .map((folder): TreeRow => ({
          id: folderRowId(folder.id),
          kind: "folder",
          folder,
          children: buildRows(folder.id),
        })),
      ...projects
        .filter((p) => p.folderId === parentId)
        .sort(byPosition)
        .map((project): TreeRow => ({ id: projectRowId(project.id), kind: "project", project })),
    ];
  }

  /** Rows currently on screen, so the virtualised tree can size itself. */
  function visibleRowCount(rows: TreeRow[]): number {
    return rows.reduce(
      (count, row) =>
        count + 1 + (row.kind === "folder" && !row.folder.collapsed ? visibleRowCount(row.children) : 0),
      0,
    );
  }

  async function reload() {
    const [projectList, folderList] = await Promise.all([
      apiFetch<Project[]>("/projects"),
      apiFetch<Folder[]>("/project-folders"),
    ]);
    setProjects(projectList);
    setFolders(folderList);
  }

  /**
   * react-arborist reports the new parent and index among all of that parent's
   * children (folders first, then projects). Turn that into the ordered list
   * for whichever kind moved and save it.
   */
  async function handleMove({
    dragNodes,
    parentNode,
    index,
  }: {
    dragNodes: NodeApi<TreeRow>[];
    parentNode: NodeApi<TreeRow> | null;
    index: number;
  }) {
    const moved = dragNodes[0]?.data;
    if (!moved) return;
    const parentId = parentNode?.data.kind === "folder" ? parentNode.data.folder.id : null;
    const siblings = (parentNode ? parentNode.children : treeRef.current?.root.children) ?? [];
    const before = siblings.slice(0, index).filter((n) => n.data.kind === moved.kind && n.id !== moved.id).length;
    try {
      if (moved.kind === "project") {
        const ids = projects
          .filter((p) => p.folderId === parentId && p.id !== moved.project.id)
          .sort(byPosition)
          .map((p) => p.id);
        ids.splice(before, 0, moved.project.id);
        await apiFetch("/projects/arrange", {
          method: "POST",
          body: JSON.stringify({ folderId: parentId, projectIds: ids }),
        });
      } else {
        const ids = folders
          .filter((f) => f.parentId === parentId && f.id !== moved.folder.id)
          .sort(byPosition)
          .map((f) => f.id);
        ids.splice(before, 0, moved.folder.id);
        await apiFetch("/project-folders/arrange", {
          method: "POST",
          body: JSON.stringify({ parentId, folderIds: ids }),
        });
      }
      if (parentId) expandFolder(parentId);
    } catch {}
    await reload().catch(() => {});
  }

  function countProjects(folderId: string): number {
    const ids = subtreeIds(folders, folderId);
    return projects.filter((p) => p.folderId && ids.has(p.folderId)).length;
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

  function Row({ node, style, dragHandle }: NodeRendererProps<TreeRow>) {
    const row = node.data;
    const highlight = node.willReceiveDrop;
    return (
      <div
        ref={dragHandle}
        style={{
          ...style,
          borderColor: "var(--border)",
          background: highlight ? "var(--surface-raised)" : undefined,
          boxShadow: highlight ? "inset 0 0 0 1px var(--border-mid)" : undefined,
          opacity: node.isDragging ? 0.35 : 1,
        }}
        className="relative flex items-center gap-2 h-12 pr-2 border-b cursor-pointer group select-none"
        onClick={() => (row.kind === "folder" ? node.toggle() : router.push(`/dashboard/tasks/projects/${row.project.id}`))}
        onMouseEnter={e => { if (!highlight) e.currentTarget.style.background = "var(--surface)"; }}
        onMouseLeave={e => { if (!highlight) e.currentTarget.style.background = ""; }}
      >
        {row.kind === "folder" ? (
          <>
            <ChevronRight
              size={16}
              className="shrink-0 transition-transform duration-150"
              style={{ color: "var(--text-secondary)", transform: node.isOpen ? "rotate(90deg)" : "none" }}
              aria-hidden
            />
            {node.isOpen ? (
              <FolderOpen size={16} strokeWidth={1.75} className="shrink-0" style={{ color: "var(--text-mid)" }} aria-hidden />
            ) : (
              <FolderIcon size={16} strokeWidth={1.75} className="shrink-0" style={{ color: "var(--text-mid)" }} aria-hidden />
            )}
            {node.isEditing ? (
              <input
                autoFocus
                defaultValue={row.folder.name}
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => node.submit(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") node.submit(e.currentTarget.value);
                  if (e.key === "Escape") node.reset();
                }}
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
                  node.edit();
                }}
              >
                {row.folder.name}
              </span>
            )}
            <span
              className="min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] shrink-0"
              style={{ color: "var(--text-mid)", background: "var(--surface-2)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}
            >
              {countProjects(row.folder.id)}
            </span>
            <MoreButton
              label={`Options for folder ${row.folder.name}`}
              onOpen={(e) => setCtxMenu({ type: "folder", id: row.folder.id, x: e.clientX, y: e.clientY })}
            />
          </>
        ) : (
          <>
            {/* chevron column stays empty so names line up with folder names */}
            <span className="w-4 shrink-0" aria-hidden />
            <span className="w-4 h-4 shrink-0 flex items-center justify-center" aria-hidden>
              <span
                className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-110"
                style={{ background: row.project.color ?? "var(--border-mid)" }}
              />
            </span>
            <span
              className="flex-1 min-w-0 ml-1 text-[14px] tracking-[0.005em] truncate"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            >
              {row.project.name}
            </span>
            <MoreButton
              label={`More options for ${row.project.name}`}
              onOpen={(e) => setCtxMenu({ type: "project", id: row.project.id, x: e.clientX, y: e.clientY })}
            />
          </>
        )}
      </div>
    );
  }

  const rows = buildRows(null);

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

            <Tree<TreeRow>
              ref={treeRef}
              data={rows}
              width="100%"
              height={Math.max(1, visibleRowCount(rows)) * ROW_HEIGHT}
              rowHeight={ROW_HEIGHT}
              indent={24}
              paddingBottom={0}
              openByDefault={false}
              initialOpenState={Object.fromEntries(folders.map((f) => [folderRowId(f.id), !f.collapsed]))}
              disableMultiSelection
              disableEdit={(row) => row.kind !== "folder"}
              disableDrop={({ parentNode }) => parentNode?.data?.kind === "project"}
              onMove={handleMove}
              onRename={({ node, name }) => {
                if (node.data.kind === "folder") return renameFolder(node.data.folder.id, name);
              }}
              onToggle={(id) => {
                const folder = folders.find((f) => folderRowId(f.id) === id);
                if (folder) setCollapsed(folder.id, !folder.collapsed);
              }}
            >
              {Row}
            </Tree>
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
              <button
                onClick={() => { setCtxMenu(null); openCreate(ctxFolder.id); }}
                className={menuItemClass}
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                New project here
              </button>
              <button
                onClick={() => createFolder(ctxFolder.id)}
                className={menuItemClass}
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                New subfolder
              </button>
              <button
                onClick={() => startRename(ctxFolder)}
                className={menuItemClass}
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                Rename
              </button>
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
                <SelectField
                  value={fFolderId}
                  onChange={(value) => setFFolderId(value)}
                  className="w-full rounded-[7px] border px-3 py-2.5 text-[13px] outline-none"
                  style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                >
                  <option value="">No folder</option>
                  {folderOptions().map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </SelectField>
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
