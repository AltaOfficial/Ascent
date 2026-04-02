"use client";

import { useState, useEffect, useRef } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { capitalize } from "@/lib/utils";
import { CalendarModal, FormField } from "@/components/dashboard/CalendarModal";
import { CalendarMonthGrid } from "@/components/dashboard/CalendarMonthGrid";
import { CalendarWeekView } from "@/components/dashboard/CalendarWeekView";
import { CalendarDayList } from "@/components/dashboard/CalendarDayList";
import {
  CalEvent, EventType, Priority, SelectedDay,
  TYPE_COLOR, buildDateKey,
} from "@/components/dashboard/calendarTypes";
import { apiFetch } from "@/lib/api";

// ── Constants ──────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDayLong(year: number, month: number, day: number): string {
  return new Date(year, month, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modals
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);
  const [createEventType, setCreateEventType] = useState<EventType | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formProject, setFormProject] = useState("");
  const [formPriority, setFormPriority] = useState<Priority>("mid");

  const addButtonRef = useRef<HTMLDivElement>(null);

  // ── Load events ───────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch<CalEvent[]>("/calendar-events")
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addButtonRef.current && !addButtonRef.current.contains(event.target as Node)) {
        setAddDropdownOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  function getEventsForDate(dateKey: string): CalEvent[] {
    return events
      .filter((event) => event.date === dateKey)
      .sort((eventA, eventB) => {
        if (!eventA.time && !eventB.time) return 0;
        if (!eventA.time) return 1;
        if (!eventB.time) return -1;
        return eventA.time.localeCompare(eventB.time);
      });
  }

  // ── Navigation ────────────────────────────────────────────────────────
  function navigatePrev() {
    const updated = new Date(currentDate);
    if (view === "month") updated.setMonth(updated.getMonth() - 1);
    else updated.setDate(updated.getDate() - 7);
    setCurrentDate(updated);
  }

  function navigateNext() {
    const updated = new Date(currentDate);
    if (view === "month") updated.setMonth(updated.getMonth() + 1);
    else updated.setDate(updated.getDate() + 7);
    setCurrentDate(updated);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function getCalendarTitle(): string {
    if (view === "month") {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`;
  }

  // ── Create / Edit ─────────────────────────────────────────────────────
  function openCreateModal(type: EventType, existingEvent?: CalEvent) {
    setCreateEventType(type);
    setEditingEvent(existingEvent ?? null);
    setFormTitle(existingEvent?.title ?? "");
    setFormDate(existingEvent?.date ?? format(new Date(), "yyyy-MM-dd"));
    setFormTime(existingEvent?.time ?? "");
    setFormNotes(existingEvent?.notes ?? "");
    setFormProject(existingEvent?.project ?? "");
    setFormPriority(existingEvent?.priority ?? "mid");
    setCreateModalOpen(true);
    setAddDropdownOpen(false);
  }

  async function saveEvent() {
    if (!formTitle.trim() || !formDate) return;
    const payload = {
      type: createEventType!,
      title: formTitle.trim(),
      date: formDate,
      time: formTime,
      notes: formNotes,
      project: formProject,
      priority: formPriority,
    };
    if (editingEvent) {
      const updated = await apiFetch<CalEvent>(`/calendar-events/${editingEvent.id}/update`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? updated : e)));
    } else {
      const created = await apiFetch<CalEvent>("/calendar-events", {
        method: "POST",
        body: JSON.stringify({ ...payload, done: false }),
      });
      setEvents((prev) => [...prev, created]);
    }
    setCreateModalOpen(false);
    setEditingEvent(null);
  }

  async function toggleEventDone(eventId: string) {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    const updated = await apiFetch<CalEvent>(`/calendar-events/${eventId}/update`, {
      method: "POST",
      body: JSON.stringify({ done: !event.done }),
    });
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
  }

  async function deleteEvent(eventId: string) {
    await apiFetch(`/calendar-events/${eventId}/delete`, { method: "POST" });
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setSelectedDay(null);
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
    >
      <div className="px-6 md:px-10 py-7 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-9">
          <div className="flex items-center gap-5">
            <button
              onClick={navigatePrev}
              className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] border text-[16px] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
            >
              ‹
            </button>
            <h1
              className="text-[22px] font-semibold tracking-[-0.02em] min-w-[180px]"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {getCalendarTitle()}
            </h1>
            <button
              onClick={navigateNext}
              className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] border text-[16px] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
            >
              ›
            </button>
            <button
              onClick={goToToday}
              className="h-[30px] px-3 rounded-[6px] border text-[11px] tracking-[0.04em] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", fontFamily: "var(--font-mono)", background: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View toggle */}
            <div className="flex border rounded-[7px] overflow-hidden" style={{ borderColor: "var(--border)" }}>
              {(["month", "week"] as const).map((viewOption) => (
                <button
                  key={viewOption}
                  onClick={() => setView(viewOption)}
                  className="text-[11px] tracking-[0.05em] uppercase px-3.5 py-1.5 transition-colors"
                  style={{
                    background: view === viewOption ? "var(--surface-raised)" : "none",
                    color: view === viewOption ? "var(--text-primary)" : "var(--text-secondary)",
                    fontFamily: "var(--font-mono)",
                    border: "none",
                  }}
                >
                  {viewOption}
                </button>
              ))}
            </div>

            {/* Add button + dropdown */}
            <div ref={addButtonRef} style={{ position: "relative" }}>
              <button
                onClick={(clickEvent) => { clickEvent.stopPropagation(); setAddDropdownOpen((prev) => !prev); }}
                className="w-8 h-8 flex items-center justify-center rounded-[7px] border text-[20px] transition-colors"
                style={{ borderColor: "var(--border-mid)", color: "var(--text-primary)", background: "none" }}
              >
                +
              </button>
              {addDropdownOpen && (
                <div
                  className="absolute right-0 top-9 z-50 rounded-[9px] border py-1.5 w-[160px]"
                  style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
                >
                  {(["task", "exam", "event", "birthday"] as EventType[]).map((eventType) => (
                    <button
                      key={eventType}
                      onClick={() => openCreateModal(eventType)}
                      className="block w-full text-left px-3 py-2.25 text-[12px] tracking-[0.02em] rounded-md transition-colors"
                      style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", background: "none", border: "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-raised)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      New {capitalize(eventType)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mb-6 flex-wrap">
          {(Object.entries(TYPE_COLOR) as [EventType, (typeof TYPE_COLOR)[EventType]][]).map(([eventType, colors]) => (
            <div
              key={eventType}
              className="flex items-center gap-1.5 text-[11px] tracking-[0.03em]"
              style={{ color: "var(--text-secondary)" }}
            >
              <div className="w-2 h-2 rounded-xs" style={{ background: colors.text }} />
              {capitalize(eventType)}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Loading…
          </div>
        ) : (
          <>
            {/* Month view */}
            {view === "month" && (
              <CalendarMonthGrid
                currentDate={currentDate}
                getEventsForDate={getEventsForDate}
                onDayClick={setSelectedDay}
              />
            )}

            {/* Week view */}
            {view === "week" && (
              <CalendarWeekView
                currentDate={currentDate}
                getEventsForDate={getEventsForDate}
                onDayClick={setSelectedDay}
              />
            )}
          </>
        )}
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <CalendarModal onClose={() => setSelectedDay(null)}>
          <div
            className="flex items-center justify-between px-5.5 pt-5 pb-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <div
                className="text-[15px] font-semibold tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                {DAY_NAMES_FULL[new Date(selectedDay.year, selectedDay.month, selectedDay.day).getDay()]}
              </div>
              <div className="text-[11px] mt-0.5 tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
                {formatDayLong(selectedDay.year, selectedDay.month, selectedDay.day)}
              </div>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="w-7 h-7 flex items-center justify-center rounded-[5px] text-[18px] transition-colors"
              style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
            >
              ×
            </button>
          </div>
          <div className="px-5.5 py-4">
            <CalendarDayList
              selectedDay={selectedDay}
              getEventsForDate={getEventsForDate}
              onEdit={(type, event) => { openCreateModal(type, event); setSelectedDay(null); }}
              onToggleDone={toggleEventDone}
              onDelete={deleteEvent}
            />
          </div>
          <div className="px-5.5 pb-5 pt-1">
            <button
              onClick={() => {
                const dateKey = buildDateKey(selectedDay.year, selectedDay.month, selectedDay.day);
                setFormDate(dateKey);
                setSelectedDay(null);
                setCreateEventType(null);
                setCreateModalOpen(true);
              }}
              className="text-[11px] tracking-[0.04em] px-3 py-1.5 rounded-[6px] border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", background: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              + Add to this day
            </button>
          </div>
        </CalendarModal>
      )}

      {/* Create / edit modal */}
      {createModalOpen && (
        <CalendarModal
          onClose={() => {
            setCreateModalOpen(false);
            setCreateEventType(null);
            setEditingEvent(null);
          }}
        >
          <div
            className="flex items-center justify-between px-5.5 pt-5 pb-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <span
              className="text-[15px] font-semibold tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {editingEvent ? "Edit Item" : "Add to Calendar"}
            </span>
            <button
              onClick={() => { setCreateModalOpen(false); setCreateEventType(null); setEditingEvent(null); }}
              className="w-7 h-7 flex items-center justify-center rounded-[5px] text-[18px] transition-colors"
              style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
            >
              ×
            </button>
          </div>
          <div className="px-5.5 py-5">
            {!createEventType ? (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: "task" as EventType, icon: "☐", label: "Task", sub: "With due date" },
                  { type: "exam" as EventType, icon: "✎", label: "Exam", sub: "Academic test" },
                  { type: "event" as EventType, icon: "▶", label: "Event", sub: "Anything else" },
                  { type: "birthday" as EventType, icon: "★", label: "Birthday", sub: "Annual reminder" },
                ].map(({ type, icon, label, sub }) => (
                  <button
                    key={type}
                    onClick={() => {
                      setCreateEventType(type);
                      setFormDate(formDate || format(new Date(), "yyyy-MM-dd"));
                    }}
                    className="rounded-[8px] border p-3 text-left transition-colors"
                    style={{ background: "var(--surface-raised)", borderColor: "var(--border)", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-mid)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <span className="block text-[18px] mb-1">{icon}</span>
                    <span className="block text-[13px] tracking-[0.02em]" style={{ color: TYPE_COLOR[type].text }}>
                      {label}
                    </span>
                    <span className="block text-[10px] mt-0.5 tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
                      {sub}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {!editingEvent && (
                  <button
                    onClick={() => setCreateEventType(null)}
                    className="flex items-center gap-1 text-[11px] tracking-[0.03em] transition-colors -mt-1"
                    style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                  >
                    ← Back
                  </button>
                )}

                <FormField label="Title">
                  <input
                    autoFocus
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEvent()}
                    placeholder={createEventType === "birthday" ? "Name" : "Title"}
                    className="w-full rounded-[7px] border px-3 py-2.25 text-[13px] outline-none transition-colors"
                    style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-2.5">
                  <FormField label="Date">
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full rounded-[7px] border px-3 py-2.25 text-[13px] outline-none transition-colors"
                      style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    />
                  </FormField>
                  {createEventType !== "birthday" && (
                    <FormField label="Time (optional)">
                      <input
                        type="time"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full rounded-[7px] border px-3 py-2.25 text-[13px] outline-none transition-colors"
                        style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                      />
                    </FormField>
                  )}
                </div>

                {createEventType === "task" && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <FormField label="Project">
                      <input
                        value={formProject}
                        onChange={(e) => setFormProject(e.target.value)}
                        placeholder="e.g. Ascent"
                        className="w-full rounded-[7px] border px-3 py-2.25 text-[13px] outline-none transition-colors"
                        style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                      />
                    </FormField>
                    <FormField label="Priority">
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as Priority)}
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
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Any context..."
                    rows={3}
                    className="w-full rounded-[7px] border px-3 py-2.25 text-[13px] outline-none resize-none leading-relaxed transition-colors"
                    style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </FormField>

                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <button
                    onClick={() => { setCreateModalOpen(false); setCreateEventType(null); setEditingEvent(null); }}
                    className="px-4 py-2 text-[12px] rounded-[7px] border transition-colors"
                    style={{ color: "var(--text-mid)", borderColor: "var(--border)", fontFamily: "var(--font-mono)", background: "none" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
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
        </CalendarModal>
      )}
    </div>
  );
}
