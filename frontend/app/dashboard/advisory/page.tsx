"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type Role = "user" | "assistant";
type Message = { role: Role; content: string };
type Thread = { id: number; name: string; messages: Message[] };

type Memory = {
  stage: string;
  priority: string;
  projects: string;
  bottleneck: string;
  constraints: string;
  avgHours: string;
  highValuePct: string;
};

// ── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_THREADS: Thread[] = [
  { id: 0, name: "General Strategy", messages: [] },
  { id: 1, name: "SaaS – Ascent", messages: [] },
  { id: 2, name: "School Planning", messages: [] },
  { id: 3, name: "Engineering Growth", messages: [] },
];

const HINTS: Record<string, string[]> = {
  "General Strategy":    ["Am I allocating correctly?", "What should I focus on this week?", "What am I lacking?"],
  "SaaS – Ascent":       ["Is this task high leverage?", "What is my bottleneck?", "Am I drifting?"],
  "School Planning":     ["Am I behind?", "How should I prep for exams?", "Is school getting enough time?"],
  "Engineering Growth":  ["Where should I skill up?", "Are my sessions improving?", "Am I building the right things?"],
};

const DEFAULT_MEMORY: Memory = {
  stage: "Pre-revenue",
  priority: "School, SaaS, Fitness",
  projects: "Ascent – pre-revenue, MVP 60%\nReachAI – NestJS backend, no users yet\nStrive – live, 0 revenue",
  bottleneck: "Shipping Ascent MVP, maintaining GPA for OSU transfer",
  constraints: "FedEx shifts Mon/Wed/Fri 6am\nPHYS-1250 exam upcoming\nTransfer to OSU requires GPA improvement",
  avgHours: "3.8h",
  highValuePct: "62%",
};

// ── System prompt builder ──────────────────────────────────────────────────
function buildSystem(memory: Memory, threadName: string) {
  return `You are a private strategic advisor inside a personal operating system called Ascent. You analyze a user's real data — time allocation, task completion, session patterns — and give precise, direct guidance.

PERSONA:
- Direct. Analytical. Context-aware. Slightly challenging.
- Never motivational. Never friendly. Never verbose.
- Short. Surgical. Evidence-based.
- You do not give lists of 5+ items. Identify the most important 1–3 signals.
- You never rewrite strategy aggressively. You nudge, not control.
- You never overreact to 2 bad days.

RESPONSE FORMAT:
- Short paragraphs or 2–3 line observations. No headers. No bullet overload.
- If you list priorities, max 3.
- If you ask a follow-up, ask only one.
- Never pad. Never reassure. Never celebrate.

USER CONTEXT (persistent memory):
- Stage: ${memory.stage}
- Priority order: ${memory.priority}
- Projects: ${memory.projects}
- Current bottleneck: ${memory.bottleneck}
- Constraints: ${memory.constraints}
- 7-day deep work avg: ${memory.avgHours}
- High-value % last 30 days: ${memory.highValuePct}

ACTIVE THREAD: ${threadName}

When evaluating a task for leverage, check: Is the product pre-revenue? Are core features done? Does this move the needle on the declared bottleneck?
When checking allocation, compare against the declared priority order. Flag misalignment without drama.`;
}

const BRIEF_PROMPT = `Generate a weekly strategic brief. Use this format exactly:

WEEKLY REVIEW

Execution:
[1–2 lines on avg hours and consistency]

Allocation:
[1–2 lines on where time went vs declared priorities]

Misalignment:
[1 specific misalignment if any, or "None detected."]

Adjustments:
[2–3 specific, actionable shifts. Not general advice.]

Keep each section to 1–2 lines maximum. No motivation. No praise. Operator tone.`;

// ── Main ───────────────────────────────────────────────────────────────────
export default function AdvisoryPage() {
  const [threads, setThreads] = useState<Thread[]>(DEFAULT_THREADS);
  const [activeId, setActiveId] = useState(0);
  const [memory, setMemory] = useState<Memory>(DEFAULT_MEMORY);
  const [memOpen, setMemOpen] = useState(false);
  const [memDraft, setMemDraft] = useState<Memory>(DEFAULT_MEMORY);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextId, setNextId] = useState(4);
  const [newThreadName, setNewThreadName] = useState("");
  const [addingThread, setAddingThread] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const thread = threads.find(t => t.id === activeId)!;
  const hints = HINTS[thread.name] ?? HINTS["General Strategy"];

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [thread.messages, loading]);

  useEffect(() => {
    if (addingThread) addInputRef.current?.focus();
  }, [addingThread]);

  function autoResize() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  function updateThread(id: number, updater: (t: Thread) => Thread) {
    setThreads(ts => ts.map(t => t.id === id ? updater(t) : t));
  }

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    const userMsg: Message = { role: "user", content: trimmed };
    updateThread(activeId, t => ({ ...t, messages: [...t.messages, userMsg] }));
    setLoading(true);

    try {
      const currentMsgs = [...thread.messages, userMsg];
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystem(memory, thread.name),
          messages: currentMsgs.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply: Message = { role: "assistant", content: data.content ?? "No response." };
      updateThread(activeId, t => ({ ...t, messages: [...t.messages, reply] }));
    } catch {
      updateThread(activeId, t => ({
        ...t,
        messages: [...t.messages, { role: "assistant", content: "Connection error. Check API access." }],
      }));
    } finally {
      setLoading(false);
    }
  }, [loading, activeId, thread, memory]);

  function sendBrief() {
    send(BRIEF_PROMPT);
  }

  function addThread() {
    const name = newThreadName.trim();
    if (!name) return;
    const id = nextId;
    setThreads(ts => [...ts, { id, name, messages: [] }]);
    setNextId(n => n + 1);
    setActiveId(id);
    setNewThreadName("");
    setAddingThread(false);
  }

  function openMemory() {
    setMemDraft({ ...memory });
    setMemOpen(true);
  }
  function saveMemory() {
    setMemory({ ...memDraft });
    setMemOpen(false);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top bar ── */}
      <div className="shrink-0 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between px-6 pt-4 mb-3.5">
          <span
            className="text-[12px] tracking-[0.06em] uppercase font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-secondary)" }}
          >
            Ascent · Advisor
          </span>
          <div className="flex gap-2">
            <button
              onClick={openMemory}
              title="Project Memory"
              className="w-7 h-7 flex items-center justify-center rounded-[6px] border text-[12px] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              ◆
            </button>
            <button
              onClick={sendBrief}
              title="Weekly Brief"
              className="w-7 h-7 flex items-center justify-center rounded-[6px] border text-[12px] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              ○
            </button>
          </div>
        </div>

        {/* Thread tabs */}
        <div className="flex overflow-x-auto px-6 gap-0" style={{ scrollbarWidth: "none" }}>
          {threads.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className="shrink-0 text-[11px] tracking-[0.03em] px-3.5 py-2 border-b-[1.5px] transition-colors whitespace-nowrap relative"
              style={{
                color: t.id === activeId ? "var(--text-primary)" : "var(--text-secondary)",
                borderColor: t.id === activeId ? "var(--text-primary)" : "transparent",
                background: "none",
                bottom: -1,
              }}
              onMouseEnter={e => { if (t.id !== activeId) (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
              onMouseLeave={e => { if (t.id !== activeId) (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              {t.name}
            </button>
          ))}

          {/* Add thread */}
          {addingThread ? (
            <div className="flex items-center shrink-0 px-1 pb-0.5">
              <input
                ref={addInputRef}
                value={newThreadName}
                onChange={e => setNewThreadName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addThread(); if (e.key === "Escape") { setAddingThread(false); setNewThreadName(""); } }}
                placeholder="Thread name…"
                className="text-[11px] px-2 py-1 rounded-[5px] border outline-none w-32"
                style={{ background: "var(--surface-raised)", borderColor: "var(--border-mid)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
              />
              <button
                onClick={addThread}
                className="ml-1.5 text-[10px] px-2 py-1 rounded-[5px] transition-opacity hover:opacity-80"
                style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)", border: "none" }}
              >
                Add
              </button>
              <button
                onClick={() => { setAddingThread(false); setNewThreadName(""); }}
                className="ml-1 text-[10px] px-1.5 py-1 rounded-[5px]"
                style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingThread(true)}
              className="shrink-0 text-[11px] tracking-[0.03em] px-3.5 py-2 transition-colors opacity-50 hover:opacity-80 whitespace-nowrap"
              style={{ color: "var(--text-secondary)", background: "none", border: "none", borderBottom: "1.5px solid transparent" }}
            >
              + New
            </button>
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-6 pt-7"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
      >
        {thread.messages.length === 0 && !loading ? (
          <div className="text-center pt-16 opacity-40">
            <div className="text-[18px] mb-2.5">◆</div>
            <div
              className="text-[12px] tracking-[0.04em] leading-[1.8]"
              style={{ color: "var(--text-secondary)" }}
            >
              Strategic operator standing by.<br />
              Ask anything about allocation, priorities, or direction.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-7 pb-4">
            {thread.messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div
                  className="text-[10px] tracking-[0.07em] uppercase mb-1.75"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {m.role === "user" ? "You" : "Advisor"}
                </div>
                <div
                  className="text-[13px] leading-[1.8] tracking-[0.01em] whitespace-pre-wrap"
                  style={{ color: m.role === "user" ? "var(--text-mid)" : "var(--text-primary)" }}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div>
                <div className="text-[10px] tracking-[0.07em] uppercase mb-1.75" style={{ color: "var(--text-secondary)" }}>
                  Advisor
                </div>
                <div className="flex gap-1 items-center h-5">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{
                        background: "var(--text-secondary)",
                        animation: `pulse 1.2s infinite ${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 px-6 pt-4 pb-6 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask the advisor…"
            rows={1}
            className="w-full rounded-[9px] border px-4 py-3 pr-12 text-[13px] leading-[1.6] tracking-[0.01em] outline-none resize-none transition-colors overflow-y-auto"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              minHeight: 48,
              maxHeight: 160,
              scrollbarWidth: "none",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--border-mid)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="absolute right-2.5 bottom-2.5 w-7 h-7 flex items-center justify-center rounded-[6px] border text-[13px] transition-colors"
            style={{
              borderColor: "var(--border-mid)",
              color: "var(--text-mid)",
              background: "none",
              opacity: loading || !input.trim() ? 0.3 : 1,
            }}
            onMouseEnter={e => {
              if (!loading && input.trim()) {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-mid)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-mid)";
            }}
          >
            ↑
          </button>
        </div>

        {/* Hint pills */}
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {hints.map(h => (
            <button
              key={h}
              onClick={() => { setInput(h); inputRef.current?.focus(); }}
              className="text-[10px] tracking-[0.04em] px-2.5 py-1 rounded-full border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "none", fontFamily: "var(--font-mono)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-mid)"; (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* ── Memory modal ── */}
      {memOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setMemOpen(false)}
        >
          <div
            className="w-full max-w-[720px] max-h-[75vh] overflow-y-auto rounded-t-[14px] border-t border-l border-r p-6"
            style={{ background: "var(--surface)", borderColor: "var(--border-mid)", scrollbarWidth: "thin" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-[14px] font-semibold tracking-[-0.01em]" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  Project Memory
                </div>
                <div className="text-[10px] mt-0.5 tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
                  Persistent context the advisor carries across all threads
                </div>
              </div>
              <button
                onClick={() => setMemOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-[5px] border text-[16px] transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "none" }}
              >
                ×
              </button>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-5">
              <MemSection label="Identity">
                <div className="grid grid-cols-2 gap-2.5">
                  <MemField label="Current stage">
                    <select
                      value={memDraft.stage}
                      onChange={e => setMemDraft(d => ({ ...d, stage: e.target.value }))}
                      className="w-full rounded-[7px] border px-3 py-2 text-[12px] outline-none"
                      style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    >
                      <option>Pre-revenue</option>
                      <option>Revenue</option>
                      <option>Scaling</option>
                    </select>
                  </MemField>
                  <MemField label="Strategic priority order">
                    <input
                      value={memDraft.priority}
                      onChange={e => setMemDraft(d => ({ ...d, priority: e.target.value }))}
                      placeholder="e.g. School, SaaS, Fitness"
                      className="w-full rounded-[7px] border px-3 py-2 text-[12px] outline-none"
                      style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    />
                  </MemField>
                </div>
              </MemSection>

              <MemSection label="Active Projects">
                <MemField label="Projects & status">
                  <textarea
                    value={memDraft.projects}
                    onChange={e => setMemDraft(d => ({ ...d, projects: e.target.value }))}
                    rows={3}
                    className="w-full rounded-[7px] border px-3 py-2 text-[12px] outline-none resize-none leading-relaxed"
                    style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </MemField>
              </MemSection>

              <MemSection label="Bottlenecks & Constraints">
                <MemField label="Current bottleneck">
                  <input
                    value={memDraft.bottleneck}
                    onChange={e => setMemDraft(d => ({ ...d, bottleneck: e.target.value }))}
                    placeholder="e.g. Onboarding conversion, GPA, focus discipline"
                    className="w-full rounded-[7px] border px-3 py-2 text-[12px] outline-none"
                    style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </MemField>
                <MemField label="Declared constraints">
                  <textarea
                    value={memDraft.constraints}
                    onChange={e => setMemDraft(d => ({ ...d, constraints: e.target.value }))}
                    rows={3}
                    className="w-full rounded-[7px] border px-3 py-2 text-[12px] outline-none resize-none leading-relaxed"
                    style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </MemField>
              </MemSection>

              <MemSection label="Performance Baseline">
                <div className="grid grid-cols-2 gap-2.5">
                  <MemField label="7-day avg deep work hrs">
                    <input
                      value={memDraft.avgHours}
                      onChange={e => setMemDraft(d => ({ ...d, avgHours: e.target.value }))}
                      placeholder="e.g. 3.8h"
                      className="w-full rounded-[7px] border px-3 py-2 text-[12px] outline-none"
                      style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    />
                  </MemField>
                  <MemField label="High-value % (last 30d)">
                    <input
                      value={memDraft.highValuePct}
                      onChange={e => setMemDraft(d => ({ ...d, highValuePct: e.target.value }))}
                      placeholder="e.g. 62%"
                      className="w-full rounded-[7px] border px-3 py-2 text-[12px] outline-none"
                      style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    />
                  </MemField>
                </div>
              </MemSection>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => setMemOpen(false)}
                className="px-4 py-1.75 text-[11px] rounded-[7px] border transition-colors"
                style={{ color: "var(--text-mid)", borderColor: "var(--border)", fontFamily: "var(--font-mono)", background: "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
              >
                Cancel
              </button>
              <button
                onClick={saveMemory}
                className="px-5 py-1.75 text-[11px] font-medium rounded-[7px] transition-opacity hover:opacity-80"
                style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)", border: "none" }}
              >
                Save Memory
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────
function MemSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.09em] uppercase mb-2.5" style={{ color: "var(--text-secondary)" }}>{label}</div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function MemField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] tracking-[0.03em] mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}
