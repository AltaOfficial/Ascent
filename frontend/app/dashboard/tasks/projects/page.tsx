"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COLORS = [
  "#d96b6b", "#d9896b", "#d9c46b",
  "#6bbb8a", "#6b9ed9", "#7b6ef6",
  "#c47fd4", "#d9d9d9", "#888890",
];

type Project = {
  id: number;
  name: string;
  color: string;
  category: string;
  desc: string;
  tasks: number;
  done: number;
  lastActive: string;
};

const CATEGORIES = ["School", "SaaS", "Skills", "Revenue", "Personal", "Other"];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [nextId, setNextId] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[4]);
  const [ctxMenu, setCtxMenu] = useState<{ id: number; x: number; y: number } | null>(null);

  const [fName, setFName] = useState("");
  const [fCategory, setFCategory] = useState("Other");
  const [fDesc, setFDesc] = useState("");

  function openCreate() {
    setEditingId(null);
    setSelectedColor(COLORS[4]);
    setFName(""); setFCategory("Other"); setFDesc("");
    setModalOpen(true);
  }

  function openEdit(id: number) {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    setEditingId(id);
    setSelectedColor(p.color);
    setFName(p.name); setFCategory(p.category); setFDesc(p.desc);
    setModalOpen(true);
  }

  function saveProject() {
    if (!fName.trim()) return;
    if (editingId !== null) {
      setProjects(ps => ps.map(p =>
        p.id === editingId ? { ...p, name: fName.trim(), color: selectedColor, category: fCategory, desc: fDesc.trim() } : p
      ));
    } else {
      setProjects(ps => [...ps, {
        id: nextId, name: fName.trim(), color: selectedColor,
        category: fCategory, desc: fDesc.trim(), tasks: 0, done: 0, lastActive: "Just now",
      }]);
      setNextId(n => n + 1);
    }
    setModalOpen(false);
  }

  function deleteProject(id: number) {
    setProjects(ps => ps.filter(p => p.id !== id));
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
        <div className="flex justify-between items-end mb-10">
          <h1
            className="text-[22px] font-semibold tracking-[-0.03em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Projects
          </h1>
          <button
            onClick={openCreate}
            className="text-[13px] font-medium px-4 py-2 rounded-[7px] transition-opacity hover:opacity-80"
            style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)" }}
          >
            + New Project
          </button>
        </div>

        {/* Column headers */}
        <div
          className="flex items-center gap-3.5 pb-3 border-b mb-0 px-2"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="w-3 shrink-0" />
          <span className="flex-1 text-[11px] tracking-[0.06em] uppercase" style={{ color: "var(--text-secondary)" }}>Name</span>
          <div className="flex items-center gap-5 shrink-0 pr-8">
            <span className="text-[11px] tracking-[0.06em] uppercase hidden sm:block w-20 text-right" style={{ color: "var(--text-secondary)" }}>Category</span>
            <span className="text-[11px] tracking-[0.06em] uppercase hidden md:block w-16 text-right" style={{ color: "var(--text-secondary)" }}>Tasks</span>
            <span className="text-[11px] tracking-[0.06em] uppercase hidden md:block w-24 text-right" style={{ color: "var(--text-secondary)" }}>Progress</span>
            <span className="text-[11px] tracking-[0.06em] uppercase hidden lg:block w-20 text-right" style={{ color: "var(--text-secondary)" }}>Last active</span>
          </div>
        </div>

        {/* Project rows */}
        {projects.length === 0 ? (
          <div className="py-16 text-center opacity-30">
            <p className="text-[14px] tracking-[0.04em]" style={{ color: "var(--text-secondary)" }}>No projects yet.</p>
          </div>
        ) : (
          <div>
            {projects.map(p => {
              const pct = p.tasks ? Math.round((p.done / p.tasks) * 100) : 0;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3.5 border-b py-4 rounded-md -mx-2 px-2 cursor-pointer transition-colors group"
                  style={{ borderColor: "var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  onClick={() => router.push(`/dashboard/tasks/projects/${p.id}`)}
                >
                  {/* color dot */}
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />

                  {/* name */}
                  <span
                    className="flex-1 min-w-0 text-[14px] tracking-[0.01em] truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {p.name}
                  </span>

                  {/* meta */}
                  <div className="flex items-center gap-5 shrink-0">
                    <span className="text-[13px] tracking-[0.02em] hidden sm:block w-20 text-right" style={{ color: "var(--text-mid)" }}>
                      {p.category}
                    </span>
                    <span className="text-[13px] tracking-[0.02em] hidden md:block w-16 text-right" style={{ color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--text-mid)" }}>{p.done}</span>/{p.tasks}
                    </span>
                    <div className="hidden md:flex items-center gap-2 w-24 justify-end">
                      <div className="w-[72px] h-px rounded overflow-hidden" style={{ background: "var(--border)" }}>
                        <div className="h-full rounded opacity-60" style={{ width: `${pct}%`, background: p.color }} />
                      </div>
                      <span className="text-[13px] w-7 text-right" style={{ color: "var(--text-secondary)" }}>{pct}%</span>
                    </div>
                    <span className="text-[13px] tracking-[0.02em] hidden lg:block w-20 text-right" style={{ color: "var(--text-secondary)" }}>
                      {p.lastActive}
                    </span>
                  </div>

                  {/* more button */}
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded-[5px] text-[18px] transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                      onClick={e => {
                        e.stopPropagation();
                        setCtxMenu({ id: p.id, x: e.clientX, y: e.clientY });
                      }}
                      title="More"
                    >
                      ⋯
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 rounded-[8px] border py-1.5 min-w-[140px]"
          style={{
            top: ctxMenu.y + 4, left: Math.min(ctxMenu.x, window.innerWidth - 160),
            background: "var(--surface)", borderColor: "var(--border-mid)",
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setCtxMenu(null); openEdit(ctxMenu.id); }}
            className="block w-full text-left px-3 py-2 text-[13px] tracking-[0.02em] rounded-[5px] transition-colors"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            Edit
          </button>
          <div className="h-px my-1" style={{ background: "var(--border)" }} />
          <button
            onClick={() => deleteProject(ctxMenu.id)}
            className="block w-full text-left px-3 py-2 text-[13px] tracking-[0.02em] rounded-[5px] transition-colors"
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-[400px] rounded-[12px] border"
            style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
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
                style={{ color: "var(--text-secondary)" }}
              >
                ×
              </button>
            </div>

            <div className="px-5.5 py-5 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] tracking-[0.08em] uppercase mb-1.5" style={{ color: "var(--text-secondary)" }}>Name</label>
                <input
                  autoFocus
                  value={fName}
                  onChange={e => setFName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveProject()}
                  placeholder="Project name"
                  className="w-full rounded-[7px] border px-3 py-2.25 text-[14px] outline-none transition-colors"
                  style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.08em] uppercase mb-1.5" style={{ color: "var(--text-secondary)" }}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: c, borderColor: c === selectedColor ? "rgba(255,255,255,0.5)" : "transparent" }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.08em] uppercase mb-1.5" style={{ color: "var(--text-secondary)" }}>Category</label>
                <select
                  value={fCategory}
                  onChange={e => setFCategory(e.target.value)}
                  className="w-full rounded-[7px] border px-3 py-2.25 text-[14px] outline-none transition-colors"
                  style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.08em] uppercase mb-1.5" style={{ color: "var(--text-secondary)" }}>Description (optional)</label>
                <textarea
                  value={fDesc}
                  onChange={e => setFDesc(e.target.value)}
                  placeholder="What is this project about?"
                  rows={3}
                  className="w-full rounded-[7px] border px-3 py-2.25 text-[14px] outline-none resize-none leading-relaxed transition-colors"
                  style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5.5 pb-5">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-[13px] rounded-[7px] border transition-colors"
                style={{ color: "var(--text-mid)", borderColor: "var(--border)", fontFamily: "var(--font-mono)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
              >
                Cancel
              </button>
              <button
                onClick={saveProject}
                className="px-5 py-2 text-[13px] font-medium rounded-[7px] transition-opacity hover:opacity-80"
                style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)" }}
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
