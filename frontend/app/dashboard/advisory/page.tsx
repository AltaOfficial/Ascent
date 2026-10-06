"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import React from "react";
import { isToday, isYesterday, differenceInCalendarDays } from "date-fns";
import {
  ArrowUp,
  Brain,
  FileText,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  SquarePen,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { MemSection, MemField } from "@/components/dashboard/MemoryModal";
import {
  AssistantMessage,
  ThinkingMessage,
  UserMessage,
} from "@/components/dashboard/AdvisorMessage";
import { apiFetch, apiStream } from "@/lib/api";
import { SelectField } from "@/components/ui/select";

// ── Types ──────────────────────────────────────────────────────────────────
type MessageRole = "user" | "assistant";
type Message = { id: string; role: MessageRole; content: string };
type Thread = {
  id: string;
  name: string;
  pinned: boolean;
  createdAt: string;
  lastMessageAt: string | null;
  preview: string | null;
  messageCount: number;
};
type Suggestions = { loading: boolean; items: string[] };

type Memory = {
  stage: string;
  priority: string;
  projects: string;
  bottleneck: string;
  constraints: string;
};

// What the advisor sees from the account, shown read-only in the memory modal
type LiveContext = {
  analytics: {
    totals: { last7: number; last30: number };
    highValue: { pct: number | null };
  };
  rank: { rank: string; score: number };
  compliance: { last7Pct: number | null; last30Pct: number | null };
};

// ── Constants ──────────────────────────────────────────────────────────────
const NEW_CHAT_NAME = "New chat";

const EMPTY_MEMORY: Memory = {
  stage: "",
  priority: "",
  projects: "",
  bottleneck: "",
  constraints: "",
};

const WEEKLY_BRIEF_PROMPT = `Generate a weekly strategic brief. Use this format exactly:

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

const fieldStyle: React.CSSProperties = {
  background: "var(--surface-raised)",
  borderColor: "var(--border)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)",
};

function activityDate(thread: Thread): Date {
  return new Date(thread.lastMessageAt ?? thread.createdAt);
}

/** Sidebar sections: Pinned, then by how recently each chat was active. */
function groupThreads(threads: Thread[]): { label: string; threads: Thread[] }[] {
  const groups: Record<string, Thread[]> = {
    Pinned: [],
    Today: [],
    Yesterday: [],
    "Previous 7 days": [],
    "Previous 30 days": [],
    Older: [],
  };
  const now = new Date();
  for (const thread of threads) {
    const date = activityDate(thread);
    const age = differenceInCalendarDays(now, date);
    if (thread.pinned) groups.Pinned.push(thread);
    else if (isToday(date)) groups.Today.push(thread);
    else if (isYesterday(date)) groups.Yesterday.push(thread);
    else if (age <= 7) groups["Previous 7 days"].push(thread);
    else if (age <= 30) groups["Previous 30 days"].push(thread);
    else groups.Older.push(thread);
  }
  return Object.entries(groups)
    .filter(([, list]) => list.length)
    .map(([label, list]) => ({ label, threads: list }));
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function AdvisoryPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoaded, setThreadsLoaded] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({});
  const [suggestionsByThread, setSuggestionsByThread] = useState<Record<string, Suggestions>>({});
  const [search, setSearch] = useState("");
  const [memory, setMemory] = useState<Memory>(EMPTY_MEMORY);
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState<Memory>(EMPTY_MEMORY);
  const [liveContext, setLiveContext] = useState<LiveContext | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Id of the reply currently streaming in, for the typing caret
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null;
  const activeMessages = useMemo(
    () => (activeThreadId ? (messagesByThread[activeThreadId] ?? []) : []),
    [activeThreadId, messagesByThread],
  );
  const activeSuggestions = activeThreadId ? suggestionsByThread[activeThreadId] : undefined;

  const visibleThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter(
      (t) => t.name.toLowerCase().includes(query) || (t.preview ?? "").toLowerCase().includes(query),
    );
  }, [threads, search]);

  function patchThread(threadId: string, patch: Partial<Thread>) {
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, ...patch } : t)));
  }

  /** Keeps the list in "pinned, then most recent" order after local changes. */
  function sortThreads(list: Thread[]): Thread[] {
    return [...list].sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        activityDate(b).getTime() - activityDate(a).getTime(),
    );
  }

  const createChat = useCallback(async (): Promise<Thread | null> => {
    try {
      const created = await apiFetch<Thread>("/advisor/threads", { method: "POST", body: "{}" });
      const thread: Thread = {
        ...created,
        lastMessageAt: null,
        preview: null,
        messageCount: 0,
      };
      setThreads((prev) => [thread, ...prev]);
      setMessagesByThread((prev) => ({ ...prev, [thread.id]: [] }));
      setActiveThreadId(thread.id);
      return thread;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    apiFetch<Thread[]>("/advisor/threads")
      .then((list) => {
        setThreads(list);
        setActiveThreadId((current) => current ?? list[0]?.id ?? null);
      })
      .catch(() => {})
      .finally(() => setThreadsLoaded(true));
    apiFetch<Memory>("/advisor/memory").then(setMemory).catch(() => {});
    apiFetch<{ live: boolean }>("/advisor/status")
      .then((status) => setIsLive(status.live))
      .catch(() => {});
  }, []);

  // First visit with no chats yet: start one so there's somewhere to type
  useEffect(() => {
    if (threadsLoaded && threads.length === 0) createChat();
  }, [threadsLoaded, threads.length, createChat]);

  // Load a chat's history the first time it's opened
  useEffect(() => {
    if (!activeThreadId || messagesByThread[activeThreadId]) return;
    apiFetch<Message[]>(`/advisor/threads/${activeThreadId}/messages`)
      .then((list) =>
        setMessagesByThread((prev) => ({ ...prev, [activeThreadId]: list })),
      )
      .catch(() => {});
  }, [activeThreadId, messagesByThread]);

  // Suggested questions for the open chat (cached on the server)
  useEffect(() => {
    if (!activeThreadId || suggestionsByThread[activeThreadId]) return;
    const threadId = activeThreadId;
    setSuggestionsByThread((prev) => ({ ...prev, [threadId]: { loading: true, items: [] } }));
    apiFetch<{ name: string; suggestions: string[] }>(`/advisor/threads/${threadId}/suggestions`)
      .then((result) =>
        setSuggestionsByThread((prev) => ({
          ...prev,
          [threadId]: { loading: false, items: result.suggestions },
        })),
      )
      .catch(() =>
        setSuggestionsByThread((prev) => ({ ...prev, [threadId]: { loading: false, items: [] } })),
      );
  }, [activeThreadId, suggestionsByThread]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeMessages, isLoading]);

  function autoResizeInput() {
    const inputElement = inputRef.current;
    if (!inputElement) return;
    inputElement.style.height = "auto";
    inputElement.style.height = Math.min(inputElement.scrollHeight, 160) + "px";
  }

  function updateThreadMessages(threadId: string, updater: (messages: Message[]) => Message[]) {
    setMessagesByThread((prev) => ({ ...prev, [threadId]: updater(prev[threadId] ?? []) }));
  }

  async function refreshSuggestions(threadId: string) {
    setSuggestionsByThread((prev) => ({
      ...prev,
      [threadId]: { loading: true, items: prev[threadId]?.items ?? [] },
    }));
    try {
      const result = await apiFetch<{ name: string; suggestions: string[] }>(
        `/advisor/threads/${threadId}/suggestions`,
        { method: "POST" },
      );
      setSuggestionsByThread((prev) => ({
        ...prev,
        [threadId]: { loading: false, items: result.suggestions },
      }));
      // A new chat gets its title from the same call
      patchThread(threadId, { name: result.name });
    } catch {
      setSuggestionsByThread((prev) => ({
        ...prev,
        [threadId]: { loading: false, items: prev[threadId]?.items ?? [] },
      }));
    }
  }

  const sendMessage = useCallback(async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || isLoading || streamingId || !activeThreadId) return;
    const threadId = activeThreadId;

    setInputText("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    const replyId = `pending-${Date.now()}`;
    updateThreadMessages(threadId, (messages) => [
      ...messages,
      { id: `user-${Date.now()}`, role: "user", content: trimmedText },
    ]);
    setSuggestionsByThread((prev) => ({ ...prev, [threadId]: { loading: true, items: [] } }));
    setIsLoading(true);

    let reply = "";
    try {
      let started = false;
      await apiStream(`/advisor/threads/${threadId}/messages`, { content: trimmedText }, (chunk) => {
        reply += chunk;
        if (!started) {
          started = true;
          setIsLoading(false);
          setStreamingId(replyId);
          updateThreadMessages(threadId, (messages) => [
            ...messages,
            { id: replyId, role: "assistant", content: chunk },
          ]);
          return;
        }
        updateThreadMessages(threadId, (messages) =>
          messages.map((message) =>
            message.id === replyId ? { ...message, content: message.content + chunk } : message,
          ),
        );
      });
      if (!started) {
        updateThreadMessages(threadId, (messages) => [
          ...messages,
          { id: replyId, role: "assistant", content: "No response." },
        ]);
      }
    } catch {
      updateThreadMessages(threadId, (messages) => [
        ...messages,
        { id: replyId, role: "assistant", content: "Connection error. Check API access." },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingId(null);
    }

    setThreads((prev) =>
      sortThreads(
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                lastMessageAt: new Date().toISOString(),
                preview: reply.slice(0, 140) || t.preview,
                messageCount: t.messageCount + 2,
              }
            : t,
        ),
      ),
    );
    refreshSuggestions(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, streamingId, activeThreadId]);

  function sendWeeklyBrief() {
    sendMessage(WEEKLY_BRIEF_PROMPT);
  }

  async function startNewChat() {
    // Reuse an untouched new chat instead of piling up empty ones
    const empty = threads.find((t) => t.messageCount === 0 && t.name === NEW_CHAT_NAME);
    if (empty) {
      setActiveThreadId(empty.id);
    } else {
      await createChat();
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function startRename(thread: Thread) {
    setRenamingThreadId(thread.id);
    setRenameValue(thread.name);
  }

  async function commitRename() {
    const id = renamingThreadId;
    const name = renameValue.trim();
    setRenamingThreadId(null);
    if (!id || !name) return;
    patchThread(id, { name });
    apiFetch(`/advisor/threads/${id}/update`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }).catch(() => {});
  }

  function togglePin(thread: Thread) {
    const pinned = !thread.pinned;
    setThreads((prev) => sortThreads(prev.map((t) => (t.id === thread.id ? { ...t, pinned } : t))));
    apiFetch(`/advisor/threads/${thread.id}/update`, {
      method: "POST",
      body: JSON.stringify({ pinned }),
    }).catch(() => {});
  }

  async function deleteThread(thread: Thread) {
    if (!window.confirm(`Delete "${thread.name}" and its messages?`)) return;
    try {
      await apiFetch(`/advisor/threads/${thread.id}/delete`, { method: "POST" });
      const remaining = threads.filter((t) => t.id !== thread.id);
      setThreads(remaining);
      if (activeThreadId === thread.id) setActiveThreadId(remaining[0]?.id ?? null);
    } catch {}
  }

  function openMemoryModal() {
    setMemoryDraft({ ...memory });
    setMemoryModalOpen(true);
    apiFetch<LiveContext>("/advisor/context").then(setLiveContext).catch(() => {});
  }

  async function saveMemoryDraft() {
    try {
      const saved = await apiFetch<Memory>("/advisor/memory", {
        method: "POST",
        body: JSON.stringify(memoryDraft),
      });
      setMemory(saved);
    } catch {}
    setMemoryModalOpen(false);
  }

  const liveStats = liveContext
    ? [
        { label: "7-day deep work", value: `${Math.round((liveContext.analytics.totals.last7 / 7) * 10) / 10}h/day` },
        { label: "High-priority % (30d)", value: liveContext.analytics.highValue.pct === null ? "—" : `${liveContext.analytics.highValue.pct}%` },
        { label: "Rank", value: `${liveContext.rank.rank} · ${Math.round(liveContext.rank.score * 100)}` },
        { label: "Compliance (7d)", value: liveContext.compliance.last7Pct === null ? "—" : `${liveContext.compliance.last7Pct}%` },
      ]
    : [];

  const busy = isLoading || streamingId !== null;
  const canSend = !busy && inputText.trim().length > 0 && !!activeThreadId;
  const iconButton =
    "w-6 h-6 flex items-center justify-center rounded-md transition-colors";

  function SuggestionChips({ variant }: { variant: "cards" | "chips" }) {
    const state = activeSuggestions;
    if (!state || (!state.loading && !state.items.length)) return null;
    if (state.loading && !state.items.length) {
      return (
        <div className={variant === "cards" ? "grid grid-cols-1 sm:grid-cols-3 gap-2 w-full" : "flex gap-1.5"}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={variant === "cards" ? "h-16 rounded-lg border animate-pulse" : "h-7 w-44 rounded-full border animate-pulse"}
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
          ))}
        </div>
      );
    }
    if (variant === "cards") {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
          {state.items.map((question) => (
            <button
              key={question}
              onClick={() => sendMessage(question)}
              disabled={busy}
              className="text-left text-[12px] leading-snug px-3.5 py-3 rounded-lg border transition-colors disabled:opacity-50"
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-mid)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-mid)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-mid)"; }}
            >
              {question}
            </button>
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-1.5" style={{ opacity: state.loading ? 0.5 : 1 }}>
        {state.items.map((question) => (
          <button
            key={question}
            onClick={() => sendMessage(question)}
            disabled={busy}
            className="text-left text-[11px] leading-snug tracking-[0.01em] px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "var(--surface)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-mid)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-mid)"; }}
          >
            {question}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* Chat list */}
      <aside
        className="hidden md:flex flex-col w-64 shrink-0 border-r"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <div className="px-4 pt-6 pb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1
              className="text-[18px] font-semibold tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Advisor
            </h1>
            <button
              onClick={startNewChat}
              className="w-8 h-8 flex items-center justify-center rounded-md border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-mid)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-mid)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              title="New chat"
              aria-label="New chat"
            >
              <SquarePen size={14} strokeWidth={1.75} />
            </button>
          </div>
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-md border"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <Search size={13} style={{ color: "var(--text-secondary)" }} aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="flex-1 min-w-0 bg-transparent outline-none text-[12px]"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
              aria-label="Search chats"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search" style={{ color: "var(--text-secondary)", background: "none", border: "none" }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}>
          {visibleThreads.length === 0 && threadsLoaded && (
            <div className="px-2 py-6 text-[11px] text-center" style={{ color: "var(--text-secondary)" }}>
              {search ? "No chats match." : "No chats yet."}
            </div>
          )}
          {groupThreads(visibleThreads).map((group) => (
            <div key={group.label} className="mt-3 first:mt-1">
              <div
                className="px-2 pb-1.5 text-[9px] tracking-[0.12em] uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                {group.label}
              </div>
              {group.threads.map((thread) => {
                const active = thread.id === activeThreadId;
                if (renamingThreadId === thread.id) {
                  return (
                    <input
                      key={thread.id}
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenamingThreadId(null);
                      }}
                      onBlur={commitRename}
                      className="w-full h-9 px-2.5 mb-0.5 rounded-md border outline-none text-[12px]"
                      style={{ background: "var(--surface-raised)", borderColor: "var(--border-mid)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                      aria-label="Chat name"
                    />
                  );
                }
                return (
                  <div
                    key={thread.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveThreadId(thread.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") setActiveThreadId(thread.id); }}
                    onDoubleClick={() => startRename(thread)}
                    className="group/chat relative flex items-start gap-2 px-2.5 py-2 mb-0.5 rounded-md cursor-pointer transition-colors"
                    style={{ background: active ? "var(--surface-raised)" : undefined }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--surface)"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ""; }}
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className="flex items-center gap-1.5 text-[12px] truncate"
                        style={{ color: active ? "var(--text-primary)" : "var(--text-mid)" }}
                      >
                        {thread.pinned && <Pin size={10} className="shrink-0" style={{ color: "var(--text-secondary)" }} aria-label="Pinned" />}
                        <span className="truncate">{thread.name}</span>
                      </div>
                      <div className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {thread.preview ?? "No messages yet"}
                      </div>
                    </div>
                    <div
                      className="absolute right-1.5 top-1.5 hidden group-hover/chat:flex group-focus-within/chat:flex items-center rounded-md"
                      style={{ background: active ? "var(--surface-raised)" : "var(--surface)" }}
                    >
                      {[
                        { label: thread.pinned ? "Unpin" : "Pin", icon: thread.pinned ? PinOff : Pin, action: () => togglePin(thread) },
                        { label: "Rename", icon: Pencil, action: () => startRename(thread) },
                        { label: "Delete", icon: Trash2, action: () => deleteThread(thread) },
                      ].map(({ label, icon: Icon, action }) => (
                        <button
                          key={label}
                          onClick={(e) => { e.stopPropagation(); action(); }}
                          className={iconButton}
                          style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = label === "Delete" ? "rgba(217,107,107,0.9)" : "var(--text-primary)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                          title={label}
                          aria-label={`${label} ${thread.name}`}
                        >
                          <Icon size={12} />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Chat */}
      <section className="flex-1 min-w-0 flex flex-col">
        <div
          className="shrink-0 flex items-center justify-between gap-4 px-6 md:px-8 h-16 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="text-[14px] font-semibold tracking-[-0.01em] truncate"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              onDoubleClick={() => activeThread && startRename(activeThread)}
              title="Double-click to rename"
            >
              {activeThread?.name ?? "Advisor"}
            </span>
            <span
              className="shrink-0 flex items-center gap-1.5 text-[10px] tracking-[0.04em] px-2 py-0.5 rounded-full border"
              style={{
                borderColor: isLive ? "rgba(107,187,138,0.3)" : "var(--border)",
                color: isLive ? "rgba(107,187,138,0.9)" : "var(--text-secondary)",
              }}
              title={isLive ? "Replies come from Claude using your live data" : "Set ANTHROPIC_API_KEY in backend/.env for real replies"}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isLive ? "rgba(107,187,138,0.9)" : "var(--text-secondary)" }}
              />
              {isLive ? "Live" : "Mock mode"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={startNewChat}
              className="md:hidden flex items-center gap-2 h-8 px-3 rounded-md border text-[11px]"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "none", fontFamily: "var(--font-mono)" }}
            >
              <SquarePen size={13} strokeWidth={1.75} /> New
            </button>
            <button
              onClick={openMemoryModal}
              className="flex items-center gap-2 h-8 px-3 rounded-md border text-[11px] tracking-[0.03em] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "none", fontFamily: "var(--font-mono)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-mid)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-mid)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              title="Context the advisor carries across every chat"
            >
              <Brain size={13} strokeWidth={1.75} /> Memory
            </button>
            <button
              onClick={sendWeeklyBrief}
              disabled={!activeThreadId || busy}
              className="flex items-center gap-2 h-8 px-3 rounded-md border text-[11px] tracking-[0.03em] transition-colors disabled:opacity-40"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "none", fontFamily: "var(--font-mono)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-mid)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-mid)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              title="Ask for this week's review in this chat"
            >
              <FileText size={13} strokeWidth={1.75} /> Weekly brief
            </button>
          </div>
        </div>

        {/* Conversation */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
        >
          <div className="max-w-190 mx-auto px-6 py-8">
            {activeMessages.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center text-center pt-10">
                <div
                  className="w-11 h-11 rounded-xl border flex items-center justify-center mb-4"
                  style={{ background: "var(--surface)", borderColor: "var(--border-mid)", color: "var(--text-mid)" }}
                >
                  <Sparkles size={18} strokeWidth={1.75} />
                </div>
                <div
                  className="text-[16px] font-semibold tracking-[-0.01em]"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                >
                  Strategic operator standing by
                </div>
                <p className="text-[12px] leading-relaxed mt-1.5 max-w-100" style={{ color: "var(--text-secondary)" }}>
                  Ask about allocation, priorities or direction. The advisor reads your
                  hours, rank, compliance, tasks and milestones live.
                </p>
                <div className="mt-7 w-full flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
                    <Sparkles size={11} /> Suggested for you
                  </div>
                  <SuggestionChips variant="cards" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-7">
                {activeMessages.map((message) =>
                  message.role === "user" ? (
                    message.content === WEEKLY_BRIEF_PROMPT ? (
                      <div key={message.id} className="flex justify-end">
                        <span
                          className="flex items-center gap-2 text-[11px] tracking-[0.03em] px-3 py-1.5 rounded-full border"
                          style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "var(--surface)" }}
                        >
                          <FileText size={12} strokeWidth={1.75} /> Weekly brief requested
                        </span>
                      </div>
                    ) : (
                      <UserMessage key={message.id} content={message.content} />
                    )
                  ) : (
                    <AssistantMessage
                      key={message.id}
                      content={message.content}
                      streaming={message.id === streamingId}
                    />
                  ),
                )}
                {isLoading && <ThinkingMessage />}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 pb-6 pt-3">
          <div className="max-w-190 mx-auto px-6">
            {activeMessages.length > 0 && !busy && activeSuggestions && (activeSuggestions.loading || activeSuggestions.items.length > 0) && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-[10px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
                    <Sparkles size={11} /> {activeSuggestions.loading ? "Thinking of follow-ups…" : "Suggested follow-ups"}
                  </span>
                  {!activeSuggestions.loading && activeThreadId && (
                    <button
                      onClick={() => refreshSuggestions(activeThreadId)}
                      className="flex items-center gap-1 text-[10px] tracking-[0.04em] transition-colors"
                      style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                      title="Suggest different questions"
                    >
                      <RefreshCw size={10} /> New ideas
                    </button>
                  )}
                </div>
                <SuggestionChips variant="chips" />
              </div>
            )}
            <div
              className="flex items-end gap-2 rounded-xl border pl-4 pr-2 py-2 transition-colors focus-within:border-(--border-mid)"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => { setInputText(e.target.value); autoResizeInput(); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(inputText); } }}
                placeholder="Ask the advisor…"
                rows={1}
                className="flex-1 bg-transparent py-1.5 text-[13px] leading-[1.6] tracking-[0.01em] outline-none resize-none overflow-y-auto"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", maxHeight: 160, scrollbarWidth: "none" }}
                aria-label="Message the advisor"
              />
              <button
                onClick={() => sendMessage(inputText)}
                disabled={!canSend}
                aria-label="Send"
                className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg transition-all"
                style={{
                  background: canSend ? "var(--text-primary)" : "var(--surface-raised)",
                  color: canSend ? "var(--bg)" : "var(--text-secondary)",
                  border: "none",
                }}
              >
                <ArrowUp size={15} strokeWidth={2.25} />
              </button>
            </div>
            <div className="text-[10px] tracking-[0.03em] mt-2 text-center" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
              Enter to send · Shift+Enter for a new line
            </div>
          </div>
        </div>
      </section>

      {/* Memory modal */}
      {memoryModalOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setMemoryModalOpen(false)}
        >
          <div
            className="w-full max-w-180 max-h-[85vh] overflow-y-auto rounded-xl border px-6 pt-6"
            style={{ background: "var(--surface)", borderColor: "var(--border-mid)", scrollbarWidth: "thin" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div
                  className="text-[14px] font-semibold tracking-[-0.01em]"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                >
                  Project Memory
                </div>
                <div className="text-[10px] mt-0.5 tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
                  Persistent context the advisor carries across all threads
                </div>
              </div>
              <button
                onClick={() => setMemoryModalOpen(false)}
                aria-label="Close"
                className="w-7 h-7 flex items-center justify-center rounded-[5px] border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "none" }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-5">
              <MemSection label="Identity">
                <div className="grid grid-cols-2 gap-2.5">
                  <MemField label="Current stage">
                    <SelectField
                      value={memoryDraft.stage}
                      onChange={(value) => setMemoryDraft((prev) => ({ ...prev, stage: value }))}
                      className="w-full rounded-lg border px-3 py-2 text-[12px] outline-none"
                      style={{ ...fieldStyle, color: memoryDraft.stage ? "var(--text-primary)" : "var(--text-secondary)" }}
                    >
                      <option value="">Select stage</option>
                      <option>Pre-revenue</option>
                      <option>Revenue</option>
                      <option>Scaling</option>
                    </SelectField>
                  </MemField>
                  <MemField label="Strategic priority order">
                    <input
                      value={memoryDraft.priority}
                      onChange={(e) => setMemoryDraft((prev) => ({ ...prev, priority: e.target.value }))}
                      placeholder="e.g. School, SaaS, Fitness"
                      className="w-full rounded-lg border px-3 py-2 text-[12px] outline-none"
                      style={fieldStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    />
                  </MemField>
                </div>
              </MemSection>

              <MemSection label="Active Projects">
                <MemField label="Projects & status">
                  <textarea
                    value={memoryDraft.projects}
                    onChange={(e) => setMemoryDraft((prev) => ({ ...prev, projects: e.target.value }))}
                    rows={3}
                    placeholder={"Ascent – pre-revenue, MVP 60%\nStrive – live, 0 revenue"}
                    className="w-full rounded-lg border px-3 py-2 text-[12px] outline-none resize-none leading-relaxed"
                    style={fieldStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </MemField>
              </MemSection>

              <MemSection label="Bottlenecks & Constraints">
                <MemField label="Current bottleneck">
                  <input
                    value={memoryDraft.bottleneck}
                    onChange={(e) => setMemoryDraft((prev) => ({ ...prev, bottleneck: e.target.value }))}
                    placeholder="e.g. Onboarding conversion, GPA, focus discipline"
                    className="w-full rounded-lg border px-3 py-2 text-[12px] outline-none"
                    style={fieldStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </MemField>
                <MemField label="Declared constraints">
                  <textarea
                    value={memoryDraft.constraints}
                    onChange={(e) => setMemoryDraft((prev) => ({ ...prev, constraints: e.target.value }))}
                    rows={3}
                    placeholder={"Work shifts Mon/Wed/Fri 6am\nExam coming up"}
                    className="w-full rounded-lg border px-3 py-2 text-[12px] outline-none resize-none leading-relaxed"
                    style={fieldStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </MemField>
              </MemSection>

              <MemSection label="Performance Baseline · live from your data">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {(liveStats.length ? liveStats : [{ label: "Loading", value: "…" }]).map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border px-3 py-2"
                      style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
                    >
                      <div className="text-[9px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
                        {stat.label}
                      </div>
                      <div className="text-[13px] mt-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </MemSection>
            </div>

            {/* Footer */}
            <div
              className="sticky bottom-0 flex justify-end gap-2 mt-5 py-4 border-t"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <button
                onClick={() => setMemoryModalOpen(false)}
                className="px-4 py-1.75 text-[11px] rounded-lg border transition-colors"
                style={{ color: "var(--text-mid)", borderColor: "var(--border)", fontFamily: "var(--font-mono)", background: "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
              >
                Cancel
              </button>
              <button
                onClick={saveMemoryDraft}
                className="px-5 py-1.75 text-[11px] font-medium rounded-lg transition-opacity hover:opacity-80"
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
