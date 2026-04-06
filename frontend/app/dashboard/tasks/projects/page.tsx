"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const COLORS = [
  "#d96b6b", "#d9896b", "#d9c46b",
  "#6bbb8a", "#6b9ed9", "#7b6ef6",
  "#c47fd4", "#d9d9d9", "#888890",
];

const CATEGORY_COLORS: Record<string, string> = {
  School:   "#6b9ed9",
  SaaS:     "#7b6ef6",
  Skills:   "#6bbb8a",
  Revenue:  "#d9c46b",
  Personal: "#c47fd4",
  Other:    "#888890",
};

type Project = {
  id: string;
  name: string;
  color: string | null;
  categoryTag: string | null;
  viewType: string;
};

const CATEGORIES = ["School", "SaaS", "Skills", "Revenue", "Personal", "Other"];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[4]);
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const [fName, setFName] = useState("");
  const [fCategory, setFCategory] = useState("Other");

  useEffect(() => {
    apiFetch<Project[]>("/projects")
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingId(null);
    setSelectedColor(COLORS[4]);
    setFName(""); setFCategory("Other");
    setModalOpen(true);
  }

  function openEdit(id: string) {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    setEditingId(id);
    setSelectedColor(p.color ?? COLORS[4]);
    setFName(p.name); setFCategory(p.categoryTag ?? "Other");
    setModalOpen(true);
  }

  async function saveProject() {
    if (!fName.trim()) return;
    try {
      if (editingId !== null) {
        const updated = await apiFetch<Project>(`/projects/${editingId}/update`, {
          method: "POST",
          body: JSON.stringify({ name: fName.trim(), color: selectedColor, categoryTag: fCategory }),
        });
        setProjects(ps => ps.map(p => p.id === editingId ? updated : p));
      } else {
        const created = await apiFetch<Project>("/projects", {
          method: "POST",
          body: JSON.stringify({ name: fName.trim(), color: selectedColor, categoryTag: fCategory }),
        });
        setProjects(ps => [...ps, created]);
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
              </p>
            )}
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 text-[12px] tracking-[0.04em] px-4 py-2 rounded-[7px] transition-opacity hover:opacity-80"
            style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)" }}
          >
            <span className="text-[15px] leading-none">+</span> New Project
          </button>
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
        ) : projects.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-lg border flex items-center justify-center mb-1" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: 16 }}>◫</span>
            </div>
            <p className="text-[13px] tracking-[0.01em]" style={{ color: "var(--text-secondary)" }}>No projects yet</p>
            <button
              onClick={openCreate}
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

            {projects.map(p => {
              const catColor = CATEGORY_COLORS[p.categoryTag ?? ""] ?? "var(--text-secondary)";
              return (
                <div
                  key={p.id}
                  className="relative flex items-center gap-4 py-3.5 border-b cursor-pointer group"
                  style={{ borderColor: "var(--border)" }}
                  onClick={() => router.push(`/dashboard/tasks/projects/${p.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Left color accent */}
                  <div
                    className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: p.color ?? "var(--border-mid)" }}
                  />

                  {/* Color dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 ml-3 transition-transform group-hover:scale-110"
                    style={{ background: p.color ?? "var(--border-mid)" }}
                  />

                  {/* Name */}
                  <span
                    className="flex-1 min-w-0 text-[14px] tracking-[0.005em] truncate"
                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                  >
                    {p.name}
                  </span>

                  {/* Category badge */}
                  {p.categoryTag && (
                    <span
                      className="text-[9px] tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm shrink-0 hidden sm:inline"
                      style={{
                        background: catColor + "18",
                        color: catColor,
                        fontFamily: "var(--font-mono)",
                        border: `1px solid ${catColor}28`,
                      }}
                    >
                      {p.categoryTag}
                    </span>
                  )}

                  {/* More button */}
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-[5px] text-[16px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-raised)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    onClick={e => {
                      e.stopPropagation();
                      setCtxMenu({ id: p.id, x: e.clientX, y: e.clientY });
                    }}
                    title="More"
                  >
                    ⋯
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 rounded-lg border py-1.5 min-w-35"
          style={{
            top: ctxMenu.y + 4, left: Math.min(ctxMenu.x, window.innerWidth - 160),
            background: "var(--surface)", borderColor: "var(--border-mid)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setCtxMenu(null); openEdit(ctxMenu.id); }}
            className="block w-full text-left px-3 py-2 text-[12px] tracking-[0.03em] transition-colors"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            Edit
          </button>
          <div className="h-px my-1" style={{ background: "var(--border)" }} />
          <button
            onClick={() => deleteProject(ctxMenu.id)}
            className="block w-full text-left px-3 py-2 text-[12px] tracking-[0.03em] transition-colors"
            style={{ color: "rgba(217,107,107,0.8)", fontFamily: "var(--font-mono)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,107,107,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            Delete
          </button>
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
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>Category</label>
                <select
                  value={fCategory}
                  onChange={e => setFCategory(e.target.value)}
                  className="w-full rounded-[7px] border px-3 py-2.5 text-[13px] outline-none transition-colors"
                  style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
