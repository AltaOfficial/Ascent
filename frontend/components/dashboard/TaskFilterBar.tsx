"use client";

export type FilterMode = "all" | "done";
export type SortKey = "due" | "priority" | "created";

export function TaskFilterBar({
  filterMode,
  onFilterChange,
  sortKey,
  onSortChange,
}: {
  filterMode: FilterMode;
  onFilterChange: (mode: FilterMode) => void;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 pb-3.5 border-b flex-wrap"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex gap-1">
        {(["all", "done"] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onFilterChange(mode)}
            className="text-[10px] tracking-[0.05em] px-3 py-1 rounded-full border transition-colors"
            style={{
              borderColor: filterMode === mode ? "rgba(255,255,255,0.22)" : "var(--border)",
              color: filterMode === mode ? "var(--text-primary)" : "var(--text-secondary)",
              background: filterMode === mode ? "var(--surface-2)" : "transparent",
              fontFamily: "var(--font-mono)",
            }}
          >
            {mode === "all" ? "All" : "Done"}
          </button>
        ))}
      </div>

      <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />

      <span className="text-[10px] tracking-[0.06em] uppercase" style={{ color: "var(--text-secondary)" }}>
        Sort:
      </span>
      <select
        value={sortKey}
        onChange={(e) => onSortChange(e.target.value as SortKey)}
        className="bg-transparent border-none outline-none text-[10px] tracking-[0.04em]"
        style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
      >
        <option value="due">Due date</option>
        <option value="priority">Priority</option>
        <option value="created">Created</option>
      </select>
    </div>
  );
}
