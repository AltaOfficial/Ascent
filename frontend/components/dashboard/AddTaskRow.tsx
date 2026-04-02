"use client";

import { RefObject } from "react";

export function AddTaskRow({
  inputRef,
  value,
  focused,
  onChange,
  onFocus,
  onBlur,
  onAdd,
  onCancel,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  focused: boolean;
  onChange: (title: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onAdd: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="flex items-center border-b min-h-11.5"
      style={{ borderColor: "var(--border)", background: focused ? "var(--surface-2)" : "transparent" }}
    >
      <div className="w-9 shrink-0 flex items-center justify-center">
        <div className="w-3.5 h-3.5 border rounded-[3px]" style={{ borderColor: "var(--border)" }} />
      </div>
      <input
        ref={inputRef}
        className="flex-1 bg-transparent border-none outline-none text-[12px] tracking-[0.01em] pr-3"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
        placeholder="+ Add a task..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") onAdd();
          if (e.key === "Escape") { onCancel(); (e.target as HTMLInputElement).blur(); }
        }}
      />
      {focused && (
        <div className="flex items-center gap-1.5 pr-2">
          <button
            onClick={onCancel}
            className="text-[10px] px-2.5 py-1 rounded-[5px] border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
          >
            Cancel
          </button>
          <button
            onClick={onAdd}
            className="text-[10px] px-2.5 py-1 rounded-[5px] transition-opacity"
            style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)" }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
