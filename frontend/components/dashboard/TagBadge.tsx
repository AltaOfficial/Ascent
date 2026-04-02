import React from "react";

export function TagBadge({ tag, color }: { tag: string; color?: string }) {
  const style: React.CSSProperties = color
    ? { background: color + "22", color: color }
    : { background: "rgba(200,200,210,0.1)", color: "var(--text-mid)" };

  return (
    <span
      className="text-[9px] tracking-[0.06em] uppercase px-1.5 py-0.5 rounded-[3px] font-medium shrink-0"
      style={style}
    >
      {tag}
    </span>
  );
}
