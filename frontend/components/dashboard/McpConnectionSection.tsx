"use client";

import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="flex items-start gap-2 rounded-md border px-3 py-2"
      style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
    >
      <code
        className="flex-1 min-w-0 text-[11px] leading-relaxed break-all"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
      >
        {text}
      </code>
      <button
        onClick={() => {
          navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="shrink-0 text-[10px] px-2 py-0.5 rounded border"
        style={{ borderColor: "var(--border-mid)", color: copied ? "rgba(107,187,138,0.9)" : "var(--text-mid)", background: "none", fontFamily: "var(--font-mono)" }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/** How to connect Claude to the Ascent MCP server (OAuth sign-in with Ascent). */
export function McpConnectionSection() {
  const mcpUrl = `${API_BASE_URL.replace(/\/$/, "")}/mcp`;
  const hint = { color: "var(--text-secondary)", fontFamily: "var(--font-mono)" };
  return (
    <section
      className="rounded-xl border p-5 flex flex-col gap-3"
      style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
    >
      <div className="text-[9px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
        Ascent MCP
      </div>
      <p className="text-[11px] leading-relaxed" style={hint}>
        Let Claude read and update your tasks, timers, compliance and stats. There are no delete tools.
        Claude will ask you to sign in with your Ascent account.
      </p>
      <p className="text-[11px]" style={hint}>
        <span style={{ color: "var(--text-mid)" }}>Claude app / claude.ai:</span> add a custom connector with this URL
      </p>
      <CopyBlock text={mcpUrl} />
      <p className="text-[11px]" style={hint}>
        <span style={{ color: "var(--text-mid)" }}>Claude Code:</span>
      </p>
      <CopyBlock text={`claude mcp add --transport http ascent ${mcpUrl}`} />
    </section>
  );
}
