"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { KeyRound } from "lucide-react";
import { apiFetch } from "@/lib/api";

type ApiToken = {
  id: string;
  name: string;
  preview: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const fieldStyle: React.CSSProperties = {
  background: "var(--surface-2)",
  borderColor: "var(--border)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)",
};

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

/** Personal API tokens for the Ascent MCP server. */
export function ApiTokensSection() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ApiToken[]>("/api-tokens").then(setTokens).catch(() => {});
  }, []);

  async function createToken() {
    setCreating(true);
    try {
      const created = await apiFetch<ApiToken & { token: string }>("/api-tokens", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() || "Claude" }),
      });
      setNewToken(created.token);
      setTokens((prev) => [created, ...prev]);
      setName("");
    } catch {}
    setCreating(false);
  }

  async function revokeToken(id: string) {
    if (!window.confirm("Revoke this token? Anything using it will stop working.")) return;
    try {
      await apiFetch(`/api-tokens/${id}/revoke`, { method: "POST" });
      setTokens((prev) =>
        prev.map((t) => (t.id === id ? { ...t, revokedAt: new Date().toISOString() } : t)),
      );
    } catch {}
  }

  const mcpUrl = `${API_BASE_URL.replace(/\/$/, "")}/mcp`;
  const activeTokens = tokens.filter((t) => !t.revokedAt);

  return (
    <section
      className="rounded-xl border p-5"
      style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
    >
      <div className="text-[9px] tracking-[0.08em] uppercase mb-1" style={{ color: "var(--text-secondary)" }}>
        Ascent MCP
      </div>
      <p className="text-[11px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
        Let Claude (or any MCP client) read and update your tasks, timers, compliance and stats.
        Create a token, then add the server with the command shown. There are no delete tools.
      </p>

      {newToken && (
        <div className="flex flex-col gap-2 mb-4 p-3 rounded-lg border" style={{ borderColor: "rgba(107,187,138,0.35)", background: "rgba(107,187,138,0.05)" }}>
          <div className="text-[11px]" style={{ color: "rgba(107,187,138,0.9)", fontFamily: "var(--font-mono)" }}>
            Copy this token now. It won&apos;t be shown again.
          </div>
          <CopyBlock text={newToken} />
          <div className="text-[10px] mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            Claude Code:
          </div>
          <CopyBlock
            text={`claude mcp add --transport http ascent ${mcpUrl} --header "Authorization: Bearer ${newToken}"`}
          />
          <button
            onClick={() => setNewToken(null)}
            className="self-end text-[10px] px-2 py-0.5"
            style={{ color: "var(--text-secondary)", background: "none", border: "none", fontFamily: "var(--font-mono)" }}
          >
            Done
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createToken()}
          placeholder="Token name, e.g. Claude Code laptop"
          className="flex-1 h-8 rounded-md border px-2.5 text-[11px] outline-none"
          style={fieldStyle}
        />
        <button
          onClick={createToken}
          disabled={creating}
          className="h-8 flex items-center gap-1.5 text-[11px] font-medium px-4 rounded-md disabled:opacity-50"
          style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)", border: "none" }}
        >
          <KeyRound size={13} />
          {creating ? "Creating…" : "Create token"}
        </button>
      </div>

      {activeTokens.length === 0 ? (
        <div className="text-[11px]" style={{ color: "var(--text-secondary)", opacity: 0.6, fontFamily: "var(--font-mono)" }}>
          No active tokens.
        </div>
      ) : (
        <div className="flex flex-col">
          {activeTokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center gap-3 py-2 border-t text-[11px]"
              style={{ borderColor: "var(--border)", fontFamily: "var(--font-mono)" }}
            >
              <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text-primary)" }}>
                {token.name}
              </span>
              <span style={{ color: "var(--text-secondary)" }}>{token.preview}…</span>
              <span className="w-32 text-right" style={{ color: "var(--text-secondary)" }}>
                {token.lastUsedAt
                  ? `used ${formatDistanceToNow(new Date(token.lastUsedAt), { addSuffix: true })}`
                  : "never used"}
              </span>
              <button
                onClick={() => revokeToken(token.id)}
                className="text-[10px] px-2 py-0.5 rounded border"
                style={{ borderColor: "rgba(217,107,107,0.25)", color: "rgba(217,107,107,0.75)", background: "none" }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
