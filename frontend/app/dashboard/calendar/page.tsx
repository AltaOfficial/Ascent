"use client";

import { useState, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type EventType = "task" | "exam" | "birthday" | "event";
type Priority = "low" | "mid" | "high";

type CalEvent = {
  id: number;
  type: EventType;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  notes: string;
  done: boolean;
  project?: string;
  priority?: Priority;
};

// ── Constants ──────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const TYPE_COLOR: Record<EventType, { text: string; bg: string; border: string }> = {
  task:     { text: "#5b8dd9", bg: "rgba(91,141,217,0.15)",   border: "rgba(91,141,217,0.5)" },
  exam:     { text: "#d96b6b", bg: "rgba(217,107,107,0.15)",  border: "rgba(217,107,107,0.5)" },
  birthday: { text: "#c47fd4", bg: "rgba(196,127,212,0.15)",  border: "rgba(196,127,212,0.5)" },
  event:    { text: "#6bbb8a", bg: "rgba(107,187,138,0.15)",  border: "rgba(107,187,138,0.5)" },
};


// ── Helpers ────────────────────────────────────────────────────────────────
function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayKey() {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
}
function fmtLong(y: number, m: number, d: number) {
  return new Date(y, m, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function getWeekStart(d: Date) {
  const dd = new Date(d);
  const dow = dd.getDay();
  dd.setDate(dd.getDate() - ((dow + 6) % 7)); // Monday-first
  return dd;
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [nextId, setNextId] = useState(1);
  const [view, setView] = useState<"month" | "week">("month");
  const [current, setCurrent] = useState(new Date());

  // modals
  const [detailDate, setDetailDate] = useState<{ y: number; m: number; d: number } | null>(null);
  const [createType, setCreateType] = useState<EventType | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [addDropOpen, setAddDropOpen] = useState(false);

  // form
  const [fTitle, setFTitle] = useState("");
  const [fDate, setFDate] = useState("");
  const [fTime, setFTime] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [fProject, setFProject] = useState("");
  const [fPriority, setFPriority] = useState<Priority>("mid");

  const addBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (addBtnRef.current && !addBtnRef.current.contains(e.target as Node)) {
        setAddDropOpen(false);
      }
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  function eventsOn(dateStr: string) {
    return events
      .filter(e => e.date === dateStr)
      .sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
  }

  // ── Navigation ────────────────────────────────────────────────────────
  function prev() {
    const d = new Date(current);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrent(d);
  }
  function next() {
    const d = new Date(current);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrent(d);
  }
  function goToday() { setCurrent(new Date()); }

  function calTitle() {
    if (view === "month") return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
    const ws = getWeekStart(current);
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(ws)} – ${fmt(we)}`;
  }

  // ── Create / Edit ─────────────────────────────────────────────────────
  function openCreate(type: EventType, existing?: CalEvent) {
    setCreateType(type);
    setEditingEvent(existing ?? null);
    setFTitle(existing?.title ?? "");
    setFDate(existing?.date ?? new Date().toISOString().slice(0, 10));
    setFTime(existing?.time ?? "");
    setFNotes(existing?.notes ?? "");
    setFProject(existing?.project ?? "");
    setFPriority(existing?.priority ?? "mid");
    setCreateOpen(true);
    setAddDropOpen(false);
  }

  function saveEvent() {
    if (!fTitle.trim() || !fDate) return;
    if (editingEvent) {
      setEvents(es => es.map(e => e.id !== editingEvent.id ? e : {
        ...e, title: fTitle.trim(), date: fDate, time: fTime,
        notes: fNotes, project: fProject, priority: fPriority,
      }));
    } else {
      setEvents(es => [...es, {
        id: nextId, type: createType!, title: fTitle.trim(), date: fDate,
        time: fTime, notes: fNotes, done: false, project: fProject, priority: fPriority,
      }]);
      setNextId(n => n + 1);
    }
    setCreateOpen(false);
    setEditingEvent(null);
  }

  function toggleDone(id: number) {
    setEvents(es => es.map(e => e.id === id ? { ...e, done: !e.done } : e));
  }

  function deleteEvent(id: number) {
    setEvents(es => es.filter(e => e.id !== id));
    setDetailDate(null);
  }

  // ── Month grid ────────────────────────────────────────────────────────
  function renderMonthGrid() {
    const y = current.getFullYear(), m = current.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const startOffset = (firstDay + 6) % 7; // Mon = 0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const total = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const tKey = todayKey();
    const cells = [];

    for (let i = 0; i < total; i++) {
      let cd: number, cm = m, cy = y, isOther = false;
      if (i < startOffset) {
        cd = daysInPrev - startOffset + i + 1; cm = m - 1; isOther = true;
        if (cm < 0) { cm = 11; cy = y - 1; }
      } else if (i >= startOffset + daysInMonth) {
        cd = i - startOffset - daysInMonth + 1; cm = m + 1; isOther = true;
        if (cm > 11) { cm = 0; cy = y + 1; }
      } else {
        cd = i - startOffset + 1;
      }

      const dKey = dateKey(cy, cm, cd);
      const isToday = dKey === tKey;
      const ev = eventsOn(dKey);
      const show = ev.slice(0, 2);

      cells.push(
        <div
          key={dKey}
          onClick={() => setDetailDate({ y: cy, m: cm, d: cd })}
          className="border-r border-b min-h-27.5 p-2 transition-colors"
          style={{
            borderColor: "var(--border)",
            background: "transparent",
            cursor: "pointer",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          {/* Day number */}
          <div className="mb-1.5">
            {isToday ? (
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[13px] font-semibold"
                style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-display)" }}
              >
                {cd}
              </span>
            ) : (
              <span
                className="text-[13px] font-medium"
                style={{
                  fontFamily: "var(--font-display)",
                  color: isOther ? "var(--text-secondary)" : "var(--text-primary)",
                  opacity: isOther ? 0.35 : 1,
                }}
              >
                {cd}
              </span>
            )}
          </div>

          {/* Event pills */}
          <div className="flex flex-col gap-0.5">
            {show.map(e => (
              <div
                key={e.id}
                className="text-[10px] px-1.5 py-0.5 rounded-[3px] truncate leading-[1.5] tracking-[0.01em]"
                style={{ background: TYPE_COLOR[e.type].bg, color: TYPE_COLOR[e.type].text }}
              >
                {e.time ? `${e.time} ` : ""}{e.title}
              </div>
            ))}
            {ev.length > 2 && (
              <div className="text-[10px] pl-1.5" style={{ color: "var(--text-secondary)" }}>
                +{ev.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }
    return cells;
  }

  // ── Week grid ─────────────────────────────────────────────────────────
  function renderWeekCols() {
    const ws = getWeekStart(current);
    const tKey = todayKey();
    const cols = [];

    for (let i = 0; i < 7; i++) {
      const dd = new Date(ws);
      dd.setDate(dd.getDate() + i);
      const dKey = dateKey(dd.getFullYear(), dd.getMonth(), dd.getDate());
      const isToday = dKey === tKey;
      const timedEv = eventsOn(dKey).filter(e => e.time && e.type !== "birthday");
      const allDayEv = eventsOn(dKey).filter(e => !e.time || e.type === "birthday");

      cols.push(
        <div key={dKey} className="flex-1 border-l" style={{ borderColor: "var(--border)", position: "relative" }}>
          {/* Day header */}
          <div
            className="h-[76px] flex flex-col items-center justify-center border-b gap-0.5 sticky top-0 z-10"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <span className="text-[10px] tracking-[0.07em] uppercase" style={{ color: "var(--text-secondary)" }}>
              {DAYS_SHORT[(i + 1) % 7]}
            </span>
            {isToday ? (
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[15px] font-semibold"
                style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-display)" }}
              >
                {dd.getDate()}
              </span>
            ) : (
              <span
                className="text-[16px] font-semibold"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                {dd.getDate()}
              </span>
            )}
            {/* All-day events */}
            <div className="flex flex-col gap-0.5 w-full px-1 mt-0.5">
              {allDayEv.slice(0, 1).map(e => (
                <div
                  key={e.id}
                  className="text-[9px] px-1 py-0.5 rounded-[3px] truncate"
                  style={{ background: TYPE_COLOR[e.type].bg, color: TYPE_COLOR[e.type].text }}
                >
                  {e.title}
                </div>
              ))}
            </div>
          </div>

          {/* Hour grid */}
          <div
            className="relative"
            style={{ height: 24 * 52 }}
            onClick={() => setDetailDate({ y: dd.getFullYear(), m: dd.getMonth(), d: dd.getDate() })}
          >
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="border-b" style={{ height: 52, borderColor: "var(--border)" }} />
            ))}

            {/* Timed events */}
            {timedEv.map(e => {
              const [hh, mm] = e.time.split(":").map(Number);
              const top = hh * 52 + (mm / 60) * 52;
              return (
                <div
                  key={e.id}
                  onClick={ev => { ev.stopPropagation(); setDetailDate({ y: dd.getFullYear(), m: dd.getMonth(), d: dd.getDate() }); }}
                  className="absolute left-0.75 right-0.75 rounded-[4px] px-1.5 py-1 text-[10px] leading-snug border-l-2 overflow-hidden"
                  style={{
                    top, height: 46,
                    background: TYPE_COLOR[e.type].bg,
                    color: TYPE_COLOR[e.type].text,
                    borderColor: TYPE_COLOR[e.type].text,
                    cursor: "pointer",
                  }}
                >
                  <div className="font-medium truncate">{e.title}</div>
                  <div className="opacity-70">{e.time}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return cols;
  }

  // ── Detail modal contents ─────────────────────────────────────────────
  function detailItems() {
    if (!detailDate) return null;
    const dKey = dateKey(detailDate.y, detailDate.m, detailDate.d);
    const ev = eventsOn(dKey);
    if (ev.length === 0) {
      return <p className="text-[13px] py-2 tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>Nothing scheduled.</p>;
    }
    return ev.map(e => (
      <div key={e.id} className="flex items-start gap-3 py-3 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
        <div className="w-11 shrink-0 text-[11px] tracking-[0.02em] pt-0.5" style={{ color: "var(--text-secondary)" }}>
          {e.time || "—"}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[14px] tracking-[0.01em]"
            style={{ color: "var(--text-primary)", textDecoration: e.done ? "line-through" : "none", opacity: e.done ? 0.45 : 1 }}
          >
            {e.title}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="text-[9px] tracking-[0.07em] uppercase px-1.75 py-0.5 rounded-[3px]"
              style={{ background: TYPE_COLOR[e.type].bg, color: TYPE_COLOR[e.type].text }}
            >
              {e.type}
            </span>
            {e.project && (
              <span className="text-[11px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>{e.project}</span>
            )}
          </div>
          {e.notes && (
            <div className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{e.notes}</div>
          )}
          <div className="flex gap-1.5 mt-2.5">
            <button
              onClick={() => { openCreate(e.type, e); setDetailDate(null); }}
              className="text-[11px] tracking-[0.04em] px-2.5 py-1 rounded-[5px] border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", fontFamily: "var(--font-mono)", background: "none" }}
              onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (ev.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (ev.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
            >
              Edit
            </button>
            {e.type === "task" && (
              <button
                onClick={() => toggleDone(e.id)}
                className="text-[11px] tracking-[0.04em] px-2.5 py-1 rounded-[5px] border transition-colors"
                style={{
                  borderColor: e.done ? "var(--border)" : "rgba(107,187,138,0.3)",
                  color: e.done ? "var(--text-secondary)" : "rgba(107,187,138,0.85)",
                  fontFamily: "var(--font-mono)", background: "none",
                }}
              >
                {e.done ? "Mark incomplete" : "Mark complete"}
              </button>
            )}
            <button
              onClick={() => deleteEvent(e.id)}
              className="text-[11px] tracking-[0.04em] px-2.5 py-1 rounded-[5px] border transition-colors"
              style={{ borderColor: "rgba(217,107,107,0.2)", color: "rgba(217,107,107,0.6)", fontFamily: "var(--font-mono)", background: "none" }}
              onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.color = "rgba(217,107,107,0.9)"; }}
              onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.color = "rgba(217,107,107,0.6)"; }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    ));
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}>
      <div className="px-6 md:px-10 py-7 pb-20">

        {/* Header */}
        <div className="flex items-center justify-between mb-9">
          {/* Nav */}
          <div className="flex items-center gap-5">
            <button
              onClick={prev}
              className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] border text-[16px] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
            >
              ‹
            </button>
            <h1
              className="text-[22px] font-semibold tracking-[-0.02em] min-w-[180px]"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {calTitle()}
            </h1>
            <button
              onClick={next}
              className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] border text-[16px] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
            >
              ›
            </button>
            <button
              onClick={goToday}
              className="h-[30px] px-3 rounded-[6px] border text-[11px] tracking-[0.04em] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", fontFamily: "var(--font-mono)", background: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
            >
              Today
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            {/* View toggle */}
            <div className="flex border rounded-[7px] overflow-hidden" style={{ borderColor: "var(--border)" }}>
              {(["month", "week"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="text-[11px] tracking-[0.05em] uppercase px-3.5 py-1.5 transition-colors"
                  style={{
                    background: view === v ? "var(--surface-raised)" : "none",
                    color: view === v ? "var(--text-primary)" : "var(--text-secondary)",
                    fontFamily: "var(--font-mono)", border: "none",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Add button + dropdown */}
            <div ref={addBtnRef} style={{ position: "relative" }}>
              <button
                onClick={e => { e.stopPropagation(); setAddDropOpen(o => !o); }}
                className="w-8 h-8 flex items-center justify-center rounded-[7px] border text-[20px] transition-colors"
                style={{ borderColor: "var(--border-mid)", color: "var(--text-primary)", background: "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-mid)"; (e.currentTarget as HTMLElement).style.background = "none"; }}
              >
                +
              </button>
              {addDropOpen && (
                <div
                  className="absolute right-0 top-9 z-50 rounded-[9px] border py-1.5 w-[160px]"
                  style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
                >
                  {(["task", "exam", "event", "birthday"] as EventType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => openCreate(t)}
                      className="block w-full text-left px-3 py-2.25 text-[12px] tracking-[0.02em] rounded-[6px] transition-colors"
                      style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", background: "none", border: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      New {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mb-6 flex-wrap">
          {(Object.entries(TYPE_COLOR) as [EventType, typeof TYPE_COLOR[EventType]][]).map(([type, c]) => (
            <div key={type} className="flex items-center gap-1.5 text-[11px] tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
              <div className="w-2 h-2 rounded-[2px]" style={{ background: c.text }} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
          ))}
        </div>

        {/* Month view */}
        {view === "month" && (
          <div>
            {/* DOW headers */}
            <div className="grid grid-cols-7 mb-2">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                <div key={d} className="text-center text-[10px] tracking-[0.08em] uppercase pb-1.5" style={{ color: "var(--text-secondary)" }}>
                  {d}
                </div>
              ))}
            </div>
            {/* Grid */}
            <div
              className="grid grid-cols-7 border-t border-l"
              style={{ borderColor: "var(--border)" }}
            >
              {renderMonthGrid()}
            </div>
          </div>
        )}

        {/* Week view */}
        {view === "week" && (
          <div className="border rounded-[8px] overflow-hidden" style={{ borderColor: "var(--border)" }}>
            {/* Time labels + day columns */}
            <div className="flex">
              {/* Time col */}
              <div className="w-[52px] shrink-0">
                <div className="h-[76px] border-b border-r" style={{ borderColor: "var(--border)" }} />
                {Array.from({ length: 24 }).map((_, h) => (
                  <div
                    key={h}
                    className="h-[52px] border-b border-r flex items-start justify-end pr-2.5 pt-0.5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span className="text-[10px] tracking-[0.03em] whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                      {h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
                    </span>
                  </div>
                ))}
              </div>
              {/* Day columns */}
              <div className="flex flex-1 overflow-x-auto">
                {renderWeekCols()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Day detail modal ── */}
      {detailDate && (
        <Modal onClose={() => setDetailDate(null)}>
          <div className="flex items-center justify-between px-5.5 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div>
              <div className="text-[15px] font-semibold tracking-[-0.01em]" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {DAYS_FULL[new Date(detailDate.y, detailDate.m, detailDate.d).getDay()]}
              </div>
              <div className="text-[11px] mt-0.5 tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
                {fmtLong(detailDate.y, detailDate.m, detailDate.d)}
              </div>
            </div>
            <button
              onClick={() => setDetailDate(null)}
              className="w-7 h-7 flex items-center justify-center rounded-[5px] text-[18px] transition-colors"
              style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
            >
              ×
            </button>
          </div>
          <div className="px-5.5 py-4">{detailItems()}</div>
          <div className="px-5.5 pb-5 pt-1">
            <button
              onClick={() => {
                const d = detailDate;
                const iso = dateKey(d.y, d.m, d.d);
                setFDate(iso);
                setDetailDate(null);
                setCreateType(null);
                setCreateOpen(true);
              }}
              className="text-[11px] tracking-[0.04em] px-3 py-1.5 rounded-[6px] border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", background: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              + Add to this day
            </button>
          </div>
        </Modal>
      )}

      {/* ── Create / type-pick modal ── */}
      {createOpen && (
        <Modal onClose={() => { setCreateOpen(false); setCreateType(null); setEditingEvent(null); }}>
          <div className="flex items-center justify-between px-5.5 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-[15px] font-semibold tracking-[-0.01em]" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              {editingEvent ? "Edit Item" : "Add to Calendar"}
            </span>
            <button
              onClick={() => { setCreateOpen(false); setCreateType(null); setEditingEvent(null); }}
              className="w-7 h-7 flex items-center justify-center rounded-[5px] text-[18px] transition-colors"
              style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
            >
              ×
            </button>
          </div>
          <div className="px-5.5 py-5">
            {/* Type picker */}
            {!createType ? (
              <div className="grid grid-cols-2 gap-2">
                {([
                  { type: "task" as EventType,     icon: "☐", label: "Task",     sub: "With due date" },
                  { type: "exam" as EventType,     icon: "✎", label: "Exam",     sub: "Academic test" },
                  { type: "event" as EventType,    icon: "▶", label: "Event",    sub: "Anything else" },
                  { type: "birthday" as EventType, icon: "★", label: "Birthday", sub: "Annual reminder" },
                ]).map(({ type, icon, label, sub }) => (
                  <button
                    key={type}
                    onClick={() => { setCreateType(type); setFDate(fDate || new Date().toISOString().slice(0, 10)); }}
                    className="rounded-[8px] border p-3 text-left transition-colors"
                    style={{ background: "var(--surface-raised)", borderColor: "var(--border)", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-mid)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <span className="block text-[18px] mb-1">{icon}</span>
                    <span className="block text-[13px] tracking-[0.02em]" style={{ color: TYPE_COLOR[type].text }}>{label}</span>
                    <span className="block text-[10px] mt-0.5 tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>{sub}</span>
                  </button>
                ))}
              </div>
            ) : (
              /* Create form */
              <div className="flex flex-col gap-3.5">
                {!editingEvent && (
                  <button
                    onClick={() => setCreateType(null)}
                    className="flex items-center gap-1 text-[11px] tracking-[0.03em] transition-colors -mt-1"
                    style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
                  >
                    ← Back
                  </button>
                )}

                <FormField label="Title">
                  <input
                    autoFocus
                    value={fTitle}
                    onChange={e => setFTitle(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && saveEvent()}
                    placeholder={createType === "birthday" ? "Name" : "Title"}
                    className="w-full rounded-[7px] border px-3 py-2.25 text-[13px] outline-none transition-colors"
                    style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-2.5">
                  <FormField label="Date">
                    <input
                      type="date"
                      value={fDate}
                      onChange={e => setFDate(e.target.value)}
                      className="w-full rounded-[7px] border px-3 py-2.25 text-[13px] outline-none transition-colors"
                      style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    />
                  </FormField>
                  {createType !== "birthday" && (
                    <FormField label="Time (optional)">
                      <input
                        type="time"
                        value={fTime}
                        onChange={e => setFTime(e.target.value)}
                        className="w-full rounded-[7px] border px-3 py-2.25 text-[13px] outline-none transition-colors"
                        style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                        onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                      />
                    </FormField>
                  )}
                </div>

                {createType === "task" && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <FormField label="Project">
                      <input
                        value={fProject}
                        onChange={e => setFProject(e.target.value)}
                        placeholder="e.g. Ascent"
                        className="w-full rounded-[7px] border px-3 py-2.25 text-[13px] outline-none transition-colors"
                        style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                        onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                      />
                    </FormField>
                    <FormField label="Priority">
                      <select
                        value={fPriority}
                        onChange={e => setFPriority(e.target.value as Priority)}
                        className="w-full rounded-[7px] border px-3 py-2.25 text-[13px] outline-none transition-colors"
                        style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                      >
                        <option value="low">Low</option>
                        <option value="mid">Mid</option>
                        <option value="high">High</option>
                      </select>
                    </FormField>
                  </div>
                )}

                <FormField label="Notes (optional)">
                  <textarea
                    value={fNotes}
                    onChange={e => setFNotes(e.target.value)}
                    placeholder="Any context..."
                    rows={3}
                    className="w-full rounded-[7px] border px-3 py-2.25 text-[13px] outline-none resize-none leading-relaxed transition-colors"
                    style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </FormField>

                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <button
                    onClick={() => { setCreateOpen(false); setCreateType(null); setEditingEvent(null); }}
                    className="px-4 py-2 text-[12px] rounded-[7px] border transition-colors"
                    style={{ color: "var(--text-mid)", borderColor: "var(--border)", fontFamily: "var(--font-mono)", background: "none" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEvent}
                    className="px-5 py-2 text-[12px] font-medium rounded-[7px] transition-opacity hover:opacity-80"
                    style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-mono)", border: "none" }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] max-h-[90vh] overflow-y-auto rounded-[12px] border"
        style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.07em] uppercase mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
